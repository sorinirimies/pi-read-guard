import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import readGuard, { countLinesCapped, matchesIgnore, resolveToolPath, resolveReadTarget } from "../extensions/read-guard.ts";

const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");

describe("resolveToolPath", () => {
	// Expectations go through path.resolve / join so they hold on Windows too.
	const cwd = "/work/proj";
	const home = "/home/u";
	const norm = (s: string) => s.replace(/\\/g, "/");
	const r = (...p: string[]) => resolve(...p);

	it("resolves relative and absolute paths", () => {
		expect(resolveToolPath("a/b.ts", cwd, home, "linux")).toBe(r(cwd, "a/b.ts"));
		expect(resolveToolPath("/abs/x.ts", cwd, home, "linux")).toBe(r("/abs/x.ts"));
		expect(resolveToolPath("../up.ts", cwd, home, "linux")).toBe(r(cwd, "../up.ts"));
	});

	it("strips a leading @ (pi's file-mention syntax)", () => {
		expect(resolveToolPath("@src/a.ts", cwd, home, "linux")).toBe(r(cwd, "src/a.ts"));
		expect(resolveToolPath("@/abs/a.ts", cwd, home, "linux")).toBe(r("/abs/a.ts"));
	});

	it("expands ~ and ~/", () => {
		expect(resolveToolPath("~", cwd, home, "linux")).toBe(r(home));
		expect(resolveToolPath("~/notes/x.md", cwd, home, "linux")).toBe(r(join(home, "notes/x.md")));
		expect(resolveToolPath("@~/x", cwd, home, "linux")).toBe(r(join(home, "x")));
		expect(resolveToolPath("~user/x", cwd, home, "linux")).toBe(r(cwd, "~user/x")); // not expanded, like pi
	});

	it("turns file:// URLs into paths, and leaves malformed ones alone", () => {
		expect(resolveToolPath("file:///tmp/x.ts", cwd, home, "linux")).toBe(r(fileURLToPath("file:///tmp/x.ts")));
		expect(() => resolveToolPath("file://%zz", cwd, home, "linux")).not.toThrow();
	});

	it("normalises Unicode spaces to a plain space", () => {
		expect(resolveToolPath("a\u00A0b\u202Fc\u3000d.ts", cwd, home, "linux")).toBe(r(cwd, "a b c d.ts"));
	});

	it("handles Windows shell paths and ~\\ on win32 only", () => {
		expect(norm(resolveToolPath("/c/Users/me/x.ts", cwd, home, "win32"))).toContain("C:/Users/me/x.ts");
		expect(norm(resolveToolPath("/mnt/d/proj/x.ts", cwd, home, "win32"))).toContain("D:/proj/x.ts");
		expect(norm(resolveToolPath("/cygdrive/e/x", cwd, home, "win32"))).toContain("E:/x");
		expect(norm(resolveToolPath("/c", cwd, home, "win32"))).toContain("C:");
		expect(norm(resolveToolPath("//server/share/x", cwd, home, "win32"))).toMatch(/server\/share\/x/);
		expect(norm(resolveToolPath("/usr/bin\\x", cwd, home, "win32"))).toContain("/usr/bin/x"); // has a backslash: left alone
		expect(norm(resolveToolPath("/etc/hosts", cwd, home, "win32"))).toContain("/etc/hosts"); // not a drive path
		expect(norm(resolveToolPath("~\\x", cwd, home, "win32"))).toContain("home/u/x");
		expect(resolveToolPath("/c/Users/me/x.ts", cwd, home, "linux")).toBe(r("/c/Users/me/x.ts"));
	});
});

describe("contract: identical to pi's own path resolution", () => {
	const PI = join(import.meta.dir, "..", "node_modules", "@earendil-works", "pi-coding-agent", "dist", "core", "tools", "path-utils.js");

	it("pi's path-utils is where we expect it (if this fails, pi moved it: update the guard)", () => {
		expect(existsSync(PI)).toBe(true);
	});

	it("resolveToolPath === pi's resolveToCwd for a battery of inputs", async () => {
		const { resolveToCwd } = (await import(PI)) as { resolveToCwd: (p: string, cwd: string) => string };
		const cwd = mkdtempSync(join(tmpdir(), "pi-contract-"));
		const inputs = [
			"a.ts", "dir/a.ts", "./a.ts", "../a.ts", "/abs/a.ts", "@a.ts", "@dir/a.ts", "@/abs/a.ts", "~", "~/x", "@~/x",
			"~other/x", "a\u00A0b.ts", "a\u202Fb.ts", "@a\u3000b.ts", pathToFileURL("/tmp/x y.ts").href, "dir//a.ts", "dir/../a.ts", "",
		];
		for (const input of inputs) expect(resolveToolPath(input, cwd), JSON.stringify(input)).toBe(resolveToCwd(input, cwd));
		expect(homedir().length).toBeGreaterThan(0);
		rmSync(cwd, { recursive: true, force: true });
	});
});

