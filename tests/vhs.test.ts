import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const VHS = join(ROOT, "examples", "vhs");
// Windows checkouts may convert to CRLF: compare on LF only.
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const tapes = readdirSync(VHS).filter((f) => f.endsWith(".tape")).sort();
const gifRefsInReadme = [...read(join(ROOT, "README.md")).matchAll(/examples\/vhs\/generated\/([\w-]+\.gif)/g)].map((m) => m[1]);
const posix = process.platform !== "win32";
const PORT = 8992;
const CMD = "read-guard";

describe("VHS tapes", () => {
	it("there is a tape for every feature we show off", () => {
		for (const name of ["overview", "paths", "commands"]) expect(tapes, name).toContain(`${name}.tape`);
	});

	for (const tape of tapes) {
		const name = tape.replace(/\.tape$/, "");
		const text = read(join(VHS, tape));

		it(`${tape}: header, output path and the shared Set block match the house style`, () => {
			expect(text.split("\n")[0]).toBe(`# VHS tape: ${name}`);
			expect(text).toContain(`Output examples/vhs/generated/${name}.gif`);
			for (const setting of ['Set Shell "bash"', "Set FontSize 18", "Set Width 1200", "Set Height 720", "Set Padding 24", "Set PlaybackSpeed 1.0", 'Set Theme "Catppuccin Mocha"']) {
				expect(text, setting).toContain(setting);
			}
			// recordings only ever run on the synthetic fixture, with the real pi but only this extension
			expect(text).toContain("examples/vhs/fixture.sh");
			expect(text).toContain("examples/vhs/pi-demo.sh");
			expect(text).toContain(`mock-llm.ts ${PORT}`);
			expect(text).toContain("Wait+Screen@30s");
			expect(text).toContain("never touches your real files");
		});

		it(`${tape}: it only types commands this plugin has, with the right number of Enters`, () => {
			const lines = text.split("\n");
			lines.forEach((line, i) => {
				const m = line.match(/^Type "(\/[^"]*)"$/);
				if (!m || m[1] === "/new") return;
				const typed = m[1];
				expect(typed, `${typed} in ${tape}`).toMatch(new RegExp(`^/${CMD}( (on|off|allow \\S+))?$`));
				// a bare `/cmd` opens pi's command menu (Enter #1 accepts, Enter #2 runs); with arguments there is no menu
				let enters = 0;
				for (let j = i + 1; j < lines.length && !lines[j].startsWith("Type "); j++) if (lines[j] === "Enter") enters++;
				expect(enters, `"${typed}" in ${tape}`).toBe(typed === `/${CMD}` ? 2 : 1);
			});
		});

		it(`${tape}: every prompt waits for the scripted reply instead of sleeping blindly`, () => {
			const lines = text.split("\n");
			lines.forEach((line, i) => {
				const m = line.match(/^Type "([^/"][^"]*)"$/);
				if (!m || !/^(Rewrite|Create|Read)/.test(m[1])) return;
				const tail = lines.slice(i + 1, i + 12).join("\n");
				expect(tail, `"${m[1]}" in ${tape}`).toMatch(/Wait\+Screen@40s \/.+\//);
			});
		});
	}

	it("every tape quits pi and stops its mock model", () => {
		for (const tape of tapes) expect(read(join(VHS, tape)), tape).toMatch(/Ctrl\+D[\s\S]*pkill -f mock-llm/);
	});
});

describe("README previews and Git LFS", () => {
	it("every GIF the README shows is produced by a tape, and every tape's GIF is shown", () => {
		const produced = tapes.map((t) => t.replace(/\.tape$/, ".gif"));
		for (const gif of new Set(gifRefsInReadme)) expect(produced, `README shows ${gif}`).toContain(gif);
		for (const gif of produced) expect(gifRefsInReadme, `README should show ${gif}`).toContain(gif);
	});

	it("the GIFs exist (real files, or LFS pointers in a checkout without LFS)", () => {
		for (const gif of new Set(gifRefsInReadme)) {
			const p = join(VHS, "generated", gif);
			expect(existsSync(p), gif).toBe(true);
			expect(statSync(p).size, gif).toBeGreaterThan(50); // an LFS pointer is ~130 bytes
		}
	});

	it("GIFs and generated PNGs are tracked with Git LFS; scripts and tapes are pinned to LF", () => {
		const attrs = read(join(ROOT, ".gitattributes"));
		expect(attrs).toContain("*.gif filter=lfs diff=lfs merge=lfs -text");
		expect(attrs).toContain("examples/vhs/generated/*.png filter=lfs diff=lfs merge=lfs -text");
		expect(attrs).toContain("*.sh text eol=lf");
		expect(attrs).toContain("*.tape text eol=lf");
	});

	it("the demo assets never ship in the npm package", () => {
		const pkg = JSON.parse(read(join(ROOT, "package.json")));
		expect((pkg.files as string[]).every((f) => !f.startsWith("examples"))).toBe(true);
	});

	it("documents how to regenerate and how LFS is used", () => {
		const md = read(join(ROOT, "README.md"));
		for (const s of ["Git LFS", "git lfs install", "just vhs-all", "just vhs-tape", "just demo", "synthetic"]) expect(md, s).toContain(s);
	});
});

