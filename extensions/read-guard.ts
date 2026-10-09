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
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

interface Config {
	maxReadLines: number;
	ignore: string[];
}

const DEFAULTS: Config = { maxReadLines: 200, ignore: [] };

function agentDir(): string {
	if (process.env.PI_CODING_AGENT_DIR) return process.env.PI_CODING_AGENT_DIR;
	if (process.env.XDG_CONFIG_HOME) return join(process.env.XDG_CONFIG_HOME, "pi", "agent");
	return join(homedir(), ".pi", "agent");
}

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

function matchesIgnore(path: string, patterns: string[]): boolean {
	return patterns.some((pat) => {
		const re = new RegExp(`^${pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`);
		return re.test(path) || re.test(basename(path));
	});
}

function countLines(text: string): number {
	return text === "" ? 0 : text.split("\n").length;
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

	pi.on("tool_call", async (event, ctx) => {
		if (!enabled || event.toolName !== "read") return undefined;

		const raw = event.input?.path;
		if (typeof raw !== "string" || raw === "") return undefined;
		const abs = isAbsolute(raw) ? raw : resolve(ctx.cwd, raw);

		if (allowed.has(abs) || matchesIgnore(raw, config.ignore)) return undefined;

		// If caller provided offset or limit, they are already budgeting reads
		const limit = event.input?.limit;
		const offset = event.input?.offset;
		if (typeof limit === "number" || typeof offset === "number") {
			return undefined;
		}

		if (existsSync(abs)) {
			let lines = 0;
			try {
				lines = countLines(await readFile(abs, "utf8"));
			} catch {
				return undefined;
			}

			if (lines > config.maxReadLines) {
				blocked++;
				if (ctx.hasUI) ctx.ui.notify(`read-guard: blocked full read of ${raw} (${lines} lines)`, "warning");
				return {
					block: true as const,
					reason:
						`"${raw}" has ${lines} lines (exceeds maxReadLines=${config.maxReadLines}). ` +
						`Do not read large files entirely. Use \`read\` with offset and limit (e.g. limit=100), ` +
						`or use \`rg\` / \`codegraph_search\` to locate relevant sections first. ` +
						`To read the full file, ask the user to run /read-guard allow ${raw}.`,
				};
			}
		}

		return undefined;
	});

	pi.registerCommand("read-guard", {
		description: "Status, on/off, or `allow <path>` for pi-read-guard",
		handler: async (args, ctx) => {
			const [cmd, ...rest] = (args ?? "").trim().split(/\s+/).filter(Boolean);
			if (cmd === "off") enabled = false;
			else if (cmd === "on") enabled = true;
			else if (cmd === "allow" && rest.length > 0) {
				const p = rest.join(" ");
				allowed.add(isAbsolute(p) ? p : resolve(ctx.cwd, p));
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
