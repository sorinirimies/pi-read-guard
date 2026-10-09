import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import readGuard, { resolveAgentDir } from "../extensions/read-guard.ts";

const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");

describe("pi-read-guard config + edge cases", () => {
	let work: string;
	let agent: string;
	let handlers: Record<string, Function>;
	let command: any;
	let notes: string[];
	const saved: Record<string, string | undefined> = {};

	const ctx = (hasUI = true) => ({
		cwd: work,
		hasUI,
		ui: { notify: (m: string) => notes.push(m) },
	});
	const read = (input: Record<string, unknown>, hasUI = true) =>
		handlers.tool_call({ toolName: "read", input }, ctx(hasUI));

	const boot = async () => {
		handlers = {};
		readGuard({ on: (e: string, f: Function) => (handlers[e] = f), registerCommand: (_: string, c: any) => (command = c) } as any);
		await handlers.session_start();
	};

	beforeEach(() => {
		for (const k of ["PI_CODING_AGENT_DIR", "XDG_CONFIG_HOME", "HOME"]) saved[k] = process.env[k];
		work = mkdtempSync(join(tmpdir(), "pi-rg-work-"));
		agent = mkdtempSync(join(tmpdir(), "pi-rg-agent-"));
		process.env.PI_CODING_AGENT_DIR = agent;
		notes = [];
	});

	afterEach(() => {
		for (const [k, v] of Object.entries(saved)) {
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
		rmSync(work, { recursive: true, force: true });
		rmSync(agent, { recursive: true, force: true });
	});

	it("reads maxReadLines from the config file", async () => {
		writeFileSync(join(agent, "read-guard.json"), JSON.stringify({ maxReadLines: 5 }));
		writeFileSync(join(work, "a.txt"), lines(6));
		writeFileSync(join(work, "b.txt"), lines(5));
		await boot();
		expect((await read({ path: "a.txt" }))?.block).toBe(true);
		expect(await read({ path: "b.txt" })).toBeUndefined();
	});

	it("falls back to the default (200) for invalid values or bad JSON", async () => {
		writeFileSync(join(work, "mid.txt"), lines(150));
		writeFileSync(join(work, "big.txt"), lines(201));
		for (const bad of [JSON.stringify({ maxReadLines: 0 }), JSON.stringify({ maxReadLines: "x" }), "{{nope"]) {
			writeFileSync(join(agent, "read-guard.json"), bad);
			await boot();
			expect(await read({ path: "mid.txt" })).toBeUndefined();
			expect((await read({ path: "big.txt" }))?.block).toBe(true);
		}
	});

	it("ignore patterns exempt files (glob on path or basename, non-strings dropped)", async () => {
		writeFileSync(join(agent, "read-guard.json"), JSON.stringify({ ignore: ["*.md", "data/*.json", 7] }));
		mkdirSync(join(work, "data"));
		for (const f of ["README.md", "data/x.json", "other.json"]) writeFileSync(join(work, f), lines(500));
		await boot();
		expect(await read({ path: "README.md" })).toBeUndefined();
		expect(await read({ path: "data/x.json" })).toBeUndefined();
		expect((await read({ path: "other.json" }))?.block).toBe(true);
	});

	it("escapes regex metacharacters in ignore patterns", async () => {
		writeFileSync(join(agent, "read-guard.json"), JSON.stringify({ ignore: ["a.b"] }));
		writeFileSync(join(work, "a.b"), lines(500));
		writeFileSync(join(work, "aXb"), lines(500));
		await boot();
		expect(await read({ path: "a.b" })).toBeUndefined();
		expect((await read({ path: "aXb" }))?.block).toBe(true);
	});

	it("either offset or limit alone counts as budgeted", async () => {
		writeFileSync(join(work, "big.txt"), lines(500));
		await boot();
		expect(await read({ path: "big.txt", offset: 100 })).toBeUndefined();
		expect(await read({ path: "big.txt", limit: 50 })).toBeUndefined();
		expect((await read({ path: "big.txt", limit: "50" }))?.block).toBe(true); // wrong type is not a budget
	});

	it("exactly maxReadLines is allowed; one more is not", async () => {
		writeFileSync(join(work, "edge.txt"), lines(200));
		writeFileSync(join(work, "over.txt"), lines(201));
		await boot();
		expect(await read({ path: "edge.txt" })).toBeUndefined();
		expect((await read({ path: "over.txt" }))?.block).toBe(true);
	});

	it("allows missing files (the read tool reports the error itself) and unreadable targets", async () => {
		mkdirSync(join(work, "somedir"));
		await boot();
		expect(await read({ path: "nope.txt" })).toBeUndefined();
		expect(await read({ path: "somedir" })).toBeUndefined();
	});

	it("handles absolute paths and ignores calls with a missing or empty path", async () => {
		writeFileSync(join(work, "big.txt"), lines(500));
		await boot();
		expect((await read({ path: join(work, "big.txt") }))?.block).toBe(true);
		expect(await read({})).toBeUndefined();
		expect(await read({ path: "" })).toBeUndefined();
		expect(await handlers.tool_call({ toolName: "read" }, ctx())).toBeUndefined();
	});

	it("the block reason names the file, its size, the limit and the escape hatch", async () => {
		writeFileSync(join(work, "big.txt"), lines(300));
		await boot();
		const r = await read({ path: "big.txt" });
		expect(r.reason).toContain('"big.txt" has 300 lines');
		expect(r.reason).toContain("maxReadLines=200");
		expect(r.reason).toContain("/read-guard allow big.txt");
	});

	it("does not notify when there is no UI, but still blocks", async () => {
		writeFileSync(join(work, "big.txt"), lines(500));
		await boot();
		expect((await read({ path: "big.txt" }, false)).block).toBe(true);
		expect(notes).toEqual([]);
	});

	it("resolves the agent dir from XDG_CONFIG_HOME when PI_CODING_AGENT_DIR is unset", async () => {
		delete process.env.PI_CODING_AGENT_DIR;
		const xdg = mkdtempSync(join(tmpdir(), "pi-xdg-"));
		mkdirSync(join(xdg, "pi", "agent"), { recursive: true });
		writeFileSync(join(xdg, "pi", "agent", "read-guard.json"), JSON.stringify({ maxReadLines: 2 }));
		writeFileSync(join(work, "a.txt"), lines(3));
		process.env.XDG_CONFIG_HOME = xdg;
		await boot();
		expect((await read({ path: "a.txt" }))?.block).toBe(true);
		rmSync(xdg, { recursive: true, force: true });
	});

	it("resolveAgentDir: PI_CODING_AGENT_DIR wins, then XDG, then ~/.pi/agent", () => {
		expect(resolveAgentDir({ PI_CODING_AGENT_DIR: "/a", XDG_CONFIG_HOME: "/x" }, "/home/u")).toBe("/a");
		expect(resolveAgentDir({ XDG_CONFIG_HOME: "/x" }, "/home/u")).toBe(join("/x", "pi", "agent"));
		expect(resolveAgentDir({}, "/home/u")).toBe(join("/home/u", ".pi", "agent"));
		expect(resolveAgentDir({ PI_CODING_AGENT_DIR: "", XDG_CONFIG_HOME: "" }, "/home/u")).toBe(join("/home/u", ".pi", "agent"));
	});

	it("/read-guard reports status and counts blocks", async () => {
		writeFileSync(join(work, "big.txt"), lines(500));
		await boot();
		await read({ path: "big.txt" });
		await command.handler("", ctx());
		expect(notes.at(-1)).toContain("on · maxReadLines=200 · blocked=1");
		await command.handler(undefined, ctx());
		expect(notes.at(-1)).toContain("blocked=1");
	});

	it("allow without a path shows status; allow works with absolute paths and spaces", async () => {
		writeFileSync(join(work, "my file.txt"), lines(500));
		await boot();
		await command.handler("allow", ctx());
		expect(notes.at(-1)).toContain("read-guard: on");
		await command.handler(`allow ${join(work, "my file.txt")}`, ctx());
		expect(await read({ path: "my file.txt" })).toBeUndefined();
	});

	it("session_start resets the counters, the allow list and the on/off switch", async () => {
		writeFileSync(join(work, "big.txt"), lines(500));
		await boot();
		await command.handler("allow big.txt", ctx());
		await command.handler("off", ctx());
		await handlers.session_start();
		expect((await read({ path: "big.txt" }))?.block).toBe(true);
	});
});