describe("countLinesCapped", () => {
	let dir: string;
	beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "pi-count-"))));
	afterEach(() => rmSync(dir, { recursive: true, force: true }));
	const file = (content: string | Buffer) => {
		const p = join(dir, "f.txt");
		writeFileSync(p, content);
		return p;
	};

	it("counts like the old split('\\n') did", async () => {
		expect(await countLinesCapped(file(""), 100)).toEqual({ lines: 0, capped: false });
		expect(await countLinesCapped(file("a"), 100)).toEqual({ lines: 1, capped: false });
		expect(await countLinesCapped(file("a\n"), 100)).toEqual({ lines: 2, capped: false });
		expect(await countLinesCapped(file("a\nb\nc"), 100)).toEqual({ lines: 3, capped: false });
		expect(await countLinesCapped(file("a\r\nb\r\n"), 100)).toEqual({ lines: 3, capped: false });
	});

	it("is exact at the cap and flags anything beyond it", async () => {
		expect(await countLinesCapped(file(lines(10)), 10)).toEqual({ lines: 10, capped: false });
		expect(await countLinesCapped(file(lines(11)), 10)).toEqual({ lines: 10, capped: true });
	});

	it("counts across read-chunk boundaries and never loads the whole file", async () => {
		const big = file("x\n".repeat(200_000)); // ~400 KB, several 64 KB chunks
		expect(await countLinesCapped(big, 1_000_000)).toEqual({ lines: 200_001, capped: false });
		const t = performance.now();
		expect(await countLinesCapped(big, 100)).toEqual({ lines: 100, capped: true });
		expect(performance.now() - t).toBeLessThan(500);
	});

	it("handles binary data and a file with no newline at all", async () => {
		expect(await countLinesCapped(file(Buffer.from([0, 255, 10, 0, 254])), 10)).toEqual({ lines: 2, capped: false });
		expect(await countLinesCapped(file("x".repeat(500_000)), 10)).toEqual({ lines: 1, capped: false });
	});

	it("rejects for a missing file or a directory (callers fail open)", async () => {
		await expect(countLinesCapped(join(dir, "nope"), 10)).rejects.toBeDefined();
		await expect(countLinesCapped(dir, 10)).rejects.toBeDefined();
	});
});

describe("matchesIgnore hardening", () => {
	it("collapses repeated stars and cannot be made to backtrack", () => {
		const long = "a/".repeat(2000) + "x";
		const t = performance.now();
		expect(matchesIgnore(long, ["*a*a*a*a*a*a*a*a*a*b", "**********a**********b"])).toBe(false);
		expect(performance.now() - t).toBeLessThan(300);
		expect(matchesIgnore("src/a.lock", ["**.lock"])).toBe(true);
	});

	it("ignores absurdly long patterns instead of compiling them", () => {
		expect(matchesIgnore("x", ["x".repeat(300)])).toBe(false);
	});
});

