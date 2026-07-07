import { describe, expect, it } from "bun:test";
import type { HistoryEntry } from "@cashu/coco-core";
import type {
	ManagerBalanceScopeDto,
	ManagerBalancesByMintAndUnitDto,
	ManagerBalancesByMintDto,
	ManagerBalancesByUnitDto,
	ManagerEventDto,
	ManagerHistoryEntryDto,
	ManagerMeltOperationDto,
	ManagerMeltQuoteDto,
	ManagerMintDto,
	ManagerMintWithKeysetsDto,
} from "@/lib/manager-rpc";
import { createRemoteCocoManager } from "@/lib/remote-coco-manager";

type RemoteMintManagerSurface = {
	mint: {
		getAllMints: () => Promise<ManagerMintDto[]>;
		addMint: (
			mintUrl: string,
			options?: { trusted?: boolean },
		) => Promise<ManagerMintWithKeysetsDto>;
		trustMint: (mintUrl: string) => Promise<void>;
		untrustMint: (mintUrl: string) => Promise<void>;
		isTrustedMint: (mintUrl: string) => Promise<boolean>;
	};
	wallet: {
		balances: {
			byMint: (scope?: ManagerBalanceScopeDto) => Promise<BalancesByMint>;
			byMintAndUnit: (
				scope?: ManagerBalanceScopeDto,
			) => Promise<BalancesByMintAndUnit>;
			byUnit: (scope?: ManagerBalanceScopeDto) => Promise<BalancesByUnit>;
			total: (scope?: ManagerBalanceScopeDto) => Promise<BalanceSnapshot>;
			totalByUnit: (
				scope?: ManagerBalanceScopeDto,
			) => Promise<BalancesByUnit>;
		};
	};
	history: {
		getPaginatedHistory: (
			offset?: number,
			limit?: number,
		) => Promise<HistoryEntry[]>;
	};
	quotes: {
		melt: {
			create: (input: {
				mintUrl: string;
				method: string;
				methodData: Record<string, unknown>;
				unit?: string;
			}) => Promise<MeltQuoteLike>;
			get: (input: QuoteIdentityLike) => Promise<MeltQuoteLike | null>;
			listPending: (input?: { method?: string }) => Promise<MeltQuoteLike[]>;
			refresh: (input: QuoteIdentityLike) => Promise<MeltQuoteLike>;
		};
	};
	ops: {
		melt: {
			recovery: {
				run: () => Promise<void>;
				inProgress: () => Promise<boolean>;
			};
			diagnostics: {
				isLocked: (operationId: string) => Promise<boolean>;
			};
			prepare: (input: {
				quote: MeltQuoteLike;
				feeIndex?: number;
			}) => Promise<MeltOperationLike>;
			execute: (operationOrId: MeltOperationLike | string) => Promise<MeltOperationLike>;
			get: (operationId: string) => Promise<MeltOperationLike | null>;
			getByQuote: (input: QuoteIdentityLike) => Promise<MeltOperationLike | null>;
			listByQuote: (input: QuoteIdentityLike) => Promise<MeltOperationLike[]>;
			listPrepared: () => Promise<MeltOperationLike[]>;
			listInFlight: () => Promise<MeltOperationLike[]>;
			refresh: (operationId: string) => Promise<MeltOperationLike>;
			cancel: (operationId: string, reason?: string) => Promise<void>;
			reclaim: (operationId: string, reason?: string) => Promise<void>;
			finalize: (operationId: string) => Promise<void>;
		};
	};
	on: {
		(
			event: "mint:added" | "mint:updated",
			handler: (payload: ManagerMintWithKeysetsDto) => void,
		): () => void;
		(
			event: "proofs:reserved",
			handler: (payload: ProofsReservedEvent) => void,
		): () => void;
		(
			event: "history:updated",
			handler: (payload: { mintUrl: string; entry: HistoryEntry }) => void,
		): () => void;
		(
			event:
				| "melt-op:prepared"
				| "melt-op:pending"
				| "melt-op:finalized"
				| "melt-op:rolled-back",
			handler: (payload: MeltOperationEvent) => void,
		): () => void;
		(
			event: "melt-quote:updated",
			handler: (payload: MeltQuoteEvent) => void,
		): () => void;
	};
	off: {
		(
			event: "mint:added" | "mint:updated",
			handler: (payload: ManagerMintWithKeysetsDto) => void,
		): void;
		(
			event: "proofs:reserved",
			handler: (payload: ProofsReservedEvent) => void,
		): void;
		(
			event: "history:updated",
			handler: (payload: { mintUrl: string; entry: HistoryEntry }) => void,
		): void;
		(
			event:
				| "melt-op:prepared"
				| "melt-op:pending"
				| "melt-op:finalized"
				| "melt-op:rolled-back",
			handler: (payload: MeltOperationEvent) => void,
		): void;
		(
			event: "melt-quote:updated",
			handler: (payload: MeltQuoteEvent) => void,
		): void;
	};
};

