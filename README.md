# pi-read-guard

Pi extension that prevents massive unbudgeted full-file reads, steering the agent to `offset`/`limit` or search tools.

Enforcement lives in a `tool_call` hook, so it adds **zero tokens to the system prompt**.

## Rules

- `read` on any file with more than `maxReadLines` (default 200) without `offset` or `limit` is **blocked**.
- Steers agent to use `read` with pagination or search first (`rg`, `codegraph_search`).

## Install

```bash
pi install npm:pi-read-guard
# or
pi install git:github.com/sorinirimies/pi-read-guard
```

## Commands

- `/read-guard` — status and block count
- `/read-guard off` / `on` — disable / enable for this session
- `/read-guard allow <path>` — allow one full read of `<path>` this session

## Config (optional)

`~/.pi/agent/read-guard.json`:

```json
{ "maxReadLines": 200, "ignore": ["*.md", "*.json"] }
```

MIT
