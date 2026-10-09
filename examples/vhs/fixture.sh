#!/usr/bin/env bash
# Builds the throw-away project and pi config the pi-read-guard demos (VHS tapes) run on, so no
# real file, path or setting ever ends up in a recording.
#
#   examples/vhs/fixture.sh            create /tmp/pi-read-guard-demo (a tiny project with a
#                                      70-line src/inventory.ts and a 320-line src/orders.ts)
#   examples/vhs/fixture.sh env        print the environment the demos run with
#
# Run pi against it with:   eval "$(examples/vhs/fixture.sh env)"
set -euo pipefail

# Resolve symlinks (/tmp is /private/tmp on macOS) so pi's footer can show `~/…` for the project.
mkdir -p /tmp/pi-read-guard-demo
DEMO="$(cd /tmp/pi-read-guard-demo && pwd -P)"
PORT=8992

if [ "${1:-}" = "env" ]; then
    cat <<ENV
export HOME=$DEMO/home
export PI_CODING_AGENT_DIR=$DEMO/agent
export PI_OFFLINE=1
export TZ=UTC
ENV
    exit 0
fi

rm -rf "$DEMO"
mkdir -p "$DEMO/home/projects/my-app/src" "$DEMO/agent"

python3 - "$DEMO" "$PORT" <<'PY'
import json, os, sys
root, port = sys.argv[1], sys.argv[2]
app = os.path.join(root, "home", "projects", "my-app")

INVENTORY = '''// Inventory tracking for the demo shop.
export interface Item {
  sku: string;
  name: string;
  qty: number;
  reorderAt: number;
}

export class Inventory {
  private items = new Map<string, Item>();

  add(item: Item): void {
    const existing = this.items.get(item.sku);
    if (existing) {
      existing.qty += item.qty;
      return;
    }
    this.items.set(item.sku, { ...item });
  }

  remove(sku: string, qty: number): boolean {
    const item = this.items.get(sku);
    if (!item || item.qty < qty) return false;
    item.qty -= qty;
    return true;
  }

  get(sku: string): Item | undefined {
    return this.items.get(sku);
  }

  list(): Item[] {
    return [...this.items.values()].sort((a, b) => a.sku.localeCompare(b.sku));
  }

  lowStock(): Item[] {
    return this.list().filter((item) => item.qty <= item.reorderAt);
  }

  total(): number {
    let sum = 0;
    for (const item of this.items.values()) sum += item.qty;
    return sum;
  }

  has(sku: string): boolean {
    return this.items.has(sku);
  }

  clear(): void {
    this.items.clear();
  }

  restock(sku: string, qty: number): void {
    const item = this.items.get(sku);
    if (item) item.qty += qty;
  }

  names(): string[] {
    return this.list().map((item) => item.name);
  }
}
'''
open(os.path.join(app, "src", "inventory.ts"), "w").write(INVENTORY)

# 320 lines of plausible pricing code
out = ['// Order pricing helpers for the demo shop.', 'export interface OrderLine { sku: string; qty: number; price: number }', '']
names = ["line", "subtotal", "tax", "discount", "shipping", "rounding", "coupon", "bundle", "loyalty", "refund"]
i = 0
while len(out) < 318:
    n = names[i % len(names)]
    out += [
        f'export function {n}{i}(lines: OrderLine[]): number {{',
        '  let sum = 0;',
        '  for (const l of lines) {',
        f'    sum += l.qty * l.price * {1 + (i % 7) / 100:.2f};',
        '  }',
        '  return Math.round(sum * 100) / 100;',
        '}',
        '',
    ]
    i += 1
open(os.path.join(app, "src", "orders.ts"), "w").write("\n".join(out[:319]) + "\n")

agent = os.path.join(root, "agent")
# A local demo model served by examples/vhs/mock-llm.ts (also stops pi's "no models" banner, which would
# print real install paths).
with open(os.path.join(agent, "models.json"), "w") as f:
    json.dump({"providers": {"demo": {"baseUrl": f"http://127.0.0.1:{port}/v1", "api": "openai-completions",
               "apiKey": "demo", "models": [{"id": "demo-model", "name": "demo-model", "contextWindow": 200000,
               "maxTokens": 8192, "cost": {"input": 3, "output": 15, "cacheRead": 0.3, "cacheWrite": 3.75}}]}}}, f, indent=2)
with open(os.path.join(agent, "settings.json"), "w") as f:
    json.dump({"defaultProvider": "demo", "defaultModel": "demo-model", "theme": "dark",
               "defaultThinkingLevel": "off", "lastChangelogVersion": "9.9.9", "quietStartup": "header"}, f, indent=2)
PY
echo "fixture ready: $DEMO"
