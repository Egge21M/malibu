import { Database } from "bun:sqlite";
import {
	ConsoleLogger,
	initializeCoco,
	type Manager,
} from "@cashu/coco-core";
import { SqliteRepositories } from "@cashu/coco-sqlite-bun";
import {
	NPCPlugin,
	type NPCAccountRecord,
	type NPCAccountStore,
	type SinceStore,
} from "coco-cashu-plugin-npc";
import { npubEncode } from "nostr-tools/nip19";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { JWTAuthProvider, NPCClient } from "npubcash-sdk";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
	NpcPaymentRequestDto,
	NpcSetUsernameResultDto,
	NpcStateDto,
} from "../mainview/lib/wallet-rpc.ts";

const SEED_BYTES = 64;
const DEFAULT_NPC_ACCOUNT_ID = "wallet-main";
const DEFAULT_NPC_BASE_URL = "https://npubx.cash";
const NPC_KEY_DERIVATION_CONTEXT = "malibu:npc:nip98:v1";

export class CashuWalletService {
	private readonly dataDir: string;
	private managerPromise: Promise<Manager> | undefined;
	private database: Database | undefined;
	private npcPlugin: NPCPlugin | undefined;
	private npcSecretPromise: Promise<Uint8Array> | undefined;
	private npcClientPromise: Promise<NPCClient> | undefined;
	private npcMintPolicyPromise: Promise<NpcMintPolicy> | undefined;

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

	async getNpcState(): Promise<NpcStateDto> {
		const manager = await this.getManager();
		const account = manager.ext.npc.getAccount(DEFAULT_NPC_ACCOUNT_ID);
		const accountSummary = manager.ext.npc
			.listAccounts()
			.find((entry) => entry.id === DEFAULT_NPC_ACCOUNT_ID);
		const baseUrl = accountSummary?.baseUrl ?? getNpcBaseUrl();
		const publicKey = getPublicKey(await this.getNpcSecret());
		const fallbackLightningAddress = getNpcLightningAddress(null, publicKey, baseUrl);
		const mintPolicy = await this.reconcileNpcMintPolicy(manager);
		const currentPluginStatus = manager.ext.npc.getStatus();
		const currentAccountSummary = manager.ext.npc
			.listAccounts()
			.find((entry) => entry.id === DEFAULT_NPC_ACCOUNT_ID);

		if (!account) {
			return {
				enabled: false,
				accountId: DEFAULT_NPC_ACCOUNT_ID,
				baseUrl,
				publicKey,
				lightningAddress: fallbackLightningAddress,
				receiveMintUrl: mintPolicy.receiveMintUrl,
				serverMintUrl: mintPolicy.serverMintUrl,
				canSync: mintPolicy.canSync,
				mintStatus: mintPolicy.status,
				mintStatusDetail: mintPolicy.detail,
				blockedMintUrls: [],
				username: null,
				user: null,
				status: currentPluginStatus,
				account: currentAccountSummary ?? null,
				error: "NPC account is not registered.",
			};
		}

		if (!mintPolicy.canSync) {
			let username: string | null = null;
			let lightningAddress = fallbackLightningAddress;
			if (mintPolicy.status === "waiting-for-mint") {
				try {
					const user = await withoutConsoleLog(() => account.getInfo());
					username = getNpcUsername(user);
					lightningAddress = getNpcLightningAddress(username, publicKey, baseUrl);
				} catch {
					// Identity lookup is best-effort while payment import is disabled.
				}
			}

			return {
				enabled: true,
				accountId: DEFAULT_NPC_ACCOUNT_ID,
				baseUrl,
				publicKey,
				lightningAddress,
				receiveMintUrl: mintPolicy.receiveMintUrl,
				serverMintUrl: mintPolicy.serverMintUrl,
				canSync: false,
				mintStatus: mintPolicy.status,
				mintStatusDetail: mintPolicy.detail,
				blockedMintUrls: [],
				username,
				user: null,
				status: currentPluginStatus,
				account: account.getStatus(),
				error: mintPolicy.status === "blocked" ? (mintPolicy.detail ?? undefined) : undefined,
			};
		}

		try {
			const user = await withoutConsoleLog(() => account.getInfo());
			const username = getNpcUsername(user);
			return {
				enabled: true,
				accountId: DEFAULT_NPC_ACCOUNT_ID,
				baseUrl,
				publicKey,
				lightningAddress: getNpcLightningAddress(username, publicKey, baseUrl),
				receiveMintUrl: mintPolicy.receiveMintUrl,
				serverMintUrl: user.mintUrl,
				canSync: mintPolicy.canSync,
				mintStatus: mintPolicy.status,
				mintStatusDetail: mintPolicy.detail,
				blockedMintUrls: [],
				username,
				user: {
					pubkey: user.pubkey,
					name: user.name ?? null,
					mintUrl: user.mintUrl,
					lockQuote: user.lockQuote,
				},
				status: currentPluginStatus,
				account: account.getStatus(),
			};
		} catch (error) {
			return {
				enabled: true,
				accountId: DEFAULT_NPC_ACCOUNT_ID,
				baseUrl,
				publicKey,
				lightningAddress: fallbackLightningAddress,
				receiveMintUrl: mintPolicy.receiveMintUrl,
				serverMintUrl: mintPolicy.serverMintUrl,
				canSync: mintPolicy.canSync,
				mintStatus: mintPolicy.status,
				mintStatusDetail: mintPolicy.detail,
				blockedMintUrls: [],
				username: null,
				user: null,
				status: currentPluginStatus,
				account: account.getStatus(),
				error: getErrorMessage(error),
			};
		}
	}

