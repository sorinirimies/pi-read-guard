// Randomised robustness tests ("fuzzing" without extra dependencies).
//
// The guard runs before every tool call, on paths and ignore patterns the agent or a
// hand-edited config file supply: it must survive any of them. The generator is seeded,
// so a failure prints a seed that reproduces it exactly:
//
//   FUZZ_SEED=12345 bun test tests/fuzz.test.ts --config=bunfig.fuzz.toml
//   FUZZ_ITERS=200000 bun test tests/fuzz.test.ts --config=bunfig.fuzz.toml   (the nightly workflow)
import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { countLinesCapped, matchesIgnore, resolveToolPath, isBinary, resolveReadTarget } from "../extensions/read-guard.ts";

const KEYS: string[] = [];
const ITERS = Number(process.env.FUZZ_ITERS ?? 400);
const SEED = Number(process.env.FUZZ_SEED ?? Math.floor(Math.random() * 2 ** 31));

/** mulberry32: small, fast, seedable. */
function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function gen(seed: number) {
	const r = rng(seed);
	const int = (n: number) => Math.floor(r() * n);
	const pick = <T>(xs: readonly T[]): T => xs[int(xs.length)];
	const NASTY = [0, -0, 1, -1, 0.5, NaN, Infinity, -Infinity, 1e308, -1e308, 2 ** 53, 2 ** 31, 1e-300, Number.MAX_SAFE_INTEGER];
	const number = () => (r() < 0.5 ? pick(NASTY) : (r() - 0.5) * 10 ** int(16));
	/** Printable ASCII, mostly; sometimes control characters and lone surrogates. */
	const string = (max = 24) => {
		const len = int(max);
		let s = "";
		for (let i = 0; i < len; i++) s += String.fromCharCode(r() < 0.8 ? 32 + int(95) : int(0xd800));
		return s;
	};
	const value = (depth = 0): unknown => {
		const k = int(depth > 2 ? 6 : 9);
		if (k === 0) return number();
		if (k === 1) return string();
		if (k === 2) return null;
		if (k === 3) return undefined;
		if (k === 4) return r() < 0.5;
		if (k === 5) return pick(["", "NaN", "0", "-5", "1e999", "true"]);
		if (k === 6) return Array.from({ length: int(4) }, () => value(depth + 1));
		const o: Record<string, unknown> = {};
		for (let i = 0; i < int(5); i++) o[KEYS.length && r() < 0.6 ? pick(KEYS) : string()] = value(depth + 1);
		return o;
	};
	return { r, int, pick, number, string, value };
}
type Gen = ReturnType<typeof gen>;

/** Run `fn` ITERS times; on failure say which iteration and how to reproduce it. */
function fuzz(name: string, fn: (g: Gen) => void | Promise<void>, iters = ITERS) {
	it(`${name} (seed ${SEED}, ${iters} runs)`, async () => {
		for (let i = 0; i < iters; i++) {
			try {
				await fn(gen(SEED + i));
			} catch (e) {
				throw new Error(`${name}: failed at FUZZ_SEED=${SEED + i} FUZZ_ITERS=1: ${(e as Error).message}`);
			}
		}
	});
}

const SEGMENTS = ["src", "a", "b.ts", ".env", "..", ".", "~", "@x", "dir name", "ü", "a\u00A0b", "C:", "c", "mnt", "cygdrive", "file:", "", "*", "?", "[x]", "(y)", "+", "$", "^", "{}", "|", "\\"];
const PREFIXES = ["", "/", "./", "../", "~/", "~", "@", "@/", "file://", "file:///", "file://host/", "/c/", "/mnt/d/", "/cygdrive/e/", "C:\\", "\\\\srv\\", "//"];
function path(g: Gen): string {
	if (g.r() < 0.1) return g.string(60);
	const parts = Array.from({ length: g.int(6) }, () => (g.r() < 0.8 ? g.pick(SEGMENTS) : g.string(8)));
	return g.pick(PREFIXES) + parts.join(g.pick(["/", "/", "\\", "//"]));
}
const GLOB = ["*", "**", "*.ts", "*.min.js", "dist/*", "?", "?x", "a?", "*?", "[", "]", "(", ")", "+", "{a,b}", "\\", ".", "$", "^", "|", "src/*/x"];
const pattern = (g: Gen) => Array.from({ length: 1 + g.int(4) }, () => (g.r() < 0.7 ? g.pick(GLOB) : g.string(6))).join("");
/** Text without wildcards: as a pattern it matches exactly itself. */
const plain = (s: string) => !/[*?]/.test(s);

