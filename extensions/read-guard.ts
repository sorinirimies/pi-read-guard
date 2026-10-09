/**
 * pi-read-guard — prevent full-file reads on large files to cut input tokens.
 *
 * Zero prompt tokens: enforcement happens in a `tool_call` hook.
 *
 * Rules:
 *   1. `read` on existing file > `maxReadLines` (default 200) without `limit` or `offset`
 *      is blocked.
 *   2. Recommends using `offset`/`limit` or `rg`/`codegraph_search` instead.
 *
 * Commands:
 *   /read-guard               status + block count
 *   /read-guard off | on      disable / enable for this session
 *   /read-guard allow <path>  allow one full-file read of <path> this session
 *
 * Config: <agent dir>/read-guard.json
 *   { "maxReadLines": 200, "ignore": ["*.md", "*.json"] }
 */

import { existsSync } from "node:fs";
import { open, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface Config {
	maxReadLines: number;
	ignore: string[];
}

const DEFAULTS: Config = { maxReadLines: 200, ignore: [] };

/** Where pi keeps its config: PI_CODING_AGENT_DIR, then $XDG_CONFIG_HOME/pi/agent, then ~/.pi/agent. */
export function resolveAgentDir(env: Record<string, string | undefined>, home: string): string {
	if (env.PI_CODING_AGENT_DIR) return env.PI_CODING_AGENT_DIR;
	if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, "pi", "agent");
	return join(home, ".pi", "agent");
}

const agentDir = () => resolveAgentDir(process.env, homedir());

async function loadConfig(): Promise<Config> {
	try {
		const p = JSON.parse(await readFile(join(agentDir(), "read-guard.json"), "utf8"));
		return {
			maxReadLines:
				Number.isFinite(p.maxReadLines) && p.maxReadLines > 0 ? p.maxReadLines : DEFAULTS.maxReadLines,
			ignore: Array.isArray(p.ignore) ? p.ignore.filter((x: unknown) => typeof x === "string") : [],
		};
	} catch {
		return { ...DEFAULTS };
	}
}

/** Minimal glob (`*` = anything except `/`) against the path or its basename. */
export function matchesIgnore(path: string, patterns: string[]): boolean {
	return patterns.some((pat) => {
		if (pat.length > 256) return false; // absurd pattern: ignore it rather than risk slow matching
		const body = pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*+/g, "*").replace(/\*/g, "[^/]*");
		const re = new RegExp(`^${body}$`);
		return re.test(path) || re.test(basename(path));
	});
}


// ---------------------------------------------------------------------------
// Path handling — mirrors pi's own tool path resolution (`resolveToCwd`), so the
// guard looks at the same file the tool will: `@file`, `~/file`, `file://…`,
// Unicode spaces and Windows shell paths are normalised exactly as pi does.
// ---------------------------------------------------------------------------

const UNICODE_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

function normalizeWindowsShellPath(filePath: string): string {
	if (!filePath.startsWith("/") || filePath.startsWith("//") || filePath.includes("\\")) return filePath;
	const m = filePath.match(/^\/(?:mnt\/|cygdrive\/)?([a-z])(?:\/(.*))?$/i);
	if (!m) return filePath;
	return `${m[1].toUpperCase()}:\\${m[2]?.replaceAll("/", "\\") ?? ""}`;
}

export function resolveToolPath(
	input: string,
	cwd: string,
	home: string = homedir(),
	platform: string = process.platform,
): string {
	let p = input.replace(UNICODE_SPACES, " ");
	if (p.startsWith("@")) p = p.slice(1);
	if (platform === "win32") p = normalizeWindowsShellPath(p);
	if (p === "~") p = home;
	else if (p.startsWith("~/") || (platform === "win32" && p.startsWith("~\\"))) p = join(home, p.slice(2));
	if (/^file:\/\//.test(p)) {
		try {
			p = fileURLToPath(p);
		} catch {
			/* malformed URL: leave as is; the tool will report it */
		}
	}
	return isAbsolute(p) ? resolve(p) : resolve(cwd, p);
}

/**
 * Count lines without loading the file: constant memory, and it stops as soon as `cap` is
 * exceeded. Counts like `wc -l`, plus an unterminated last line. `lines` is exact unless `capped`.
 */