	async syncNpcAccount(): Promise<NpcStateDto> {
		const manager = await this.getManager();
		const account = manager.ext.npc.getAccount(DEFAULT_NPC_ACCOUNT_ID);
		if (!account) {
			throw new Error("NPC account is not registered.");
		}
		await this.assertNpcCanSync(manager, account, getNpcBaseUrl());
		await account.sync();
		return this.getNpcState();
	}

	async setNpcUsername(
		username: string,
		attemptPayment: boolean,
	): Promise<NpcSetUsernameResultDto> {
		const manager = await this.getManager();
		const account = manager.ext.npc.getAccount(DEFAULT_NPC_ACCOUNT_ID);
		if (!account) {
			throw new Error("NPC account is not registered.");
		}

		const normalizedUsername = username.trim();
		if (!normalizedUsername) {
			throw new Error("Username is required.");
		}

		const result = await account.setUsername(normalizedUsername, attemptPayment);
		if (result.success) {
			return {
				success: true,
				state: await this.getNpcState(),
			};
		}

		return {
			success: false,
			paymentRequest: serializeNpcPaymentRequest(result.pr),
			state: await this.getNpcState(),
		};
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

		const logger = new ConsoleLogger("malibu-wallet", { level: "info" });
		this.npcPlugin = new NPCPlugin({
			defaultBaseUrl: getNpcBaseUrl(),
			accountStore: new SqliteNPCAccountStore(this.database),
			sinceStoreFactory: (accountId, baseUrl) =>
				new SqliteNPCSinceStore(this.database!, accountId, baseUrl),
			syncIntervalMs: 30_000,
			useWebsocket: true,
			logger,
		});

		const manager = await initializeCoco({
			repo: repositories,
			seedGetter: async () => getOrCreateSeed(this.dataDir),
			logger,
			plugins: [this.npcPlugin],
		});

		await manager.ext.npc.addAccount({
			id: DEFAULT_NPC_ACCOUNT_ID,
			baseUrl: getNpcBaseUrl(),
			signer: await this.getNpcSigner(),
			autoStart: false,
		});
		await this.reconcileNpcMintPolicy(manager);

		return manager;
	}

	private async getNpcSecret(): Promise<Uint8Array> {
		this.npcSecretPromise ??= deriveNpcSecret(getOrCreateSeed(this.dataDir));
		return this.npcSecretPromise;
	}

