# Malibu Cashu Wallet

Malibu is an Electrobun desktop Cashu wallet. Coco runs in the Bun main thread
with SQLite persistence, while the React webview is only the UI renderer and
talks to the wallet through typed Electrobun RPC.

## Development

```bash
bun install
bun run dev
```

For HMR:

```bash
bun run dev:hmr
```

## Build

```bash
bun run build
bun run build:canary
```

## Wallet Data

The wallet stores a local SQLite database and a 64-byte seed file in the app
data directory. For tests or development runs that should not touch the normal
wallet data, set `MALIBU_WALLET_DIR`.

```bash
MALIBU_WALLET_DIR=/tmp/malibu-dev-wallet bun run dev
```

## Structure

```text
src/bun/
  index.ts             Electrobun window and RPC setup
  wallet-service.ts    Coco manager, SQLite adapter, seed, wallet operations

src/mainview/
  App.tsx              React wallet workspace
  lib/wallet-client.ts Renderer RPC client
  lib/wallet-rpc.ts    Shared serializable RPC contract
  components/ui/       shadcn components
```