describe("fuzz: ignore patterns", () => {
	// Found by fuzzing: `?` reached the RegExp unescaped, so "?.ts" threw "nothing to repeat"
	// on every tool call and "a?.ts" silently meant "optional a".
	it("`?` in a pattern is one character, not a broken regex", () => {
		expect(matchesIgnore("a.ts", ["?.ts"])).toBe(true);
		expect(matchesIgnore("ab.ts", ["?.ts"])).toBe(false);
		expect(matchesIgnore(".ts", ["a?.ts"])).toBe(false);
		expect(matchesIgnore("src/x", ["src?x"])).toBe(false);
	});

	fuzz("matchesIgnore never throws, whatever the patterns", (g) => {
		const pats = Array.from({ length: g.int(5) }, () => pattern(g));
		expect(typeof matchesIgnore(path(g), pats)).toBe("boolean");
	});

	fuzz("a pattern without wildcards matches exactly that path or basename", (g) => {
		const p = path(g).replaceAll("\\", "/");
		if (!plain(p)) return;
		expect(matchesIgnore(p, [p])).toBe(true);
		const base = p.split("/").pop() ?? "";
		if (base && plain(base)) expect(matchesIgnore(`${p.includes("/") ? "" : "x/"}${p}`, [base])).toBe(true);
	});

	fuzz("`*` matches every path; no patterns match nothing", (g) => {
		const p = path(g);
		expect(matchesIgnore(p, ["*"])).toBe(true);
		expect(matchesIgnore(p, [])).toBe(false);
	});

	fuzz("`?` matches exactly one character", (g) => {
		const name = g.string(10).replace(/[/\\*?]/g, "_");
		if (name.length === 0) return;
		const i = g.int(name.length);
		const glob = name.slice(0, i) + "?" + name.slice(i + 1);
		expect(matchesIgnore(name, [glob])).toBe(true);
		expect(matchesIgnore(name + "x", [glob])).toBe(false);
	});
});

describe("fuzz: path resolution", () => {
	fuzz("resolveToolPath always gives an absolute path, and resolving it again changes nothing", (g) => {
		const once = resolveToolPath(path(g), "/work/project", "/home/me");
		expect(isAbsolute(once)).toBe(true);
		expect(resolveToolPath(once, "/elsewhere", "/home/other")).toBe(once);
	});

	// Windows shell paths (`/c/x`) only mean a drive on Windows, so on other hosts just survive them.
	fuzz("resolveToolPath never throws for any platform's spelling", (g) => {
		expect(typeof resolveToolPath(path(g), "/work/project", "/home/me", g.pick(["linux", "darwin", "win32"]))).toBe("string");
	});
});

describe("fuzz: files", () => {
	const dir = mkdtempSync(join(tmpdir(), "pi-guard-fuzz-"));
	afterAll(() => rmSync(dir, { recursive: true, force: true }));
	const runs = Math.max(20, Math.floor(ITERS / 20));

	fuzz(
		"countLinesCapped agrees with a plain count (like `wc -l`, plus an unterminated last line)",
		async (g) => {
			const lines = Array.from({ length: g.int(g.r() < 0.1 ? 40_000 : 50) }, () => g.string(g.r() < 0.05 ? 3000 : 20).replace(/\n/g, ""));
			const text = lines.join(g.pick(["\n", "\r\n"])) + (g.r() < 0.5 ? "\n" : "");
			const file = join(dir, "f.txt");
			writeFileSync(file, text);
			const expected = text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
			const cap = g.int(g.r() < 0.5 ? 100 : 50_000);
			expect(await countLinesCapped(file, cap)).toEqual(expected > cap ? { lines: cap, capped: true } : { lines: expected, capped: false });
		},
		runs,
	);

	fuzz(
		"isBinary is true exactly when a NUL byte is in the first 8 KiB (or the extension is an image/PDF)",
		async (g) => {
			const size = g.int(g.r() < 0.3 ? 20_000 : 200);
			const bytes = Buffer.alloc(size, 0x61);
			for (let i = 0; i < size; i++) if (g.r() < 0.2) bytes[i] = 1 + g.int(255);
			const nulAt = g.r() < 0.5 && size > 0 ? g.int(size) : -1;
			if (nulAt >= 0) bytes[nulAt] = 0;
			const ext = g.pick([".txt", ".ts", "", ".PNG", ".pdf", ".json"]);
			const file = join(dir, `b${ext}`);
			writeFileSync(file, bytes);
			const imageOrPdf = [".png", ".pdf"].includes(ext.toLowerCase());
			expect(await isBinary(file)).toBe(imageOrPdf || (nulAt >= 0 && nulAt < 8192));
		},
		runs,
	);

	// UNC paths (\\host\share, file://host/) make Windows ask the network: seconds per lookup.
	fuzz(
		"resolveReadTarget never throws and gives an absolute path",
		(g) => {
			const p = path(g);
			if (/^(\\\\|\/\/)/.test(resolveToolPath(p, dir))) return;
			expect(isAbsolute(resolveReadTarget(p, dir))).toBe(true);
		},
		runs,
	);
});