	private async getNpcSigner() {
		const secretKey = await this.getNpcSecret();
		return async (template: Parameters<typeof finalizeEvent>[0]) => {
			return finalizeEvent(template, secretKey);
		};
	}

	private async getNpcSettingsClient(): Promise<NPCClient> {
		this.npcClientPromise ??= this.createNpcSettingsClient();
		return this.npcClientPromise;
	}

	private async createNpcSettingsClient(): Promise<NPCClient> {
		const baseUrl = getNpcBaseUrl();
		return new NPCClient(
			baseUrl,
			new JWTAuthProvider(baseUrl, await this.getNpcSigner()),
		);
	}

	private async reconcileNpcMintPolicy(manager: Manager): Promise<NpcMintPolicy> {
		this.npcMintPolicyPromise ??= this.reconcileNpcMintPolicyOnce(manager)
			.finally(() => {
				this.npcMintPolicyPromise = undefined;
			});
		return this.npcMintPolicyPromise;
	}

	private async reconcileNpcMintPolicyOnce(manager: Manager): Promise<NpcMintPolicy> {
		const account = manager.ext.npc.getAccount(DEFAULT_NPC_ACCOUNT_ID);
		const receiveMintUrl = await getPreferredNpcReceiveMintUrl(manager);
		if (!account) {
			return {
				status: "blocked",
				receiveMintUrl,
				serverMintUrl: null,
				canSync: false,
				detail: "NPC account is not registered.",
			};
		}

		if (!receiveMintUrl) {
			await account.stop();
			return {
				status: "waiting-for-mint",
				receiveMintUrl: null,
				serverMintUrl: null,
				canSync: false,
				detail: "Add a trusted mint before NPC imports payments.",
			};
		}

		let user: NpcUserLike | null = null;
		try {
			user = await withoutConsoleLog(() => account.getInfo());
		} catch (error) {
			await account.stop();
			return {
				status: "blocked",
				receiveMintUrl,
				serverMintUrl: null,
				canSync: false,
				detail: getErrorMessage(error),
			};
		}

		if (!mintUrlsEqual(user.mintUrl, receiveMintUrl)) {
			await account.stop();
			try {
				const response = await (await this.getNpcSettingsClient())
					.settings.setMintUrl(receiveMintUrl);
				user = response.error === false
					? response.data.user
					: await withoutConsoleLog(() => account.getInfo());
			} catch (error) {
				return {
					status: "blocked",
					receiveMintUrl,
					serverMintUrl: user.mintUrl,
					canSync: false,
					detail: `NPC mint could not be updated: ${getErrorMessage(error)}`,
				};
			}
		}

		if (!mintUrlsEqual(user.mintUrl, receiveMintUrl)) {
			await account.stop();
			return {
				status: "blocked",
				receiveMintUrl,
				serverMintUrl: user.mintUrl,
				canSync: false,
				detail: "NPC server mint does not match the wallet receive mint.",
			};
		}

		await account.stop();
		return {
			status: "ready",
			receiveMintUrl,
			serverMintUrl: user.mintUrl,
			canSync: true,
			detail: null,
		};
	}

	private async assertNpcCanSync(
		manager: Manager,
		account: NonNullable<ReturnType<Manager["ext"]["npc"]["getAccount"]>>,
		baseUrl: string,
	): Promise<void> {
		const mintPolicy = await this.reconcileNpcMintPolicy(manager);
		if (!mintPolicy.canSync) {
			throw new Error(mintPolicy.detail ?? "NPC is not ready to sync.");
		}

		const blockedMintUrls = await this.getUntrustedNpcQuoteMintUrls(
			manager,
			account,
			baseUrl,
		);
		if (blockedMintUrls.length) {
			throw new Error(
				`NPC has paid quotes for untrusted mint${
					blockedMintUrls.length === 1 ? "" : "s"
				}: ${blockedMintUrls.join(", ")}. Trust ${
					blockedMintUrls.length === 1 ? "that mint" : "those mints"
				} before syncing NPC payments.`,
			);
		}
	}

