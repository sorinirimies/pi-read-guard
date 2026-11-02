#!/usr/bin/env nu
# Builds the throw-away project and pi config the pi-read-guard demos (VHS tapes) run on, so no
# real file, path or setting ever ends up in a recording.
#
#   nu examples/vhs/fixture.nu          create /tmp/pi-read-guard-demo (a tiny project with a
#                                       70-line src/inventory.ts and a 320-line src/orders.ts)
#   nu examples/vhs/fixture.nu env      print the environment the demos run with
#
# Run pi against it with:   eval "$(nu examples/vhs/fixture.nu env)"

const PORT = 8992

const INVENTORY = r#'// Inventory tracking for the demo shop.
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
'#

# 319 lines of plausible pricing code (src/orders.ts).
export def orders []: nothing -> string {
    const NAMES = [line subtotal tax discount shipping rounding coupon bundle loyalty refund]
    mut out = ["// Order pricing helpers for the demo shop." "export interface OrderLine { sku: string; qty: number; price: number }" ""]
    mut i = 0
    while ($out | length) < 318 {
        let n = $NAMES | get ($i mod ($NAMES | length))
        let factor = 1 + ($i mod 7) / 100 | into string --decimals 2
        $out = ($out | append [$"export function ($n)($i)\(lines: OrderLine[]\): number {" "  let sum = 0;" "  for (const l of lines) {" $"    sum += l.qty * l.price * ($factor);" "  }" "  return Math.round(sum * 100) / 100;" "}" ""])
        $i = $i + 1
    }
    ($out | first 319 | str join "\n") + "\n"
}

# The environment the demos run with, as `export K=V` lines for `eval`.
export def env_lines [demo: string]: nothing -> string {
    [$"export HOME=($demo)/home" $"export PI_CODING_AGENT_DIR=($demo)/agent" "export PI_OFFLINE=1" "export TZ=UTC"] | str join "\n"
}

# A local demo model served by examples/vhs/mock-llm.ts (also stops pi's "no models" banner, which would
# print real install paths).
export def models [port: int]: nothing -> record {
    {providers: {demo: {baseUrl: $"http://127.0.0.1:($port)/v1", api: openai-completions, apiKey: demo, models: [{id: demo-model, name: demo-model, contextWindow: 200000, maxTokens: 8192, cost: {input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75}}]}}}
}

# Resolve symlinks (/tmp is /private/tmp on macOS) so pi's footer can show `~/…` for the project.
def demo_dir [] { mkdir /tmp/pi-read-guard-demo; "/tmp/pi-read-guard-demo" | path expand }

def "main env" [] { print (env_lines (demo_dir)) }

def main [] {
    let demo = demo_dir
    rm -rf $demo
    let src = $demo | path join home projects my-app src
    let agent = $demo | path join agent
    mkdir $src $agent
    $INVENTORY | save --raw ($src | path join inventory.ts)
    orders | save --raw ($src | path join orders.ts)
    models $PORT | to json | save --raw ($agent | path join models.json)
    {defaultProvider: demo, defaultModel: demo-model, theme: dark, defaultThinkingLevel: off, lastChangelogVersion: "9.9.9", quietStartup: header} | to json | save --raw ($agent | path join settings.json)
    print $"fixture ready: ($demo)"
}
