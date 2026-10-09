/**
 * A tiny OpenAI-compatible chat endpoint for the demos (no network, no API key, no real model).
 * It is a script, not an AI: it answers by keyword and by what the previous tool call returned, so
 * a recording shows the REAL guard reacting to REAL tool calls in a real pi.
 *
 *   bun examples/vhs/mock-llm.ts [port]
 *
 * Scenarios (matched on the last user message):
 *   "rewrite"      write src/inventory.ts in full   > if blocked: a small `edit`   > done
 *   "rust"/"cargo" write Cargo.toml                  > if blocked: says it will scaffold
 *   "read"         read src/orders.ts (or ~/… / @…)  > if blocked: read with offset+limit > summary
 */
const port = Number(process.argv[2] ?? 8991);

type Msg = { role: string; content?: unknown; tool_calls?: { function: { name: string; arguments: string } }[] };

const USAGE = { prompt_tokens: 5_200, completion_tokens: 420, total_tokens: 5_620, prompt_tokens_details: { cached_tokens: 4_300 } };
const text = (m: Msg | undefined): string => {
	const c = m?.content;
	if (typeof c === "string") return c;
	if (Array.isArray(c)) return c.map((p: any) => (typeof p === "string" ? p : (p?.text ?? ""))).join(" ");
	return "";
};

type Reply = { kind: "text"; text: string } | { kind: "tool"; name: string; args: object };
const say = (t: string): Reply => ({ kind: "text", text: t });
const call = (name: string, args: object): Reply => ({ kind: "tool", name, args });

const NEW_INVENTORY = `// Inventory tracking for the demo shop.
export class Inventory {
  // ...rewritten in full: the whole file is sent again just to add a doc comment
}
`;
const CARGO = `[package]
name = "demo"
version = "0.1.0"
edition = "2021"
`;

function decide(messages: Msg[]): Reply {
	const last = messages[messages.length - 1];

	if (last?.role === "tool") {
		const prev = [...messages].reverse().find((m) => m.role === "assistant" && m.tool_calls?.length);
		const name = prev?.tool_calls?.[0]?.function.name;
		const out = text(last);
		if (name === "write" && /Do not rewrite whole files/.test(out)) {
			return call("edit", {
				path: "src/inventory.ts",
				edits: [{ oldText: "export class Inventory {", newText: "/** Stock levels per SKU, with reorder alerts. */\nexport class Inventory {" }],
			});
		}
		if (name === "write" && /No project here yet/.test(out)) {
			return say("Understood: the guard wants this scaffolded with `cargo init` rather than a hand-written Cargo.toml. I'll run that, then fill in the logic.");
		}
		if (name === "write") return say("Rewrote the file in full (the guard is off, so nothing stopped a whole-file write).");
		if (name === "edit") return say("Done. A targeted edit: 1 line added instead of rewriting the whole file.");
		if (name === "read" && /Do not read large files/.test(out)) {
			return call("read", { path: "src/orders.ts", offset: 1, limit: 60 });
		}
		if (name === "read") return say("Summary: order pricing helpers (line totals, tax, discounts, shipping). I read just 60 lines instead of the whole file.");
		return say("Done.");
	}

	const ask = text(last).toLowerCase();
	if (/rust|cargo/.test(ask)) return call("write", { path: "Cargo.toml", content: CARGO });
	if (/rewrite/.test(ask)) return call("write", { path: "src/inventory.ts", content: NEW_INVENTORY });
	if (/read/.test(ask)) {
		const path = ask.includes("~/") ? "~/projects/my-app/src/orders.ts" : ask.includes("@src") ? "@src/orders.ts" : "src/orders.ts";
		return call("read", { path });
	}
	return say("Sure. This is the demo model: it only follows the scripted scenarios.");
}

const chunk = (delta: object, finish: string | null = null, usage?: object) =>
	`data: ${JSON.stringify({ id: "demo", object: "chat.completion.chunk", created: 0, model: "demo-model", choices: [{ index: 0, delta, finish_reason: finish }], ...(usage ? { usage } : {}) })}\n\n`;

Bun.serve({
	port,
	hostname: "127.0.0.1",
	async fetch(req) {
		const url = new URL(req.url);
		if (req.method === "GET" && url.pathname.endsWith("/models")) return Response.json({ object: "list", data: [{ id: "demo-model", object: "model" }] });
		if (req.method !== "POST" || !url.pathname.endsWith("/chat/completions")) return new Response("not found", { status: 404 });
		const body = (await req.json().catch(() => ({}))) as { stream?: boolean; messages?: Msg[] };
		const reply = decide(body.messages ?? []);

		if (!body.stream) {
			const message = reply.kind === "text"
				? { role: "assistant", content: reply.text }
				: { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: reply.name, arguments: JSON.stringify(reply.args) } }] };
			return Response.json({ id: "demo", object: "chat.completion", created: 0, model: "demo-model", usage: USAGE, choices: [{ index: 0, message, finish_reason: reply.kind === "text" ? "stop" : "tool_calls" }] });
		}

		const enc = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				const send = (s: string) => controller.enqueue(enc.encode(s));
				send(chunk({ role: "assistant", content: "" }));
				if (reply.kind === "text") {
					for (const word of reply.text.split(" ")) {
						send(chunk({ content: word + " " }));
						await new Promise((r) => setTimeout(r, 25));
					}
					send(chunk({}, "stop", USAGE));
				} else {
					send(chunk({ tool_calls: [{ index: 0, id: "call_" + Math.random().toString(36).slice(2, 8), type: "function", function: { name: reply.name, arguments: "" } }] }));
					send(chunk({ tool_calls: [{ index: 0, function: { arguments: JSON.stringify(reply.args) } }] }));
					send(chunk({}, "tool_calls", USAGE));
				}
				send("data: [DONE]\n\n");
				controller.close();
			},
		});
		return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
	},
});
console.error(`mock-llm listening on http://127.0.0.1:${port}`);