	private async getUntrustedNpcQuoteMintUrls(
		manager: Manager,
		account: NonNullable<ReturnType<Manager["ext"]["npc"]["getAccount"]>>,
		baseUrl: string,
	): Promise<string[]> {
		const trustedMintUrls = new Set(
			(await manager.mint.getAllTrustedMints()).map((mint) =>
				normalizeMintUrlForCompare(mint.mintUrl),
			),
		);
		const since = this.getNpcSince(DEFAULT_NPC_ACCOUNT_ID, baseUrl);
		const quotes = await account.getQuotesSince(since);
		const blockedMintUrls = new Map<string, string>();

		for (const quote of quotes as NpcQuoteLike[]) {
			if (quote.paidAt <= since || typeof quote.mintUrl !== "string") {
				continue;
			}

			if (!trustedMintUrls.has(normalizeMintUrlForCompare(quote.mintUrl))) {
				blockedMintUrls.set(normalizeMintUrlForCompare(quote.mintUrl), quote.mintUrl);
			}
		}

		return Array.from(blockedMintUrls.values()).sort();
	}

	private getNpcSince(accountId: string, baseUrl: string): number {
		const row = this.database
			?.query<{ since: number }, [string, string]>(
				"SELECT since FROM npc_since WHERE account_id = ? AND base_url = ?",
			)
			.get(accountId, baseUrl);
		return row?.since ?? 0;
	}
}

class SqliteNPCAccountStore implements NPCAccountStore {
	constructor(private readonly database: Database) {
		this.database.exec(`
			CREATE TABLE IF NOT EXISTS npc_accounts (
				id TEXT PRIMARY KEY,
				base_url TEXT NOT NULL,
				sync_interval_ms INTEGER,
				use_websocket INTEGER NOT NULL,
				auto_start INTEGER NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`);
	}

	async list(): Promise<NPCAccountRecord[]> {
		const rows = this.database
			.query<NPCAccountRow, []>(`
				SELECT
					id,
					base_url AS baseUrl,
					sync_interval_ms AS syncIntervalMs,
					use_websocket AS useWebsocket,
					auto_start AS autoStart,
					created_at AS createdAt,
					updated_at AS updatedAt
				FROM npc_accounts
				ORDER BY created_at ASC
			`)
			.all();

		return rows.map((row) => ({
			id: row.id,
			baseUrl: row.baseUrl,
			syncIntervalMs: row.syncIntervalMs ?? undefined,
			useWebsocket: Boolean(row.useWebsocket),
			autoStart: Boolean(row.autoStart),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}));
	}

	async upsert(record: NPCAccountRecord): Promise<void> {
		this.database
			.query<NPCAccountRow, [
				string,
				string,
				number | null,
				number,
				number,
				number,
				number,
			]>(`
				INSERT INTO npc_accounts (
					id,
					base_url,
					sync_interval_ms,
					use_websocket,
					auto_start,
					created_at,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					base_url = excluded.base_url,
					sync_interval_ms = excluded.sync_interval_ms,
					use_websocket = excluded.use_websocket,
					auto_start = excluded.auto_start,
					updated_at = excluded.updated_at
			`)
			.run(
				record.id,
				record.baseUrl,
				record.syncIntervalMs ?? null,
				record.useWebsocket ? 1 : 0,
				record.autoStart ? 1 : 0,
				record.createdAt,
				record.updatedAt,
			);
	}

	async remove(accountId: string): Promise<void> {
		this.database
			.query<NPCAccountRow, [string]>("DELETE FROM npc_accounts WHERE id = ?")
			.run(accountId);
	}
}

class SqliteNPCSinceStore implements SinceStore {
	constructor(
		private readonly database: Database,
		private readonly accountId: string,
		private readonly baseUrl: string,
	) {
		this.database.exec(`
			CREATE TABLE IF NOT EXISTS npc_since (
				account_id TEXT NOT NULL,
				base_url TEXT NOT NULL,
				since INTEGER NOT NULL,
				PRIMARY KEY (account_id, base_url)
			)
		`);
	}

