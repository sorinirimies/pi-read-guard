import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import readGuard, { isBinary } from "../extensions/read-guard.ts";

const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");

describe("binary files are never 'large text'", () => {
	let work: string;
	let handlers: Record<string, Function>;
	const read = (path: string) => handlers.tool_call({ toolName: "read", input: { path } }, { cwd: work, hasUI: false });

	beforeEach(async () => {
		work = mkdtempSync(join(tmpdir(), "pi-rg-bin-"));
		handlers = {};
		readGuard({ on: (e: string, f: Function) => (handlers[e] = f), registerCommand: () => {} } as any);
		await handlers.session_start();
	});
	afterEach(() => rmSync(work, { recursive: true, force: true }));

	// a PNG-like blob: NUL bytes and hundreds of 0x0A bytes, which is what made the guard call a screenshot "897 lines"
	const blob = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0x0d]), Buffer.from("\n".repeat(900))]);

	it("lets an image through even though its bytes contain hundreds of newlines", async () => {
		for (const name of ["shot.png", "SHOT.PNG", "a.jpg", "a.jpeg", "a.gif", "a.webp", "a.bmp", "a.ico", "a.tiff", "a.heic", "a.avif", "doc.pdf"]) {
			writeFileSync(join(work, name), blob());
			expect(await read(name), name).toBeUndefined();
		}
	});

	it("lets any file with a NUL byte near the start through, whatever its name", async () => {
		writeFileSync(join(work, "data.bin"), blob());
		writeFileSync(join(work, "noext"), blob());
		expect(await read("data.bin")).toBeUndefined();
		expect(await read("noext")).toBeUndefined();
	});

	it("still blocks a big text file", async () => {
		writeFileSync(join(work, "big.txt"), lines(500));
		expect((await read("big.txt"))?.block).toBe(true);
	});

	it("only sniffs the first 8 KB: a NUL after that does not hide a big text file", async () => {
		writeFileSync(join(work, "late.txt"), Buffer.concat([Buffer.from(lines(1200)), Buffer.from([0])]));
		expect((await read("late.txt"))?.block).toBe(true);
	});

	it("isBinary: images by extension, NUL by content, text is not binary, and missing files reject", async () => {
		writeFileSync(join(work, "x.png"), "not really a png");
		writeFileSync(join(work, "t.txt"), "hello\nworld\n");
		writeFileSync(join(work, "empty.dat"), "");
		expect(await isBinary(join(work, "x.png"))).toBe(true);
		expect(await isBinary(join(work, "t.txt"))).toBe(false);
		expect(await isBinary(join(work, "empty.dat"))).toBe(false);
		await expect(isBinary(join(work, "nope.txt"))).rejects.toBeDefined();
	});

	it("fails open on a directory", async () => {
		mkdirSync(join(work, "somedir"));
		expect(await read("somedir")).toBeUndefined();
	});
});
