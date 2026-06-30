# Repository Guidelines

## Project Structure & Module Organization

Malibu is an Electrobun desktop Cashu wallet. Bun main-thread code lives in `src/bun/`: `index.ts` configures the window and RPC bridge, while `wallet-service.ts` owns Coco initialization, SQLite persistence, seed handling, and wallet operations. The React renderer lives in `src/mainview/`; `App.tsx` contains the wallet workspace, `lib/wallet-rpc.ts` defines the shared serializable RPC contract, and `lib/wallet-client.ts` wraps renderer-side Electrobun RPC. Reusable shadcn-style UI primitives are under `src/mainview/components/ui/`. Vite output goes to `dist/`, and Electrobun build output goes to `build/`.

## Build, Test, and Development Commands

- `bun install`: install dependencies. Note that Coco packages currently resolve from local `file:/home/egge/projects/coco-feat-melt-watcher/...` paths.
- `bun run dev`: run Electrobun in watch mode.
- `bun run dev:hmr`: run Vite HMR on port `5173` and start Electrobun.
- `bun run build`: run TypeScript checking and build the React renderer with Vite.
- `bun run typecheck`: run `tsc --noEmit`.
- `bun run build:canary`: build the app bundle after the standard build.

There is no test script configured yet.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings. Keep imports explicit and prefer the existing path alias `@/` for renderer modules. Follow the current formatting style: tabs in TypeScript/TSX files, semicolons in hand-written project code, and concise helper functions. React components use PascalCase, hooks/state setters use normal React conventions, and DTO/RPC types use clear suffixes such as `WalletSnapshot`, `WalletQuoteDto`, and `PrepareSendParams`.

Do not use Electron APIs; this project uses Electrobun APIs such as `electrobun/bun` and `electrobun/view`.

## Testing Guidelines

No test framework or coverage threshold is currently defined. For now, validate changes with `bun run typecheck` and `bun run build`. If adding tests, keep them near the behavior being tested with names like `wallet-service.test.ts` or `App.test.tsx`, and add a corresponding script to `package.json`.

## Commit & Pull Request Guidelines

The current history only contains `init`, so there is no established commit convention. Use short imperative commit messages, for example `Add wallet restore validation`. Pull requests should include a concise summary, verification steps run, linked issues when applicable, and screenshots or screen recordings for renderer UI changes.

## Security & Configuration Tips

Wallet data is stored in the platform app data directory by default. Use `MALIBU_WALLET_DIR=/tmp/malibu-dev-wallet bun run dev` for development runs that should not touch a normal wallet. Never commit generated wallet databases, seed files, `dist/`, `build/`, or `node_modules/`.
