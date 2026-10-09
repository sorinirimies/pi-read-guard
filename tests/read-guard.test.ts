import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import readGuard from "../extensions/read-guard.ts";

describe("pi-read-guard", () => {
	let testDir: string;
	let handlers: Record<string, Function> = {};
	let commands: Record<string, any> = {};
	let notified: string[] = [];

	const mockPi = {
		on: (event: string, handler: Function) => {
			handlers[event] = handler;
		},
		registerCommand: (name: string, def: any) => {
			commands[name] = def;
		},
	};

	const makeCtx = () => ({
		cwd: testDir,
		hasUI: true,
		ui: {
			notify: (msg: string) => notified.push(msg),
		},
	});

	beforeEach(async () => {
		testDir = mkdtempSync(join(tmpdir(), "pi-read-guard-test-"));
		handlers = {};
		commands = {};
		notified = [];
		readGuard(mockPi as any);
		if (handlers.session_start) {
			await handlers.session_start();
		}
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("allows reading small files without limit (<= 200 lines)", async () => {
		const filePath = join(testDir, "small.txt");
		writeFileSync(filePath, "line 1\nline 2\nline 3\n");

		const res = await handlers.tool_call(
			{ toolName: "read", input: { path: "small.txt" } },
			makeCtx(),
		);
		expect(res).toBeUndefined();
	});

	it("blocks full reading of large files (> 200 lines) without limit/offset", async () => {
		const filePath = join(testDir, "large.txt");
		const content = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`).join("\n");
		writeFileSync(filePath, content);

		const res = await handlers.tool_call(
			{ toolName: "read", input: { path: "large.txt" } },
			makeCtx(),
		);
		expect(res).toBeDefined();
		expect(res?.block).toBe(true);
		expect(res?.reason).toContain("exceeds maxReadLines");
		expect(notified.length).toBe(1);
	});

	it("allows reading large files if limit is specified", async () => {
		const filePath = join(testDir, "large.txt");
		const content = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`).join("\n");
		writeFileSync(filePath, content);

		const res = await handlers.tool_call(
			{ toolName: "read", input: { path: "large.txt", limit: 50, offset: 1 } },
			makeCtx(),
		);
		expect(res).toBeUndefined();
	});

	it("ignores non-read tools", async () => {
		const filePath = join(testDir, "large.txt");
		const content = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`).join("\n");
		writeFileSync(filePath, content);

		const res = await handlers.tool_call(
			{ toolName: "edit", input: { path: "large.txt" } },
			makeCtx(),
		);
		expect(res).toBeUndefined();
	});

	it("respects /read-guard allow <path>", async () => {
		const filePath = join(testDir, "large.txt");
		const content = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`).join("\n");
		writeFileSync(filePath, content);

		await commands["read-guard"].handler("allow large.txt", makeCtx());

		const res = await handlers.tool_call(
			{ toolName: "read", input: { path: "large.txt" } },
			makeCtx(),
		);
		expect(res).toBeUndefined();
	});

	it("respects /read-guard off and on", async () => {
		const filePath = join(testDir, "large.txt");
		const content = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`).join("\n");
		writeFileSync(filePath, content);

		await commands["read-guard"].handler("off", makeCtx());
		let res = await handlers.tool_call(
			{ toolName: "read", input: { path: "large.txt" } },
			makeCtx(),
		);
		expect(res).toBeUndefined();

		await commands["read-guard"].handler("on", makeCtx());
		res = await handlers.tool_call(
			{ toolName: "read", input: { path: "large.txt" } },
			makeCtx(),
		);
		expect(res).toBeDefined();
		expect(res?.block).toBe(true);
	});
});