describe("pi-read-guard against pi's path forms and failure modes", () => {
	let work: string;
	let agent: string;
	let handlers: Record<string, Function>;
	let command: any;
	let notes: string[];
	let prev: string | undefined;
	const ctx = (hasUI = true) => ({ cwd: work, hasUI, ui: { notify: (m: string) => notes.push(m) } });
	const call = (input: any, c: any = ctx()) => handlers.tool_call({ toolName: "read", input }, c);

	beforeEach(async () => {
		work = mkdtempSync(join(tmpdir(), "pi-guard-work-"));
		agent = mkdtempSync(join(tmpdir(), "pi-guard-agent-"));
		prev = process.env.PI_CODING_AGENT_DIR;
		process.env.PI_CODING_AGENT_DIR = agent;
		notes = [];
		handlers = {};
		readGuard({ on: (e: string, f: Function) => (handlers[e] = f), registerCommand: (_: string, c: any) => (command = c) } as any);
		await handlers.session_start();
		writeFileSync(join(work, "big.txt"), lines(300));
		writeFileSync(join(work, "my file.txt"), lines(300));
	});

	afterEach(() => {
		if (prev === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = prev;
		rmSync(work, { recursive: true, force: true });
		rmSync(agent, { recursive: true, force: true });
	});

	it("is NOT bypassed by @path, file:// URLs, ./path, dir/../path or Unicode spaces", async () => {
		for (const path of ["big.txt", "@big.txt", "./big.txt", "sub/../big.txt", pathToFileURL(join(work, "big.txt")).href, "my\u00A0file.txt", "@my\u202Ffile.txt"]) {
			expect((await call({ path }))?.block, path).toBe(true);
		}
	});

	it("/read-guard allow works for every spelling of the same file", async () => {
		await command.handler("allow @big.txt", ctx());
		for (const path of ["big.txt", "@big.txt", "./big.txt"]) expect(await call({ path }), path).toBeUndefined();
	});

	it("fails OPEN: a throwing or malformed event never blocks the tool (pi blocks on handler errors)", async () => {
		expect(await call(null)).toBeUndefined();
		expect(await call(undefined)).toBeUndefined();
		expect(await call({ path: 42 })).toBeUndefined();
		expect(await call({ path: ["big.txt"] })).toBeUndefined();
		expect(await call({ path: "file://%zz" })).toBeUndefined();
		const hostile: any = { hasUI: true, get cwd() { throw new Error("boom"); }, ui: {} };
		expect(await call({ path: "big.txt" }, hostile)).toBeUndefined();
		const noisy: any = { cwd: work, hasUI: true, ui: { notify: () => { throw new Error("ui down"); } } };
		expect(await call({ path: "big.txt" }, noisy)).toBeUndefined(); // even the notify failing must not block… or crash
	});

	it("handles a huge file in constant memory and says 'over N lines'", async () => {
		writeFileSync(join(agent, "read-guard.json"), JSON.stringify({ maxReadLines: 5 }));
		await handlers.session_start();
		writeFileSync(join(work, "huge.txt"), "x\n".repeat(50_000));
		const before = process.memoryUsage().rss;
		const r = await call({ path: "huge.txt" });
		expect(r.block).toBe(true);
		expect(r.reason).toContain("over 10005 lines");
		expect(process.memoryUsage().rss - before).toBeLessThan(50 * 1024 * 1024);
	});
});


describe("resolveReadTarget: the macOS filename variants pi's read tool also tries", () => {
	let dir: string;
	beforeEach(() => (dir = mkdtempSync(join(tmpdir(), "pi-variants-"))));
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it("returns the plain resolved path when it exists", () => {
		writeFileSync(join(dir, "a.txt"), "x");
		expect(resolveReadTarget("a.txt", dir)).toBe(join(dir, "a.txt"));
	});

	it("returns the plain resolved path when nothing matches (the tool will report it)", () => {
		expect(resolveReadTarget("missing.txt", dir)).toBe(join(dir, "missing.txt"));
	});

	it("finds the narrow-no-break-space AM/PM screenshot name", () => {
		const actual = join(dir, "Screenshot 10.30\u202FAM.png");
		writeFileSync(actual, "x");
		expect(resolveReadTarget("Screenshot 10.30 AM.png", dir)).toBe(actual);
	});

	it("finds the curly-quote variant", () => {
		const actual = join(dir, "Capture d\u2019ecran.png");
		writeFileSync(actual, "x");
		expect(resolveReadTarget("Capture d'ecran.png", dir)).toBe(actual);
	});

	it("finds the NFD variant and the combined NFD + curly-quote variant", () => {
		const nfd = "caf\u0065\u0301.txt";
		writeFileSync(join(dir, nfd), "x");
		expect(existsSync(resolveReadTarget("caf\u00e9.txt", dir))).toBe(true);
		const both = join(dir, "d\u2019\u0065\u0301cran.txt");
		writeFileSync(both, "x");
		expect(existsSync(resolveReadTarget("d'\u00e9cran.txt", dir))).toBe(true);
	});

	it("the guard blocks a big file reached through a variant spelling", async () => {
		const handlers: Record<string, Function> = {};
		process.env.PI_CODING_AGENT_DIR = dir;
		readGuard({ on: (e: string, f: Function) => (handlers[e] = f), registerCommand: () => {} } as any);
		await handlers.session_start();
		writeFileSync(join(dir, "Screenshot 9.05\u202FPM.txt"), lines(500));
		const r = await handlers.tool_call({ toolName: "read", input: { path: "Screenshot 9.05 PM.txt" } }, { cwd: dir, hasUI: false });
		expect(r?.block).toBe(true);
		delete process.env.PI_CODING_AGENT_DIR;
	});
});