describe.skipIf(!posix)("synthetic fixture (examples/vhs/fixture.sh)", () => {
	const run = (...args: string[]) => Bun.spawnSync(["bash", join(VHS, "fixture.sh"), ...args], { cwd: ROOT });
	const env = () => Object.fromEntries(run("env").stdout.toString().split("\n").filter(Boolean).map((l) => l.replace(/^export /, "").split("=")));
	const app = () => join(env().HOME, "projects", "my-app");
	const lineCount = (p: string) => read(p).split("\n").length - 1;
	const digest = (dir: string) => {
		const h = createHash("sha256");
		const walk = (d: string) => readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : h.update(e.name).update(readFileSync(join(d, e.name)))));
		walk(dir);
		return h.digest("hex");
	};

	beforeAll(() => {
		expect(run().exitCode).toBe(0);
	});

	it("`env` points pi at the throw-away dirs, offline and in UTC", () => {
		const e = env();
		expect(e.HOME).toMatch(/\/home$/);
		expect(e.PI_CODING_AGENT_DIR).toMatch(/\/agent$/);
		expect(e.PI_OFFLINE).toBe("1");
		expect(e.TZ).toBe("UTC");
		expect(e.HOME).not.toBe(homedir());
	});

	it("builds a project whose files cross this guard's thresholds", () => {
		expect(lineCount(join(app(), "src", "inventory.ts"))).toBeGreaterThan(40); // edit-first: maxWriteLines
		expect(lineCount(join(app(), "src", "orders.ts"))).toBeGreaterThan(200); // read-guard: maxReadLines
		expect(existsSync(join(app(), "Cargo.toml"))).toBe(false); // so the scaffold rule applies
	});

	it("is deterministic", () => {
		const first = digest(join(env().HOME, ".."));
		expect(run().exitCode).toBe(0);
		expect(digest(join(env().HOME, ".."))).toBe(first);
	});

	it("configures a local mock model on this plugin's port, and leaks nothing about the real machine", () => {
		const agent = env().PI_CODING_AGENT_DIR;
		const models = JSON.parse(read(join(agent, "models.json")));
		expect(models.providers.demo.baseUrl).toBe(`http://127.0.0.1:${PORT}/v1`);
		expect(models.providers.demo.models[0].id).toBe("demo-model");
		expect(JSON.parse(read(join(agent, "settings.json")))).toMatchObject({ defaultProvider: "demo", defaultModel: "demo-model" });
		expect(read(join(VHS, "pi-demo.sh"))).toContain("--tools read,write,edit");

		const leaks: string[] = [];
		const secrets = [homedir(), userInfo().username].filter((s) => s.length > 3);
		const walk = (d: string) => {
			for (const e of readdirSync(d, { withFileTypes: true })) {
				const full = join(d, e.name);
				if (e.isDirectory()) walk(full);
				else if (secrets.some((s) => read(full).includes(s) || full.includes(s))) leaks.push(full);
			}
		};
		walk(join(agent, ".."));
		expect(leaks).toEqual([]);
	});

	it("pi-demo.sh and fixture.sh are valid bash", () => {
		for (const f of ["pi-demo.sh", "fixture.sh"]) expect(Bun.spawnSync(["bash", "-n", join(VHS, f)]).exitCode, f).toBe(0);
	});
});

