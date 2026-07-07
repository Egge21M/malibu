import { Database } from "bun:sqlite";
import {
	ConsoleLogger,
	getEncodedToken,
	initializeCoco,
	normalizeMintUrl,
	type BalanceSnapshot,
	type BalancesByMintAndUnit,
	type BalancesByUnit,
	type HistoryEntry,
	type Manager,
	type MeltOperation,
	type MeltQuote,
	type Mint,
	type MintOperation,
	type MintQuote,
	type ReceiveOperation,
	type SendOperation,
} from "@cashu/coco-core";
import { SqliteRepositories } from "@cashu/coco-sqlite-bun";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
	AddMintParams,
	CreateMintQuoteParams,
	ExecuteSendParams,
	MintBalanceDto,
	MintDto,
	OperationIdParams,
	PrepareMeltParams,
	PrepareReceiveParams,
	PrepareSendParams,
	WalletActionResult,
	WalletHistoryDto,
	WalletOperationDto,
	WalletOperationType,
	WalletQuoteDto,
	WalletSnapshot,
} from "../mainview/lib/wallet-rpc.ts";

const DEFAULT_UNIT = "sat";
const SEED_BYTES = 64;

type EncodableToken = Parameters<typeof getEncodedToken>[0];

export class CashuWalletService {
	private readonly dataDir: string;
	private managerPromise: Promise<Manager> | undefined;
	private database: Database | undefined;

	constructor(dataDir = resolveWalletDataDir()) {
		this.dataDir = dataDir;
	}

	async snapshot(): Promise<WalletSnapshot> {
		const manager = await this.getManager();
		const [
			mints,
			balancesByMintAndUnit,
			totalByUnit,
			pendingMintQuotes,
			pendingMeltQuotes,
			pendingMintOperations,
			preparedSendOperations,
			inFlightSendOperations,
			preparedReceiveOperations,
			inFlightReceiveOperations,
			preparedMeltOperations,
			inFlightMeltOperations,
			history,
		] = await Promise.all([
			manager.mint.getAllMints(),
			manager.wallet.balances.byMintAndUnit(),
			manager.wallet.balances.totalByUnit(),
			manager.quotes.mint.listPending(),
			manager.quotes.melt.listPending(),
			manager.ops.mint.listPending(),
			manager.ops.send.listPrepared(),
			manager.ops.send.listInFlight(),
			manager.ops.receive.listPrepared(),
			manager.ops.receive.listInFlight(),
			manager.ops.melt.listPrepared(),
			manager.ops.melt.listInFlight(),
			manager.history.getPaginatedHistory(0, 24),
		]);

		return {
			dataDir: this.dataDir,
			totalByUnit: serializeBalancesByUnit(totalByUnit),
			balances: serializeBalancesByMintAndUnit(balancesByMintAndUnit),
			mints: mints.map(serializeMint),
			pendingQuotes: [
				...pendingMintQuotes.map(serializeMintQuote),
				...pendingMeltQuotes.map(serializeMeltQuote),
			],
			operations: uniqueOperations([
				...pendingMintOperations.map((operation) =>
					serializeOperation("mint", operation),
				),
				...preparedSendOperations.map((operation) =>
					serializeOperation("send", operation),
				),
				...inFlightSendOperations.map((operation) =>
					serializeOperation("send", operation),
				),
				...preparedReceiveOperations.map((operation) =>
					serializeOperation("receive", operation),
				),
				...inFlightReceiveOperations.map((operation) =>
					serializeOperation("receive", operation),
				),
				...preparedMeltOperations.map((operation) =>
					serializeOperation("melt", operation),
				),
				...inFlightMeltOperations.map((operation) =>
					serializeOperation("melt", operation),
				),
			]),
			history: history.map(serializeHistory),
		};
	}

	async addMint(params: AddMintParams): Promise<WalletSnapshot> {
		const manager = await this.getManager();
		await manager.mint.addMint(toMintUrl(params.mintUrl), {
			trusted: params.trusted,
		});
		return this.snapshot();
	}