type BalanceSnapshot = {
	spendable: AmountLike;
	reserved: AmountLike;
	total: AmountLike;
	unit: string;
};

type BalancesByMint = Record<string, BalanceSnapshot>;
type BalancesByMintAndUnit = Record<string, Record<string, BalanceSnapshot>>;
type BalancesByUnit = Record<string, BalanceSnapshot>;

type AmountLike = {
	add: (other: string) => AmountLike;
	toString: () => string;
};

type ProofsReservedEvent = {
	mintUrl: string;
	operationId: string;
	secrets: string[];
	amount: {
		amount: AmountLike;
		unit: string;
	};
};

type QuoteIdentityLike = {
	mintUrl: string;
	quoteId: string;
};

type MeltQuoteLike = Omit<ManagerMeltQuoteDto, "amount" | "fee_reserve"> & {
	amount: AmountLike;
	fee_reserve?: AmountLike;
};

type MeltOperationLike = Omit<
	ManagerMeltOperationDto,
	| "amount"
	| "fee_reserve"
	| "swap_fee"
	| "inputAmount"
	| "changeAmount"
	| "effectiveFee"
> & {
	amount?: AmountLike;
	fee_reserve?: AmountLike;
	swap_fee?: AmountLike;
	inputAmount?: AmountLike;
	changeAmount?: AmountLike;
	effectiveFee?: AmountLike;
};

type MeltOperationEvent = {
	mintUrl: string;
	operationId: string;
	operation: MeltOperationLike;
};

type MeltQuoteEvent = {
	mintUrl: string;
	method: string;
	quoteId: string;
	quote: MeltQuoteLike;
};