export async function countLinesCapped(path: string, cap: number): Promise<{ lines: number; capped: boolean }> {
	const fh = await open(path, "r");
	try {
		const buf = Buffer.allocUnsafe(64 * 1024);
		let newlines = 0;
		let size = 0;
		let lastByte = 0;
		for (;;) {
			const { bytesRead } = await fh.read(buf, 0, buf.length, null);
			if (bytesRead === 0) break;
			size += bytesRead;
			for (let i = 0; i < bytesRead; i++) if (buf[i] === 10) newlines++;
			lastByte = buf[bytesRead - 1];
			if (newlines > cap) return { lines: cap, capped: true }; // at least `newlines` lines: past the cap
		}
		const lines = size === 0 ? 0 : newlines + (lastByte === 10 ? 0 : 1);
		return lines > cap ? { lines: cap, capped: true } : { lines, capped: false };
	} finally {
		await fh.close();
	}
}

/** Lines counted exactly up to this many beyond the limit; past that the message says "over N". */
const COUNT_HEADROOM = 10_000;

/**
 * The file pi's `read` tool will actually open: besides normal resolution it falls back
 * to macOS filename variants (narrow no-break space before AM/PM, NFD, curly quotes).
 */
export function resolveReadTarget(raw: string, cwd: string): string {
	const resolved = resolveToolPath(raw, cwd);
	if (existsSync(resolved)) return resolved;
	const curly = (v: string) => v.replace(/'/g, "\u2019");
	const nfd = resolved.normalize("NFD");
	const candidates = [resolved.replace(/ (AM|PM)\./gi, "\u202F$1."), nfd, curly(resolved), curly(nfd)];
	for (const c of candidates) if (c !== resolved && existsSync(c)) return c;
	return resolved;
}

export default function readGuard(pi: ExtensionAPI) {
	let config: Config = { ...DEFAULTS };
	let enabled = true;
	let blocked = 0;
	const allowed = new Set<string>();

	pi.on("session_start", async () => {
		config = await loadConfig();
		enabled = true;
		blocked = 0;
		allowed.clear();
	});

	/**
	 * pi BLOCKS the tool when a `tool_call` handler throws, so a bug here must never
	 * stop legitimate work: any unexpected error means "allow".
	 */
	const guard = async (event: any, ctx: any) => {
		if (!enabled || event.toolName !== "read") return undefined;

		const raw = event.input?.path;
		if (typeof raw !== "string" || raw === "") return undefined;
		const abs = resolveReadTarget(raw, ctx.cwd);

		if (allowed.has(abs) || matchesIgnore(raw, config.ignore)) return undefined;

		// If the caller provided offset or limit, they are already budgeting the read.
		if (typeof event.input?.limit === "number" || typeof event.input?.offset === "number") return undefined;

		if (!existsSync(abs)) return undefined;
		let count: { lines: number; capped: boolean };
		try {
			count = await countLinesCapped(abs, config.maxReadLines + COUNT_HEADROOM);
		} catch {
			return undefined;
		}
		if (count.lines <= config.maxReadLines) return undefined;

		blocked++;
		const size = count.capped ? `over ${count.lines} lines` : `${count.lines} lines`;
		if (ctx.hasUI) ctx.ui.notify(`read-guard: blocked full read of ${raw} (${size})`, "warning");
		return {
			block: true as const,
			reason:
				`"${raw}" has ${size} (exceeds maxReadLines=${config.maxReadLines}). ` +
				`Do not read large files entirely. Use \`read\` with offset and limit (e.g. limit=100), ` +
				`or use \`rg\` / \`codegraph_search\` to locate relevant sections first. ` +
				`To read the full file, ask the user to run /read-guard allow ${raw}.`,
		};
	};

	pi.on("tool_call", async (event, ctx) => {
		try {
			return await guard(event, ctx);
		} catch {
			return undefined;
		}
	});

	pi.registerCommand("read-guard", {
		description: "Status, on/off, or `allow <path>` for pi-read-guard",
		handler: async (args, ctx) => {
			const [cmd, ...rest] = (args ?? "").trim().split(/\s+/).filter(Boolean);
			if (cmd === "off") enabled = false;
			else if (cmd === "on") enabled = true;
			else if (cmd === "allow" && rest.length > 0) {
				const p = rest.join(" ");
				allowed.add(resolveReadTarget(p, ctx.cwd));
				ctx.ui.notify(`read-guard: full read of ${p} allowed this session`, "info");
				return;
			}
			ctx.ui.notify(
				`read-guard: ${enabled ? "on" : "off"} · maxReadLines=${config.maxReadLines} · blocked=${blocked}`,
				"info",
			);
		},
	});
}