	async restoreMint(params: {
		mintUrl: string;
		units?: string[];
	}): Promise<WalletSnapshot> {
		const manager = await this.getManager();
		const mintUrl = toMintUrl(params.mintUrl);
		await manager.mint.addMint(mintUrl, { trusted: true });
		await manager.wallet.restore(mintUrl, {
			units: params.units?.map(normalizeUnit).filter(Boolean),
		});
		return this.snapshot();
	}

	async createMintQuote(
		params: CreateMintQuoteParams,
	): Promise<
		WalletActionResult<{
			quote: WalletQuoteDto;
			operation: WalletOperationDto;
		}>
	> {
		const manager = await this.getManager();
		const mintUrl = toMintUrl(params.mintUrl);
		const unit = normalizeUnit(params.unit);
		const amount = toPositiveAmount(params.amount);

		await manager.mint.addMint(mintUrl, { trusted: true });
		const quote = await manager.quotes.mint.create({
			mintUrl,
			method: "bolt11",
			amount: { amount, unit },
		});
		const operation = await manager.ops.mint.prepare({
			quote,
			amount,
		});

		return this.withSnapshot({
			quote: serializeMintQuote(quote),
			operation: serializeOperation("mint", operation),
		});
	}

	async refreshMintOperation(
		params: OperationIdParams,
	): Promise<WalletActionResult<WalletOperationDto>> {
		const manager = await this.getManager();
		const operation = await manager.ops.mint.refresh(params.operationId);

		return this.withSnapshot(serializeOperation("mint", operation));
	}

	async prepareSend(
		params: PrepareSendParams,
	): Promise<WalletActionResult<WalletOperationDto>> {
		const manager = await this.getManager();
		const operation = await manager.ops.send.prepare({
			mintUrl: toMintUrl(params.mintUrl),
			amount: {
				amount: toPositiveAmount(params.amount),
				unit: normalizeUnit(params.unit),
			},
		});

		return this.withSnapshot(serializeOperation("send", operation));
	}

	async executeSend(
		params: ExecuteSendParams,
	): Promise<
		WalletActionResult<{
			operation: WalletOperationDto;
			token: string;
		}>
	> {
		const manager = await this.getManager();
		const options =
			params.memo && params.memo.trim().length > 0
				? { memo: params.memo.trim() }
				: undefined;
		const { operation, token } = await manager.ops.send.execute(
			params.operationId,
			options,
		);
		const encodedToken = getEncodedToken(token);

		return this.withSnapshot({
			operation: serializeOperation("send", operation),
			token: encodedToken,
		});
	}

	async cancelSend(params: OperationIdParams): Promise<WalletSnapshot> {
		const manager = await this.getManager();
		await manager.ops.send.cancel(params.operationId);
		return this.snapshot();
	}

	async reclaimSend(params: OperationIdParams): Promise<WalletSnapshot> {
		const manager = await this.getManager();
		await manager.ops.send.reclaim(params.operationId);
		return this.snapshot();
	}

	async prepareReceive(
		params: PrepareReceiveParams,
	): Promise<WalletActionResult<WalletOperationDto>> {
		const manager = await this.getManager();
		const operation = await manager.ops.receive.prepare({
			token: params.token.trim(),
		});

		return this.withSnapshot(serializeOperation("receive", operation));
	}

	async executeReceive(
		params: OperationIdParams,
	): Promise<WalletActionResult<WalletOperationDto>> {
		const manager = await this.getManager();
		const operation = await manager.ops.receive.execute(params.operationId);

		return this.withSnapshot(serializeOperation("receive", operation));
	}

	async cancelReceive(params: OperationIdParams): Promise<WalletSnapshot> {
		const manager = await this.getManager();
		await manager.ops.receive.cancel(params.operationId);
		return this.snapshot();
	}