function createFakeRpc() {
	const calls: unknown[] = [];
	let managerEventHandler: ((event: ManagerEventDto) => void) | undefined;

	return {
		calls,
		emit(event: ManagerEventDto) {
			managerEventHandler?.(event);
		},
		rpc: {
			request: {
				managerMintGetAllMints: async () => {
					calls.push(["managerMintGetAllMints"]);
					return [mint("https://mint.example")];
				},
				managerMintAddMint: async (params: unknown) => {
					calls.push(["managerMintAddMint", params]);
					return {
						mint: mint("https://mint.example"),
						keysets: [],
					};
				},
				managerMintTrustMint: async (params: unknown) => {
					calls.push(["managerMintTrustMint", params]);
				},
				managerMintUntrustMint: async (params: unknown) => {
					calls.push(["managerMintUntrustMint", params]);
				},
				managerMintIsTrustedMint: async (params: unknown) => {
					calls.push(["managerMintIsTrustedMint", params]);
					return true;
				},
				managerWalletBalancesByMint: async (params?: unknown) => {
					calls.push(["managerWalletBalancesByMint", params]);
					return {
						"https://mint.example": balance("5", "1", "6", "sat"),
					} satisfies ManagerBalancesByMintDto;
				},
				managerWalletBalancesByMintAndUnit: async (params?: unknown) => {
					calls.push(["managerWalletBalancesByMintAndUnit", params]);
					return {
						"https://mint.example": {
							sat: balance("5", "1", "6", "sat"),
						},
					} satisfies ManagerBalancesByMintAndUnitDto;
				},
				managerWalletBalancesByUnit: async (params?: unknown) => {
					calls.push(["managerWalletBalancesByUnit", params]);
					return {
						sat: balance("5", "1", "6", "sat"),
					} satisfies ManagerBalancesByUnitDto;
				},
				managerWalletBalancesTotal: async (params?: unknown) => {
					calls.push(["managerWalletBalancesTotal", params]);
					return balance("5", "1", "6", "sat");
				},
				managerWalletBalancesTotalByUnit: async (params?: unknown) => {
					calls.push(["managerWalletBalancesTotalByUnit", params]);
					return {
						sat: balance("5", "1", "6", "sat"),
					} satisfies ManagerBalancesByUnitDto;
				},
				managerHistoryGetPaginatedHistory: async (params: unknown) => {
					calls.push(["managerHistoryGetPaginatedHistory", params]);
					return [historyEntry("history-1", "42")];
				},
				managerMeltQuoteCreate: async (params: unknown) => {
					calls.push(["managerMeltQuoteCreate", params]);
					return meltQuote("quote-1", "UNPAID");
				},
				managerMeltQuoteGet: async (params: unknown) => {
					calls.push(["managerMeltQuoteGet", params]);
					return meltQuote("quote-1", "UNPAID");
				},
				managerMeltQuoteListPending: async (params?: unknown) => {
					calls.push(["managerMeltQuoteListPending", params]);
					return [meltQuote("quote-1", "UNPAID")];
				},
				managerMeltQuoteRefresh: async (params: unknown) => {
					calls.push(["managerMeltQuoteRefresh", params]);
					return meltQuote("quote-1", "PENDING");
				},
				managerMeltPrepare: async (params: unknown) => {
					calls.push(["managerMeltPrepare", params]);
					return meltOperation("melt-1", "prepared");
				},
				managerMeltExecute: async (params: unknown) => {
					calls.push(["managerMeltExecute", params]);
					return meltOperation("melt-1", "pending");
				},
				managerMeltGet: async (params: unknown) => {
					calls.push(["managerMeltGet", params]);
					return meltOperation("melt-1", "pending");
				},
				managerMeltGetByQuote: async (params: unknown) => {
					calls.push(["managerMeltGetByQuote", params]);
					return meltOperation("melt-1", "pending");
				},
				managerMeltListByQuote: async (params: unknown) => {
					calls.push(["managerMeltListByQuote", params]);
					return [meltOperation("melt-1", "pending")];
				},
				managerMeltListPrepared: async () => {
					calls.push(["managerMeltListPrepared"]);
					return [meltOperation("melt-1", "prepared")];
				},
				managerMeltListInFlight: async () => {
					calls.push(["managerMeltListInFlight"]);
					return [meltOperation("melt-1", "pending")];
				},
				managerMeltRefresh: async (params: unknown) => {
					calls.push(["managerMeltRefresh", params]);
					return meltOperation("melt-1", "finalized");
				},
				managerMeltCancel: async (params: unknown) => {
					calls.push(["managerMeltCancel", params]);
				},
				managerMeltReclaim: async (params: unknown) => {
					calls.push(["managerMeltReclaim", params]);
				},
				managerMeltFinalize: async (params: unknown) => {
					calls.push(["managerMeltFinalize", params]);
				},
				managerMeltRecoveryRun: async () => {
					calls.push(["managerMeltRecoveryRun"]);
				},
				managerMeltRecoveryInProgress: async () => {
					calls.push(["managerMeltRecoveryInProgress"]);
					return true;
				},
				managerMeltDiagnosticsIsLocked: async (params: unknown) => {
					calls.push(["managerMeltDiagnosticsIsLocked", params]);
					return params && typeof params === "object"
						? (params as { operationId?: string }).operationId === "melt-1"
						: false;
				},
			},
			send: {
				managerEventSubscribe: (params: unknown) => {
					calls.push(["managerEventSubscribe", params]);
				},
				managerEventUnsubscribe: (params: unknown) => {
					calls.push(["managerEventUnsubscribe", params]);
				},
			},
			addMessageListener(
				message: "managerEvent",
				handler: (event: ManagerEventDto) => void,
			) {
				calls.push(["addMessageListener", message]);
				managerEventHandler = handler;
			},
			removeMessageListener(
				message: "managerEvent",
				handler: (event: ManagerEventDto) => void,
			) {
				calls.push(["removeMessageListener", message]);
				if (managerEventHandler === handler) {
					managerEventHandler = undefined;
				}
			},
		},
	};
}