	async get(): Promise<number> {
		const row = this.database
			.query<{ since: number }, [string, string]>(
				"SELECT since FROM npc_since WHERE account_id = ? AND base_url = ?",
			)
			.get(this.accountId, this.baseUrl);

		return row?.since ?? 0;
	}

	async set(since: number): Promise<void> {
		this.database
			.query<{ since: number }, [string, string, number]>(`
				INSERT INTO npc_since (account_id, base_url, since)
				VALUES (?, ?, ?)
				ON CONFLICT(account_id, base_url) DO UPDATE SET
					since = excluded.since
			`)
			.run(this.accountId, this.baseUrl, since);
	}
}

type NPCAccountRow = {
	id: string;
	baseUrl: string;
	syncIntervalMs: number | null;
	useWebsocket: number;
	autoStart: number;
	createdAt: number;
	updatedAt: number;
};

type NpcMintPolicyStatus = "waiting-for-mint" | "ready" | "blocked";

type NpcMintPolicy = {
	status: NpcMintPolicyStatus;
	receiveMintUrl: string | null;
	serverMintUrl: string | null;
	canSync: boolean;
	detail: string | null;
};

type NpcUserLike = {
	pubkey: string;
	name?: string | null;
	mintUrl: string;
	lockQuote: boolean;
};

type NpcQuoteLike = {
	mintUrl?: string;
	paidAt: number;
};

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

function getNpcBaseUrl() {
	return Bun.env.MALIBU_NPC_BASE_URL?.trim() || DEFAULT_NPC_BASE_URL;
}

async function getPreferredNpcReceiveMintUrl(manager: Manager): Promise<string | null> {
	const trustedMints = await manager.mint.getAllTrustedMints();
	return trustedMints[0]?.mintUrl ?? null;
}

function mintUrlsEqual(a: string, b: string) {
	return normalizeMintUrlForCompare(a) === normalizeMintUrlForCompare(b);
}

function normalizeMintUrlForCompare(mintUrl: string) {
	try {
		const url = new URL(mintUrl);
		url.hash = "";
		url.pathname = url.pathname.replace(/\/+$/, "") || "/";
		return url.toString().replace(/\/$/, "");
	} catch {
		return mintUrl.trim().replace(/\/+$/, "");
	}
}

async function deriveNpcSecret(seed: Uint8Array): Promise<Uint8Array> {
	const context = new TextEncoder().encode(NPC_KEY_DERIVATION_CONTEXT);
	const bytes = new Uint8Array(context.byteLength + seed.byteLength);
	bytes.set(context, 0);
	bytes.set(seed, context.byteLength);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	const secret = new Uint8Array(digest);
	if (secret.every((byte) => byte === 0)) {
		throw new Error("Derived NPC signing key is invalid.");
	}
	return secret;
}

function getNpcUsername(user: { name?: string | null }) {
	const username = user.name?.trim();
	return username || null;
}

function getNpcLightningAddress(
	username: string | null,
	publicKey: string,
	baseUrl: string,
) {
	const localPart = username ?? npubEncode(publicKey);
	return `${localPart}@${getNpcHost(baseUrl)}`;
}

function getNpcHost(baseUrl: string) {
	try {
		return new URL(baseUrl).host;
	} catch {
		return baseUrl;
	}
}

function serializeNpcPaymentRequest(input: unknown): NpcPaymentRequestDto {
	const record = input as Record<string, unknown> & {
		toEncodedRequest?: () => string;
	};

	return {
		encoded: record.toEncodedRequest?.() ?? "",
		amount: serializeUnknownString(record.amount),
		unit: serializeUnknownString(record.unit),
		description: serializeUnknownString(record.description),
		mints: Array.isArray(record.mints)
			? record.mints.filter((mint): mint is string => typeof mint === "string")
			: undefined,
	};
}

function serializeUnknownString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return String(value);
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

async function withoutConsoleLog<T>(callback: () => Promise<T>): Promise<T> {
	const originalLog = console.log;
	console.log = () => {};
	try {
		return await callback();
	} finally {
		console.log = originalLog;
	}
}