	async prepareMelt(
		params: PrepareMeltParams,
	): Promise<
		WalletActionResult<{
			quote: WalletQuoteDto;
			operation: WalletOperationDto;
		}>
	> {
		const manager = await this.getManager();
		const mintUrl = toMintUrl(params.mintUrl);
		const quote = await manager.quotes.melt.create({
			mintUrl,
			method: "bolt11",
			methodData: { invoice: params.invoice.trim() },
			unit: normalizeUnit(params.unit),
		});
		const operation = await manager.ops.melt.prepare({ quote });

		return this.withSnapshot({
			quote: serializeMeltQuote(quote),
			operation: serializeOperation("melt", operation),
		});
	}

	async executeMelt(
		params: OperationIdParams,
	): Promise<WalletActionResult<WalletOperationDto>> {
		const manager = await this.getManager();
		const operation = await manager.ops.melt.execute(params.operationId);

		return this.withSnapshot(serializeOperation("melt", operation));
	}

	async cancelMelt(params: OperationIdParams): Promise<WalletSnapshot> {
		const manager = await this.getManager();
		await manager.ops.melt.cancel(params.operationId);
		return this.snapshot();
	}

	async refreshMeltOperation(
		params: OperationIdParams,
	): Promise<WalletActionResult<WalletOperationDto>> {
		const manager = await this.getManager();
		const operation = await manager.ops.melt.refresh(params.operationId);

		return this.withSnapshot(serializeOperation("melt", operation));
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

	private async withSnapshot<TData>(
		data: TData,
	): Promise<WalletActionResult<TData>> {
		return {
			data,
			snapshot: await this.snapshot(),
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

function toMintUrl(input: string) {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new Error("Mint URL is required.");
	}

	return normalizeMintUrl(trimmed);
}

function normalizeUnit(input: string | undefined) {
	const unit = input?.trim().toLowerCase() || DEFAULT_UNIT;
	if (!/^[a-z0-9_-]+$/.test(unit)) {
		throw new Error("Unit must contain only letters, numbers, hyphens, or underscores.");
	}

	return unit;
}

function toPositiveAmount(input: string) {
	const amount = input.trim();
	if (!/^[1-9][0-9]*$/.test(amount)) {
		throw new Error("Amount must be a positive whole number.");
	}

	return amount;
}

function serializeAmount(input: unknown): string {
	if (input === null || input === undefined) {
		return "0";
	}

	if (typeof input === "string") {
		return input;
	}

	if (typeof input === "number" || typeof input === "bigint") {
		return input.toString();
	}

	if (typeof input === "object" && "toString" in input) {
		return String(input.toString());
	}

	return String(input);
}

function serializeOptionalAmount(input: unknown): string | undefined {
	if (input === null || input === undefined) {
		return undefined;
	}

	return serializeAmount(input);
}

function serializeBalance(balance: BalanceSnapshot): {
	spendable: string;
	reserved: string;
	total: string;
	unit: string;
} {
	return {
		spendable: serializeAmount(balance.spendable),
		reserved: serializeAmount(balance.reserved),
		total: serializeAmount(balance.total),
		unit: balance.unit,
	};
}

function serializeBalancesByUnit(balances: BalancesByUnit) {
	return Object.entries(balances).map(([, balance]) => serializeBalance(balance));
}

function serializeBalancesByMintAndUnit(
	balances: BalancesByMintAndUnit,
): MintBalanceDto[] {
	return Object.entries(balances).flatMap(([mintUrl, unitBalances]) =>
		Object.entries(unitBalances).map(([, balance]) => ({
			mintUrl,
			...serializeBalance(balance),
		})),
	);
}

function serializeMint(mint: Mint): MintDto {
	return {
		mintUrl: mint.mintUrl,
		name: mint.name || mint.mintUrl,
		trusted: mint.trusted,
		createdAt: mint.createdAt,
		updatedAt: mint.updatedAt,
	};
}

function serializeMintQuote(quote: MintQuote): WalletQuoteDto {
	const record = quote as unknown as Record<string, unknown>;

	return {
		quoteId: quote.quoteId,
		method: quote.method,
		mintUrl: quote.mintUrl,
		request: quote.request,
		unit: quote.unit,
		amount: serializeOptionalAmount(record["amount"]),
		state: typeof record["state"] === "string" ? record["state"] : undefined,
		expiry: quote.expiry,
		createdAt: quote.createdAt,
		updatedAt: quote.updatedAt,
	};
}

function serializeMeltQuote(quote: MeltQuote): WalletQuoteDto {
	const record = quote as unknown as Record<string, unknown>;

	return {
		quoteId: quote.quoteId,
		method: quote.method,
		mintUrl: quote.mintUrl,
		request: quote.request,
		unit: quote.unit,
		amount: serializeAmount(quote.amount),
		state: String(quote.state),
		expiry: quote.expiry,
		feeReserve: serializeOptionalAmount(record["fee_reserve"]),
		createdAt: quote.createdAt,
		updatedAt: quote.updatedAt,
	};
}

function serializeOperation(
	type: "mint",
	operation: MintOperation,
): WalletOperationDto;
function serializeOperation(
	type: "send",
	operation: SendOperation,
): WalletOperationDto;
function serializeOperation(
	type: "receive",
	operation: ReceiveOperation,
): WalletOperationDto;
function serializeOperation(
	type: "melt",
	operation: MeltOperation,
): WalletOperationDto;
function serializeOperation(
	type: WalletOperationType,
	operation: MintOperation | SendOperation | ReceiveOperation | MeltOperation,
): WalletOperationDto {
	const record = operation as unknown as Record<string, unknown>;
	const token =
		record["token"] === undefined
			? undefined
			: encodeToken(record["token"] as EncodableToken);

	return {
		id: operation.id,
		type,
		state: String(record["state"]),
		mintUrl: String(record["mintUrl"]),
		unit: String(record["unit"] ?? DEFAULT_UNIT),
		amount: serializeOptionalAmount(record["amount"]),
		fee:
			serializeOptionalAmount(record["fee"]) ??
			serializeOptionalAmount(record["fee_reserve"]) ??
			serializeOptionalAmount(record["swap_fee"]),
		inputAmount: serializeOptionalAmount(record["inputAmount"]),
		needsSwap:
			typeof record["needsSwap"] === "boolean"
				? record["needsSwap"]
				: undefined,
		quoteId:
			typeof record["quoteId"] === "string" ? record["quoteId"] : undefined,
		request:
			typeof record["request"] === "string" ? record["request"] : undefined,
		token,
		error: typeof record["error"] === "string" ? record["error"] : undefined,
		createdAt: Number(record["createdAt"]),
		updatedAt: Number(record["updatedAt"]),
	};
}

function serializeHistory(entry: HistoryEntry): WalletHistoryDto {
	const record = entry as Record<string, unknown>;

	return {
		id: entry.id,
		type: entry.type,
		source: entry.source,
		state: String(record["state"]),
		mintUrl: entry.mintUrl,
		unit: entry.unit,
		amount: serializeAmount(record["amount"]),
		operationId:
			typeof record["operationId"] === "string"
				? record["operationId"]
				: undefined,
		quoteId: typeof record["quoteId"] === "string" ? record["quoteId"] : undefined,
		error: typeof record["error"] === "string" ? record["error"] : undefined,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
	};
}

function uniqueOperations(operations: WalletOperationDto[]) {
	const byId = new Map<string, WalletOperationDto>();
	for (const operation of operations) {
		byId.set(`${operation.type}:${operation.id}`, operation);
	}

	return [...byId.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

function encodeToken(token: EncodableToken | undefined) {
	if (!token) {
		return undefined;
	}

	try {
		return getEncodedToken(token);
	} catch {
		return undefined;
	}
}