describe("createRemoteCocoManager", () => {
	it("forwards Coco React mint management calls to the manager RPC", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		await expect(manager.mint.getAllMints()).resolves.toEqual([
			mint("https://mint.example"),
		]);
		await manager.mint.addMint("https://mint.example", { trusted: true });
		await manager.mint.trustMint("https://mint.example");
		await manager.mint.untrustMint("https://mint.example");
		await expect(
			manager.mint.isTrustedMint("https://mint.example"),
		).resolves.toBe(true);

		expect(fake.calls).toEqual([
			["managerMintGetAllMints"],
			[
				"managerMintAddMint",
				{
					mintUrl: "https://mint.example",
					options: { trusted: true },
				},
			],
			["managerMintTrustMint", { mintUrl: "https://mint.example" }],
			["managerMintUntrustMint", { mintUrl: "https://mint.example" }],
			["managerMintIsTrustedMint", { mintUrl: "https://mint.example" }],
		]);
	});

	it("forwards scoped balance calls and rehydrates amount values", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const scope = {
			mintUrls: ["https://mint.example"],
			units: ["sat"],
			trustedOnly: true,
		};

		const byMint = await manager.wallet.balances.byMint(scope);
		const byMintAndUnit = await manager.wallet.balances.byMintAndUnit(scope);
		const byUnit = await manager.wallet.balances.byUnit(scope);
		const total = await manager.wallet.balances.total(scope);
		const totalByUnit = await manager.wallet.balances.totalByUnit(scope);

		expect(
			byMint["https://mint.example"]?.spendable.add("2").toString(),
		).toBe("7");
		expect(
			byMintAndUnit["https://mint.example"]?.["sat"]?.reserved
				.add("2")
				.toString(),
		).toBe("3");
		expect(byUnit["sat"]?.total.add("2").toString()).toBe("8");
		expect(total.spendable.add("2").toString()).toBe("7");
		expect(totalByUnit["sat"]?.spendable.add("2").toString()).toBe("7");
		expect(fake.calls).toEqual([
			["managerWalletBalancesByMint", scope],
			["managerWalletBalancesByMintAndUnit", scope],
			["managerWalletBalancesByUnit", scope],
			["managerWalletBalancesTotal", scope],
			["managerWalletBalancesTotalByUnit", scope],
		]);
	});

	it("forwards Coco React history pagination calls and rehydrates history amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		const entries = await manager.history.getPaginatedHistory(12, 6);

		expect(fake.calls).toEqual([
			[
				"managerHistoryGetPaginatedHistory",
				{
					offset: 12,
					limit: 6,
				},
			],
		]);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.id).toBe("history-1");
		expect(entries[0]?.amount.toString()).toBe("42");
		expect(
			typeof (entries[0]?.amount as unknown as { add: unknown }).add,
		).toBe("function");
	});

	it("supports a hook-equivalent history consumer refreshing from history:updated events", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const history = createPaginatedHistoryConsumer(manager, 24);

		await history.mount();
		fake.emit({
			event: "history:updated",
			payload: {
				mintUrl: "https://mint.example",
				entry: historyEntry("history-2", "21"),
			},
		});
		await Promise.resolve();
		history.unmount();
		fake.emit({
			event: "history:updated",
			payload: {
				mintUrl: "https://mint.example",
				entry: historyEntry("history-ignored", "1"),
			},
		});
		await Promise.resolve();

		expect(history.loads).toHaveLength(2);
		expect(history.current).toHaveLength(1);
		expect(history.current[0]?.amount.toString()).toBe("42");
		expect(fake.calls).toEqual([
			["managerHistoryGetPaginatedHistory", { offset: 0, limit: 24 }],
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "history:updated" }],
			["managerHistoryGetPaginatedHistory", { offset: 0, limit: 24 }],
			["managerEventUnsubscribe", { event: "history:updated" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("forwards Coco React melt quote calls and rehydrates quote amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		const created = await manager.quotes.melt.create({
			mintUrl: "https://mint.example",
			method: "bolt11",
			methodData: { invoice: "lnbc1invoice", amountSats: amountLike("21") },
			unit: "sat",
		});
		const found = await manager.quotes.melt.get({
			mintUrl: "https://mint.example",
			quoteId: "quote-1",
		});
		const pending = await manager.quotes.melt.listPending({ method: "bolt11" });
		const refreshed = await manager.quotes.melt.refresh({
			mintUrl: "https://mint.example",
			quoteId: "quote-1",
		});

		expect(created.amount.add("2").toString()).toBe("23");
		expect(created.fee_reserve?.add("1").toString()).toBe("2");
		expect(found?.amount.toString()).toBe("21");
		expect(pending[0]?.quoteId).toBe("quote-1");
		expect(refreshed.state).toBe("PENDING");
		expect(fake.calls).toEqual([
			[
				"managerMeltQuoteCreate",
				{
					mintUrl: "https://mint.example",
					method: "bolt11",
					methodData: { invoice: "lnbc1invoice", amountSats: "21" },
					unit: "sat",
				},
			],
			[
				"managerMeltQuoteGet",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
			["managerMeltQuoteListPending", { method: "bolt11" }],
			[
				"managerMeltQuoteRefresh",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
		]);
	});

	it("forwards Coco React melt operation lifecycle calls", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const quote = await manager.quotes.melt.create({
			mintUrl: "https://mint.example",
			method: "bolt11",
			methodData: { invoice: "lnbc1invoice" },
			unit: "sat",
		});
		fake.calls.length = 0;

		const prepared = await manager.ops.melt.prepare({ quote, feeIndex: 0 });
		const executed = await manager.ops.melt.execute(prepared);
		const current = await manager.ops.melt.get("melt-1");
		const byQuote = await manager.ops.melt.getByQuote({
			mintUrl: "https://mint.example",
			quoteId: "quote-1",
		});
		const listByQuote = await manager.ops.melt.listByQuote({
			mintUrl: "https://mint.example",
			quoteId: "quote-1",
		});
		const preparedList = await manager.ops.melt.listPrepared();
		const inFlightList = await manager.ops.melt.listInFlight();
		const refreshed = await manager.ops.melt.refresh("melt-1");
		await manager.ops.melt.cancel("melt-1", "user cancelled");
		await manager.ops.melt.reclaim("melt-1", "retry later");
		await manager.ops.melt.finalize("melt-1");

		expect(prepared.amount?.add("2").toString()).toBe("23");
		expect(executed.state).toBe("pending");
		expect(current?.state).toBe("pending");
		expect(byQuote?.quoteId).toBe("quote-1");
		expect(listByQuote[0]?.state).toBe("pending");
		expect(preparedList[0]?.state).toBe("prepared");
		expect(inFlightList[0]?.state).toBe("pending");
		expect(refreshed.state).toBe("finalized");
		expect(fake.calls).toEqual([
			[
				"managerMeltPrepare",
				{
					quote: {
						mintUrl: "https://mint.example",
						quoteId: "quote-1",
						method: "bolt11",
					},
					feeIndex: 0,
				},
			],
			["managerMeltExecute", { operationId: "melt-1" }],
			["managerMeltGet", { operationId: "melt-1" }],
			[
				"managerMeltGetByQuote",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
			[
				"managerMeltListByQuote",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
			["managerMeltListPrepared"],
			["managerMeltListInFlight"],
			["managerMeltRefresh", { operationId: "melt-1" }],
			[
				"managerMeltCancel",
				{ operationId: "melt-1", reason: "user cancelled" },
			],
			[
				"managerMeltReclaim",
				{ operationId: "melt-1", reason: "retry later" },
			],
			["managerMeltFinalize", { operationId: "melt-1" }],
		]);
	});

	it("forwards Coco React melt recovery and diagnostics calls", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		await manager.ops.melt.recovery.run();
		await expect(manager.ops.melt.recovery.inProgress()).resolves.toBe(true);
		await expect(
			manager.ops.melt.diagnostics.isLocked("melt-1"),
		).resolves.toBe(true);

		expect(fake.calls).toEqual([
			["managerMeltRecoveryRun"],
			["managerMeltRecoveryInProgress"],
			[
				"managerMeltDiagnosticsIsLocked",
				{ operationId: "melt-1" },
			],
		]);
	});

	it("supports a hook-equivalent melt consumer updating from melt lifecycle events", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const states: string[] = [];
		const unsubscribe = manager.on("melt-op:pending", (payload) => {
			states.push(String(payload.operation.state));
			states.push(payload.operation.amount?.add("1").toString() ?? "");
		});

		fake.emit({
			event: "melt-op:pending",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "melt-1",
				operation: meltOperation("melt-1", "pending"),
			},
		});
		unsubscribe();
		fake.emit({
			event: "melt-op:pending",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "melt-ignored",
				operation: meltOperation("melt-ignored", "pending"),
			},
		});

		expect(states).toEqual(["pending", "22"]);
		expect(fake.calls).toEqual([
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "melt-op:pending" }],
			["managerEventUnsubscribe", { event: "melt-op:pending" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("delivers mint events through on, off, and unsubscribe behavior", () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const received: ManagerMintWithKeysetsDto[] = [];
		const handler = (payload: ManagerMintWithKeysetsDto) => {
			received.push(payload);
		};

		const unsubscribe = manager.on("mint:added", handler);

		fake.emit({
			event: "mint:added",
			payload: {
				mint: mint("https://mint.example"),
				keysets: [],
			},
		});
		manager.off("mint:added", handler);
		fake.emit({
			event: "mint:added",
			payload: {
				mint: mint("https://mint.example/ignored"),
				keysets: [],
			},
		});

		expect(received).toEqual([
			{
				mint: mint("https://mint.example"),
				keysets: [],
			},
		]);
		expect(fake.calls).toEqual([
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "mint:added" }],
			["managerEventUnsubscribe", { event: "mint:added" }],
			["removeMessageListener", "managerEvent"],
		]);

		const secondUnsubscribe = manager.on("mint:updated", handler);
		secondUnsubscribe();
		unsubscribe();
		expect(fake.calls.slice(-4)).toEqual([
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "mint:updated" }],
			["managerEventUnsubscribe", { event: "mint:updated" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("delivers proof balance refresh events with rehydrated amounts", () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const received: ProofsReservedEvent[] = [];
		const handler = (payload: ProofsReservedEvent) => {
			received.push(payload);
		};

		const unsubscribe = manager.on("proofs:reserved", handler);
		fake.emit({
			event: "proofs:reserved",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "op-1",
				secrets: ["secret-1"],
				amount: { amount: "5", unit: "sat" },
			},
		});
		unsubscribe();

		expect(received[0]?.amount.amount.add("2").toString()).toBe("7");
		expect(fake.calls).toEqual([
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "proofs:reserved" }],
			["managerEventUnsubscribe", { event: "proofs:reserved" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("keeps one RPC event subscription for multiple local listeners", () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const firstHandler = () => {};
		const secondHandler = () => {};

		manager.on("mint:added", firstHandler);
		manager.on("mint:added", secondHandler);
		manager.off("mint:added", firstHandler);
		manager.off("mint:added", secondHandler);

		expect(fake.calls).toEqual([
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "mint:added" }],
			["managerEventUnsubscribe", { event: "mint:added" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("throws clear errors for unsupported manager surface area", () => {
		const manager = createRemoteCocoManager(
			createFakeRpc().rpc,
		) as unknown as RemoteMintManagerSurface;

		expect(
			() =>
				(manager.wallet as unknown as Record<string, unknown>)["restore"],
		).toThrow(
			'Remote Coco manager wallet API does not support "restore" yet',
		);
		expect(
			() => (manager.mint as unknown as Record<string, unknown>)["getMintInfo"],
		).toThrow(
			'Remote Coco manager mint API does not support "getMintInfo" yet',
		);
		expect(
			() => (manager.history as unknown as Record<string, unknown>)["getById"],
		).toThrow(
			'Remote Coco manager history API does not support "getById" yet',
		);
	});
});

function mint(mintUrl: string) {
	return {
		mintUrl,
		name: mintUrl,
		mintInfo: null,
		trusted: true,
		createdAt: 1,
		updatedAt: 2,
	};
}

function balance(
	spendable: string,
	reserved: string,
	total: string,
	unit: string,
) {
	return {
		spendable,
		reserved,
		total,
		unit,
	};
}

function meltQuote(quoteId: string, state: string): ManagerMeltQuoteDto {
	return {
		mintUrl: "https://mint.example",
		method: "bolt11",
		quoteId,
		quote: quoteId,
		request: "lnbc1invoice",
		amount: "21",
		unit: "sat",
		expiry: 1_700_000_000,
		state,
		fee_reserve: "1",
		createdAt: 10,
		updatedAt: 11,
	};
}

function meltOperation(
	id: string,
	state: string,
): ManagerMeltOperationDto {
	return {
		id,
		mintUrl: "https://mint.example",
		method: "bolt11",
		methodData: { invoice: "lnbc1invoice" },
		unit: "sat",
		state,
		createdAt: 12,
		updatedAt: 13,
		quoteId: "quote-1",
		needsSwap: true,
		amount: "21",
		fee_reserve: "1",
		swap_fee: "0",
		inputAmount: "22",
		inputProofSecrets: ["secret-1"],
		changeOutputData: [],
	};
}

function createPaginatedHistoryConsumer(
	manager: RemoteMintManagerSurface,
	pageSize: number,
) {
	const loads: HistoryEntry[][] = [];
	let current: HistoryEntry[] = [];
	let unsubscribe: (() => void) | undefined;
	const refresh = async () => {
		current = await manager.history.getPaginatedHistory(0, pageSize);
		loads.push(current);
	};

	return {
		get current() {
			return current;
		},
		loads,
		async mount() {
			await refresh();
			unsubscribe = manager.on("history:updated", () => {
				void refresh();
			});
		},
		unmount() {
			unsubscribe?.();
			unsubscribe = undefined;
		},
	};
}

function historyEntry(id: string, amount: string): ManagerHistoryEntryDto {
	return {
		id,
		type: "send",
		source: "operation",
		operationId: "send-1",
		state: "finalized",
		mintUrl: "https://mint.example",
		unit: "sat",
		amount,
		token: { token: [{ mint: "https://mint.example", proofs: [] }] },
		createdAt: 10,
		updatedAt: 11,
	};
}

function amountLike(value: string) {
	return {
		toJSON: () => value,
		toString: () => value,
	};
}