describe("scripted mock model (examples/vhs/mock-llm.ts)", () => {
	const port = 19000 + Math.floor(Math.random() * 400);
	const base = `http://127.0.0.1:${port}`;
	let proc: ReturnType<typeof Bun.spawn>;

	const ask = async (messages: unknown[], stream = false) => {
		const res = await fetch(`${base}/v1/chat/completions`, { method: "POST", body: JSON.stringify({ model: "demo-model", stream, messages }) });
		return stream ? res : ((await res.json()) as any);
	};
	const user = (content: string) => ({ role: "user", content });
	const toolCalls = (name: string, args: object = {}) => ({ role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name, arguments: JSON.stringify(args) } }] });
	const toolResult = (content: unknown) => ({ role: "tool", tool_call_id: "c1", content });
	const call = (r: any) => ({ name: r.choices[0].message.tool_calls[0].function.name, args: JSON.parse(r.choices[0].message.tool_calls[0].function.arguments) });
	const said = (r: any) => r.choices[0].message.content as string;

	beforeAll(async () => {
		proc = Bun.spawn(["bun", join(VHS, "mock-llm.ts"), String(port)], { stdout: "ignore", stderr: "ignore" });
		for (let i = 0; i < 60; i++) {
			try {
				if ((await fetch(`${base}/v1/models`)).ok) return;
			} catch {}
			await new Promise((r) => setTimeout(r, 100));
		}
		throw new Error("mock-llm did not start");
	});
	afterAll(() => proc?.kill());

	it("lists the demo model and 404s everything else", async () => {
		const body = (await (await fetch(`${base}/v1/models`)).json()) as { data: { id: string }[] };
		expect(body.data.map((m) => m.id)).toEqual(["demo-model"]);
		expect((await fetch(`${base}/v1/nope`)).status).toBe(404);
		expect((await fetch(`${base}/v1/chat/completions`)).status).toBe(404);
	});

	it("rewrite: write the whole file, then (once blocked) a small edit, then a closing line", async () => {
		expect(call(await ask([user("Rewrite src/inventory.ts with a doc comment on the class")]))).toMatchObject({ name: "write", args: { path: "src/inventory.ts" } });
		const next = call(await ask([user("Rewrite src/inventory.ts"), toolCalls("write"), toolResult('"src/inventory.ts" exists (62 lines). Do not rewrite whole files: use the edit tool')]));
		expect(next.name).toBe("edit");
		expect(next.args.edits[0].oldText).toBe("export class Inventory {"); // matches the fixture, so pi's edit applies
		expect(said(await ask([user("x"), toolCalls("edit"), toolResult("Applied")]))).toContain("targeted edit");
	});

	it("rewrite with the guard off or allowed: the write goes through", async () => {
		expect(said(await ask([user("Rewrite it"), toolCalls("write"), toolResult("Wrote 4 lines")]))).toContain("in full");
	});

	it("scaffold: writes Cargo.toml, and a block is answered with the cargo init plan", async () => {
		expect(call(await ask([user("Create a new Rust project here")]))).toMatchObject({ name: "write", args: { path: "Cargo.toml" } });
		expect(said(await ask([user("cargo"), toolCalls("write"), toolResult("No project here yet. Do not hand-write Cargo.toml: run `cargo init`")]))).toContain("cargo init");
	});

	it("read: plain, ~/ and @ spellings; a block becomes a 60-line slice; then a summary", async () => {
		expect(call(await ask([user("Read src/orders.ts and summarise it")])).args.path).toBe("src/orders.ts");
		expect(call(await ask([user("Read ~/projects/my-app/src/orders.ts")])).args.path).toBe("~/projects/my-app/src/orders.ts");
		expect(call(await ask([user("Read @src/orders.ts")])).args.path).toBe("@src/orders.ts");
		const slice = call(await ask([user("Read src/orders.ts"), toolCalls("read"), toolResult("has 319 lines. Do not read large files entirely.")]));
		expect(slice).toMatchObject({ name: "read", args: { path: "src/orders.ts", offset: 1, limit: 60 } });
		expect(said(await ask([user("Read"), toolCalls("read"), toolResult("line 1…")]))).toContain("Summary");
	});

	it("tool results may arrive as content parts, not just a string", async () => {
		const next = call(await ask([user("Rewrite x"), toolCalls("write"), toolResult([{ type: "text", text: "Do not rewrite whole files" }])]));
		expect(next.name).toBe("edit");
	});

	it("anything else gets a polite scripted line, and an unknown tool result a plain Done", async () => {
		expect(said(await ask([user("hello")]))).toContain("scripted scenarios");
		expect(said(await ask([user("x"), toolCalls("grep"), toolResult("ok")]))).toBe("Done.");
		expect(said(await ask([]))).toContain("scripted scenarios");
	});

	it("streams a tool call as SSE: role, tool_calls, finish_reason tool_calls, usage, [DONE]", async () => {
		const res = (await ask([user("Read src/orders.ts")], true)) as Response;
		expect(res.headers.get("content-type")).toContain("text/event-stream");
		const text = await res.text();
		const events = text.split("\n\n").filter((e) => e.startsWith("data: ") && !e.includes("[DONE]")).map((e) => JSON.parse(e.slice(6)));
		expect(events[0].choices[0].delta.role).toBe("assistant");
		const calls = events.flatMap((e) => e.choices[0].delta.tool_calls ?? []);
		expect(calls[0].function.name).toBe("read");
		expect(JSON.parse(calls.map((c: any) => c.function.arguments).join("")).path).toBe("src/orders.ts");
		const last = events.at(-1);
		expect(last.choices[0].finish_reason).toBe("tool_calls");
		expect(last.usage.total_tokens).toBe(last.usage.prompt_tokens + last.usage.completion_tokens);
		expect(text.trimEnd().endsWith("data: [DONE]")).toBe(true);
	});

	it("streams a text reply word by word and ends with stop", async () => {
		const text = await ((await ask([user("hello")], true)) as Response).text();
		const events = text.split("\n\n").filter((e) => e.startsWith("data: ") && !e.includes("[DONE]")).map((e) => JSON.parse(e.slice(6)));
		expect(events.map((e) => e.choices[0].delta.content ?? "").join("")).toContain("scripted scenarios");
		expect(events.at(-1).choices[0].finish_reason).toBe("stop");
	});

	it("non-streaming replies carry usage and a finish reason; a malformed body is tolerated", async () => {
		const r = await ask([user("Read src/orders.ts")]);
		expect(r.choices[0].finish_reason).toBe("tool_calls");
		expect(r.usage.total_tokens).toBeGreaterThan(0);
		const t = await ask([user("hello")]);
		expect(t.choices[0].finish_reason).toBe("stop");
		const bad = await fetch(`${base}/v1/chat/completions`, { method: "POST", body: "{not json" });
		expect(bad.status).toBe(200);
	});
});
