import { Database } from "bun:sqlite";
import {
	ConsoleLogger,
	initializeCoco,
	type Manager,
} from "@cashu/coco-core";
import { SqliteRepositories } from "@cashu/coco-sqlite-bun";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SEED_BYTES = 64;

export class CashuWalletService {
	private readonly dataDir: string;
	private managerPromise: Promise<Manager> | undefined;
	private database: Database | undefined;

	constructor(dataDir = resolveWalletDataDir()) {
		this.dataDir = dataDir;
	}

	async dispose(): Promise<void> {
		const manager = await this.managerPromise?.catch(() => undefined);
		await manager?.dispose();
		this.database?.close();
		this.database = undefined;
		this.managerPromise = undefined;
	}

	async getCocoManager(): Promise<Manager> {
		return this.getManager();
	}

	getDataDir(): string {
		return this.dataDir;
	}

	private async getManager(): Promise<Manager> {
		this.managerPromise ??= this.initialize();
		return this.managerPromise;
	}

	private async initialize(): Promise<Manager> {
		mkdirSync(this.dataDir, { recursive: true });

		const databasePath = join(this.dataDir, "wallet.sqlite");
		this.database = new Database(databasePath, { create: true });
		this.database.exec("PRAGMA journal_mode = WAL");
		this.database.exec("PRAGMA foreign_keys = ON");

		const repositories = new SqliteRepositories({
			database: this.database,
		});
		await repositories.init();

		return initializeCoco({
			repo: repositories,
			seedGetter: async () => getOrCreateSeed(this.dataDir),
			logger: new ConsoleLogger("malibu-wallet", { level: "info" }),
		});
	}
}

function resolveWalletDataDir() {
	const override = Bun.env.MALIBU_WALLET_DIR?.trim();
	if (override) {
		return override;
	}

	const appDirectory = "cashu.malibu.electrobun.dev";
	const home = homedir();

	if (process.platform === "darwin") {
		return join(home, "Library", "Application Support", appDirectory, "wallet");
	}

	if (process.platform === "win32") {
		return join(
			process.env["APPDATA"] ?? join(home, "AppData", "Roaming"),
			appDirectory,
			"wallet",
		);
	}

	return join(
		process.env["XDG_DATA_HOME"] ?? join(home, ".local", "share"),
		appDirectory,
		"wallet",
	);
}

function getOrCreateSeed(dataDir: string): Uint8Array {
	const seedPath = join(dataDir, "seed.bin");
	if (!existsSync(seedPath)) {
		const seed = crypto.getRandomValues(new Uint8Array(SEED_BYTES));
		writeFileSync(seedPath, seed);
		try {
			chmodSync(seedPath, 0o600);
		} catch {
			// File permissions are best-effort across supported platforms.
		}
		return seed;
	}

	const seed = readFileSync(seedPath);
	if (seed.byteLength !== SEED_BYTES) {
		throw new Error(`Wallet seed must be ${SEED_BYTES} bytes.`);
	}

	return new Uint8Array(seed.buffer, seed.byteOffset, seed.byteLength);
}
