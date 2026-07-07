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
	ManagerMintQuoteDto,
	ManagerMintWithKeysetsDto,
	ManagerMintOperationDto,
	ManagerPendingMintCheckResultDto,
	ManagerPreparedReceiveOperationDto,
	ManagerReceiveOperationDto,
	ManagerSendExecuteResultDto,
	ManagerSendOperationDto,
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
		restore: (mintUrl: string, options?: { units?: string[] }) => Promise<void>;
	};
	history: {
		getPaginatedHistory: (
			offset?: number,
			limit?: number,
		) => Promise<HistoryEntry[]>;
	};
	quotes: {
		mint: {
			create: (input: {
				mintUrl: string;
				method: "bolt11";
				amount: { amount: string; unit: string };
			}) => Promise<RemoteMintQuote>;
			listPending: (input?: { method?: "bolt11" }) => Promise<RemoteMintQuote[]>;
		};
	};
	ops: {
		mint: {
			prepare: (input: {
				quote: {
					mintUrl: string;
					method: "bolt11";
					quoteId: string;
				};
				amount: AmountLike | string;
			}) => Promise<MintOperation>;
			refresh: (operationId: string) => Promise<MintOperation>;
			execute: (operationOrId: MintOperation | string) => Promise<MintOperation>;
			checkPayment: (
				operationId: string,
			) => Promise<ManagerPendingMintCheckResultDto>;
			finalize: (operationId: string) => Promise<MintOperation>;
			get: (operationId: string) => Promise<MintOperation | null>;
			listByQuote: (input: {
				mintUrl: string;
				quoteId: string;
			}) => Promise<MintOperation[]>;
			listPending: () => Promise<MintOperation[]>;
			listInFlight: () => Promise<MintOperation[]>;
		};
		send: {
			prepare: (input: {
				mintUrl: string;
				amount: string | { amount: string; unit: string };
				unit?: string;
				target?: unknown;
			}) => Promise<RemoteSendOperation>;
			execute: (
				operationOrId: string | RemoteSendOperation,
				options?: { memo?: string },
			) => Promise<{
				operation: RemoteSendOperation;
				token: unknown;
			}>;
			get: (operationId: string) => Promise<RemoteSendOperation | null>;
			listPrepared: () => Promise<RemoteSendOperation[]>;
			listInFlight: () => Promise<RemoteSendOperation[]>;
			refresh: (operationId: string) => Promise<RemoteSendOperation>;
			cancel: (operationId: string) => Promise<void>;
			reclaim: (operationId: string) => Promise<void>;
			finalize: (operationId: string) => Promise<void>;
		};
		receive: {
			prepare: (input: {
				token: unknown;
			}) => Promise<RemoteReceiveOperation>;
			execute: (
				operationOrId: string | RemoteReceiveOperation,
			) => Promise<RemoteReceiveOperation>;
			get: (operationId: string) => Promise<RemoteReceiveOperation | null>;
			refresh: (operationId: string) => Promise<RemoteReceiveOperation>;
			cancel: (operationId: string, reason?: string) => Promise<void>;
			listPrepared: () => Promise<RemoteReceiveOperation[]>;
			listInFlight: () => Promise<RemoteReceiveOperation[]>;
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
			event: "mint-op:pending",
			handler: (payload: MintOperationEvent) => void,
		): () => void;
		(
			event: "send:pending",
			handler: (payload: SendPendingEvent) => void,
		): () => void;
		(
			event: "receive-op:prepared",
			handler: (payload: ReceiveOperationEvent) => void,
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
			event: "mint-op:pending",
			handler: (payload: MintOperationEvent) => void,
		): void;
		(
			event: "send:pending",
			handler: (payload: SendPendingEvent) => void,
		): void;
		(
			event: "receive-op:prepared",
			handler: (payload: ReceiveOperationEvent) => void,
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

type MintOperation = Omit<ManagerMintOperationDto, "amount"> & {
	amount: AmountLike;
};

type RemoteMintQuote = Omit<ManagerMintQuoteDto, "amount"> & {
	amount: AmountLike;
};

type MintOperationEvent = {
	mintUrl: string;
	operationId: string;
	operation: MintOperation;
};

type RemoteSendOperation = Omit<
	ManagerSendOperationDto,
	"amount" | "fee" | "inputAmount"
> & {
	amount: AmountLike;
	fee?: AmountLike;
	inputAmount?: AmountLike;
};

type SendPendingEvent = {
	mintUrl: string;
	operationId: string;
	operation: RemoteSendOperation;
	token: unknown;
};

type RemoteReceiveOperation = Omit<
	ManagerReceiveOperationDto,
	"amount" | "fee"
> & {
	amount: AmountLike;
	fee?: AmountLike;
};

type ReceiveOperationEvent = {
	mintUrl: string;
	operationId: string;
	operation: RemoteReceiveOperation;
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
				managerWalletRestore: async (params: unknown) => {
					calls.push(["managerWalletRestore", params]);
				},
				managerHistoryGetPaginatedHistory: async (params: unknown) => {
					calls.push(["managerHistoryGetPaginatedHistory", params]);
					return [historyEntry("history-1", "42")];
				},
				managerMintQuoteCreate: async (params: unknown) => {
					calls.push(["managerMintQuoteCreate", params]);
					return mintQuote("quote-1");
				},
				managerMintQuoteListPending: async (params?: unknown) => {
					calls.push(["managerMintQuoteListPending", params]);
					return [mintQuote("quote-1")];
				},
				managerMintOpsPrepare: async (params: unknown) => {
					calls.push(["managerMintOpsPrepare", params]);
					return mintOperation("mint-op-1", "pending", "5");
				},
				managerMintOpsRefresh: async (params: unknown) => {
					calls.push(["managerMintOpsRefresh", params]);
					return mintOperation("mint-op-1", "pending", "6");
				},
				managerMintOpsExecute: async (params: unknown) => {
					calls.push(["managerMintOpsExecute", params]);
					return mintOperation("mint-op-1", "executing", "7");
				},
				managerMintOpsCheckPayment: async (params: unknown) => {
					calls.push(["managerMintOpsCheckPayment", params]);
					return {
						category: "ready",
						observedRemoteState: "PAID",
						observedRemoteStateAt: 12,
						quoteSnapshot: {
							amount: "8",
							amountPaid: "8",
							amountIssued: "0",
						},
					};
				},
				managerMintOpsFinalize: async (params: unknown) => {
					calls.push(["managerMintOpsFinalize", params]);
					return mintOperation("mint-op-1", "finalized", "9");
				},
				managerMintOpsGet: async (params: unknown) => {
					calls.push(["managerMintOpsGet", params]);
					return mintOperation("mint-op-1", "pending", "10");
				},
				managerMintOpsListByQuote: async (params: unknown) => {
					calls.push(["managerMintOpsListByQuote", params]);
					return [mintOperation("mint-op-1", "pending", "11")];
				},
				managerMintOpsListPending: async () => {
					calls.push(["managerMintOpsListPending"]);
					return [mintOperation("mint-op-1", "pending", "12")];
				},
				managerMintOpsListInFlight: async () => {
					calls.push(["managerMintOpsListInFlight"]);
					return [mintOperation("mint-op-1", "executing", "13")];
				},
				managerSendPrepare: async (params: unknown) => {
					calls.push(["managerSendPrepare", params]);
					return sendOperation("send-1", "prepared");
				},
				managerSendExecute: async (params: unknown) => {
					calls.push(["managerSendExecute", params]);
					return {
						operation: sendOperation("send-1", "pending", {
							token: token("send-1"),
						}),
						token: token("send-1"),
					} satisfies ManagerSendExecuteResultDto;
				},
				managerSendGet: async (params: unknown) => {
					calls.push(["managerSendGet", params]);
					return sendOperation("send-1", "pending", {
						token: token("send-1"),
					});
				},
				managerSendListPrepared: async () => {
					calls.push(["managerSendListPrepared"]);
					return [sendOperation("send-1", "prepared")];
				},
				managerSendListInFlight: async () => {
					calls.push(["managerSendListInFlight"]);
					return [
						sendOperation("send-2", "pending", {
							token: token("send-2"),
						}),
					];
				},
				managerSendRefresh: async (params: unknown) => {
					calls.push(["managerSendRefresh", params]);
					return sendOperation("send-1", "finalized", {
						token: token("send-1"),
					});
				},
				managerSendCancel: async (params: unknown) => {
					calls.push(["managerSendCancel", params]);
				},
				managerSendReclaim: async (params: unknown) => {
					calls.push(["managerSendReclaim", params]);
				},
				managerSendFinalize: async (params: unknown) => {
					calls.push(["managerSendFinalize", params]);
				},
				managerReceivePrepare: async (params: unknown) => {
					calls.push(["managerReceivePrepare", params]);
					return receiveOperation("receive-1", "prepared", {
						fee: "1",
						outputData: { outputs: [] },
					}) as ManagerPreparedReceiveOperationDto;
				},
				managerReceiveExecute: async (params: unknown) => {
					calls.push(["managerReceiveExecute", params]);
					return receiveOperation("receive-1", "finalized");
				},
				managerReceiveGet: async (params: unknown) => {
					calls.push(["managerReceiveGet", params]);
					return receiveOperation("receive-1", "prepared", {
						fee: "1",
						outputData: { outputs: [] },
					});
				},
				managerReceiveRefresh: async (params: unknown) => {
					calls.push(["managerReceiveRefresh", params]);
					return receiveOperation("receive-1", "executing");
				},
				managerReceiveCancel: async (params: unknown) => {
					calls.push(["managerReceiveCancel", params]);
				},
				managerReceiveListPrepared: async () => {
					calls.push(["managerReceiveListPrepared"]);
					return [
						receiveOperation("receive-1", "prepared", {
							fee: "1",
							outputData: { outputs: [] },
						}) as ManagerPreparedReceiveOperationDto,
					];
				},
				managerReceiveListInFlight: async () => {
					calls.push(["managerReceiveListInFlight"]);
					return [receiveOperation("receive-2", "executing")];
				},
				managerMeltQuoteCreate: async (params: unknown) => {
					calls.push(["managerMeltQuoteCreate", params]);
					return meltQuote("quote-1");
				},
				managerMeltQuoteGet: async (params: unknown) => {
					calls.push(["managerMeltQuoteGet", params]);
					return meltQuote("quote-1");
				},
				managerMeltQuoteListPending: async (params?: unknown) => {
					calls.push(["managerMeltQuoteListPending", params]);
					return [meltQuote("quote-1")];
				},
				managerMeltQuoteRefresh: async (params: unknown) => {
					calls.push(["managerMeltQuoteRefresh", params]);
					return meltQuote("quote-1", { state: "PAID" });
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
					return [meltOperation("melt-2", "pending")];
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

	it("forwards Coco React wallet restore calls to the manager RPC", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		await manager.wallet.restore("https://mint.example", { units: ["sat"] });

		expect(fake.calls).toEqual([
			[
				"managerWalletRestore",
				{
					mintUrl: "https://mint.example",
					options: { units: ["sat"] },
				},
			],
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

	it("forwards Coco React mint quote calls and rehydrates quote amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		const created = await manager.quotes.mint.create({
			mintUrl: "https://mint.example",
			method: "bolt11",
			amount: { amount: "21", unit: "sat" },
		});
		const pending = await manager.quotes.mint.listPending({ method: "bolt11" });

		expect(created.amount.add("2").toString()).toBe("23");
		expect(pending[0]?.amount.add("2").toString()).toBe("23");
		expect(fake.calls).toEqual([
			[
				"managerMintQuoteCreate",
				{
					mintUrl: "https://mint.example",
					method: "bolt11",
					amount: { amount: "21", unit: "sat" },
				},
			],
			["managerMintQuoteListPending", { method: "bolt11" }],
		]);
	});

	it("forwards Coco React mint operation lifecycle calls and rehydrates amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		const prepared = await manager.ops.mint.prepare({
			quote: {
				mintUrl: "https://mint.example",
				method: "bolt11",
				quoteId: "quote-1",
			},
			amount: "5",
		});
		const refreshed = await manager.ops.mint.refresh("mint-op-1");
		const executed = await manager.ops.mint.execute(prepared);
		const check = await manager.ops.mint.checkPayment("mint-op-1");
		const finalized = await manager.ops.mint.finalize("mint-op-1");
		const fetched = await manager.ops.mint.get("mint-op-1");
		const byQuote = await manager.ops.mint.listByQuote({
			mintUrl: "https://mint.example",
			quoteId: "quote-1",
		});
		const pending = await manager.ops.mint.listPending();
		const inFlight = await manager.ops.mint.listInFlight();

		expect(prepared.amount.add("2").toString()).toBe("7");
		expect(refreshed.amount.add("2").toString()).toBe("8");
		expect(executed.amount.add("2").toString()).toBe("9");
		expect(finalized.amount.add("2").toString()).toBe("11");
		expect(fetched?.amount.add("2").toString()).toBe("12");
		expect(byQuote[0]?.amount.add("2").toString()).toBe("13");
		expect(pending[0]?.amount.add("2").toString()).toBe("14");
		expect(inFlight[0]?.amount.add("2").toString()).toBe("15");
		expect(
			(
				check.quoteSnapshot as {
					amount: AmountLike;
					amountPaid: AmountLike;
					amountIssued: AmountLike;
				}
			).amountPaid.add("2").toString(),
		).toBe("10");
		expect(fake.calls).toEqual([
			[
				"managerMintOpsPrepare",
				{
					quote: {
						mintUrl: "https://mint.example",
						method: "bolt11",
						quoteId: "quote-1",
					},
					amount: "5",
				},
			],
			["managerMintOpsRefresh", { operationId: "mint-op-1" }],
			["managerMintOpsExecute", { operationId: "mint-op-1" }],
			["managerMintOpsCheckPayment", { operationId: "mint-op-1" }],
			["managerMintOpsFinalize", { operationId: "mint-op-1" }],
			["managerMintOpsGet", { operationId: "mint-op-1" }],
			[
				"managerMintOpsListByQuote",
				{
					mintUrl: "https://mint.example",
					quoteId: "quote-1",
				},
			],
			["managerMintOpsListPending"],
			["managerMintOpsListInFlight"],
		]);
	});

	it("forwards Coco React send lifecycle calls and rehydrates operation amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		const prepared = await manager.ops.send.prepare({
			mintUrl: "https://mint.example",
			amount: { amount: "21", unit: "sat" },
			target: { pubkey: "02abc" },
		});
		const executed = await manager.ops.send.execute(prepared, {
			memo: "for coffee",
		});
		const current = await manager.ops.send.get("send-1");
		const preparedOperations = await manager.ops.send.listPrepared();
		const inFlightOperations = await manager.ops.send.listInFlight();
		const refreshed = await manager.ops.send.refresh("send-1");
		await manager.ops.send.cancel("send-1");
		await manager.ops.send.reclaim("send-1");
		await manager.ops.send.finalize("send-1");

		expect(prepared.amount.add("2").toString()).toBe("23");
		expect(prepared.fee?.add("2").toString()).toBe("3");
		expect(executed.operation.state).toBe("pending");
		expect(executed.token).toEqual(token("send-1"));
		expect(current?.token).toEqual(token("send-1"));
		expect(preparedOperations[0]?.state).toBe("prepared");
		expect(inFlightOperations[0]?.id).toBe("send-2");
		expect(refreshed.state).toBe("finalized");
		expect(fake.calls).toEqual([
			[
				"managerSendPrepare",
				{
					mintUrl: "https://mint.example",
					amount: "21",
					unit: "sat",
					target: { pubkey: "02abc" },
				},
			],
			[
				"managerSendExecute",
				{
					operationId: "send-1",
					options: { memo: "for coffee" },
				},
			],
			["managerSendGet", { operationId: "send-1" }],
			["managerSendListPrepared"],
			["managerSendListInFlight"],
			["managerSendRefresh", { operationId: "send-1" }],
			["managerSendCancel", { operationId: "send-1" }],
			["managerSendReclaim", { operationId: "send-1" }],
			["managerSendFinalize", { operationId: "send-1" }],
		]);
	});

	it("forwards Coco React receive lifecycle calls and rehydrates operation amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		const prepared = await manager.ops.receive.prepare({
			token: "cashuA...",
		});
		const executed = await manager.ops.receive.execute(prepared);
		const current = await manager.ops.receive.get("receive-1");
		const refreshed = await manager.ops.receive.refresh("receive-1");
		await manager.ops.receive.cancel("receive-1", "user");
		const preparedOperations = await manager.ops.receive.listPrepared();
		const inFlightOperations = await manager.ops.receive.listInFlight();

		expect(prepared.amount.add("2").toString()).toBe("36");
		expect(prepared.fee?.add("2").toString()).toBe("3");
		expect(executed.state).toBe("finalized");
		expect(current?.state).toBe("prepared");
		expect(refreshed.state).toBe("executing");
		expect(preparedOperations[0]?.fee?.add("2").toString()).toBe("3");
		expect(inFlightOperations[0]?.id).toBe("receive-2");
		expect(fake.calls).toEqual([
			["managerReceivePrepare", { token: "cashuA..." }],
			["managerReceiveExecute", { operationId: "receive-1" }],
			["managerReceiveGet", { operationId: "receive-1" }],
			["managerReceiveRefresh", { operationId: "receive-1" }],
			[
				"managerReceiveCancel",
				{ operationId: "receive-1", reason: "user" },
			],
			["managerReceiveListPrepared"],
			["managerReceiveListInFlight"],
		]);
	});

	it("surfaces mint operation RPC errors without adapter wrapping", async () => {
		const fake = createFakeRpc();
		fake.rpc.request.managerMintOpsFinalize = async () => {
			throw new Error("Mint quote expired");
		};
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		await expect(manager.ops.mint.finalize("mint-op-1")).rejects.toThrow(
			"Mint quote expired",
		);
	});

	it("surfaces manager RPC errors from send operations", async () => {
		const fake = createFakeRpc();
		fake.rpc.request.managerSendRefresh = async () => {
			throw new Error("manager refused send refresh");
		};
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		await expect(manager.ops.send.refresh("send-1")).rejects.toThrow(
			"manager refused send refresh",
		);
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

	it("supports a hook-equivalent mint operation consumer refreshing from mint operation events", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const consumer = createMintOperationConsumer(manager, "mint-op-1");

		await consumer.mount();
		fake.emit({
			event: "mint-op:pending",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "mint-op-1",
				operation: mintOperation("mint-op-1", "pending", "21"),
			},
		});
		await Promise.resolve();
		consumer.unmount();
		fake.emit({
			event: "mint-op:pending",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "mint-op-ignored",
				operation: mintOperation("mint-op-ignored", "pending", "1"),
			},
		});
		await Promise.resolve();

		expect(consumer.loads).toHaveLength(2);
		expect(consumer.current?.amount.toString()).toBe("10");
		expect(fake.calls).toEqual([
			["managerMintOpsGet", { operationId: "mint-op-1" }],
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "mint-op:pending" }],
			["managerMintOpsGet", { operationId: "mint-op-1" }],
			["managerEventUnsubscribe", { event: "mint-op:pending" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("supports a hook-equivalent send consumer updating from send lifecycle events", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const consumer = createSendOperationConsumer(manager, "send-1");

		await consumer.mount();
		fake.emit({
			event: "send:pending",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "send-1",
				operation: sendOperation("send-1", "pending", {
					token: token("send-1"),
				}),
				token: token("send-1"),
			},
		});
		await Promise.resolve();
		consumer.unmount();
		fake.emit({
			event: "send:pending",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "send-ignored",
				operation: sendOperation("send-ignored", "pending", {
					token: token("send-ignored"),
				}),
				token: token("send-ignored"),
			},
		});

		expect(consumer.current?.state).toBe("pending");
		expect(consumer.current?.amount.add("2").toString()).toBe("23");
		expect(consumer.current?.token).toEqual(token("send-1"));
		expect(fake.calls).toEqual([
			["managerSendGet", { operationId: "send-1" }],
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "send:pending" }],
			["managerEventUnsubscribe", { event: "send:pending" }],
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
			() => (manager.mint as unknown as Record<string, unknown>)["getMintInfo"],
		).toThrow(
			'Remote Coco manager mint API does not support "getMintInfo" yet',
		);
		expect(
			() => (manager.history as unknown as Record<string, unknown>)["getById"],
		).toThrow(
			'Remote Coco manager history API does not support "getById" yet',
		);
		expect(
			() =>
				(
					manager as unknown as { quotes: Record<string, unknown> }
				).quotes["receive"],
		).toThrow(
			'Remote Coco manager quotes API does not support "receive" yet',
		);
		expect(
			() =>
				(
					(manager.ops as unknown as { melt: Record<string, unknown> })
						.melt
				)["recover"],
		).toThrow(
			'Remote Coco manager melt operation API does not support "recover" yet',
		);
		expect(
			() =>
				(
					(manager.ops as unknown as { receive: Record<string, unknown> })
						.receive
				)["recover"],
		).toThrow(
			'Remote Coco manager receive ops API does not support "recover" yet',
		);
		expect(
			() =>
				(
					manager.ops.send as unknown as Record<string, unknown>
				)["recover"],
		).toThrow(
			'Remote Coco manager send operations API does not support "recover" yet',
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

function mintOperation(
	id: string,
	state: string,
	amount: string,
): ManagerMintOperationDto {
	return {
		id,
		mintUrl: "https://mint.example",
		method: "bolt11",
		state,
		amount,
		unit: "sat",
		quoteId: "quote-1",
		request: "lnbc1...",
		expiry: null,
		createdAt: 20,
		updatedAt: 21,
	};
}

function mintQuote(
	quoteId: string,
	overrides: Partial<ManagerMintQuoteDto> = {},
): ManagerMintQuoteDto {
	return {
		mintUrl: "https://mint.example",
		method: "bolt11",
		quoteId,
		request: "lnbc1...",
		amount: "21",
		unit: "sat",
		expiry: 123,
		state: "UNPAID",
		createdAt: 18,
		updatedAt: 19,
		...overrides,
	};
}

function createMintOperationConsumer(
	manager: RemoteMintManagerSurface,
	operationId: string,
) {
	const loads: MintOperation[] = [];
	let current: MintOperation | null = null;
	let unsubscribe: (() => void) | undefined;
	const refresh = async () => {
		current = await manager.ops.mint.get(operationId);
		if (current) {
			loads.push(current);
		}
	};

	return {
		get current() {
			return current;
		},
		loads,
		async mount() {
			await refresh();
			unsubscribe = manager.on("mint-op:pending", (payload) => {
				if (payload.operationId === operationId) {
					void refresh();
				}
			});
		},
		unmount() {
			unsubscribe?.();
			unsubscribe = undefined;
		},
	};
}

function receiveOperation(
	id: string,
	state: ManagerReceiveOperationDto["state"],
	overrides: Partial<ManagerReceiveOperationDto> = {},
): ManagerReceiveOperationDto {
	return {
		id,
		mintUrl: "https://mint.example",
		unit: "sat",
		amount: "34",
		inputProofs: [{ secret: "secret-1" }],
		createdAt: 14,
		updatedAt: 15,
		state,
		source: { type: "manual-token" },
		...overrides,
	};
}

function meltQuote(
	quoteId: string,
	overrides: Partial<ManagerMeltQuoteDto> = {},
): ManagerMeltQuoteDto {
	return {
		mintUrl: "https://mint.example",
		method: "bolt11",
		quoteId,
		request: "lnbc1...",
		amount: "55",
		unit: "sat",
		expiry: 123,
		state: "UNPAID",
		fee_reserve: "2",
		fee_options: [{ fee_reserve: "2", label: "fast" }],
		createdAt: 16,
		updatedAt: 17,
		...overrides,
	};
}

function meltOperation(
	id: string,
	state: string,
	overrides: Partial<ManagerMeltOperationDto> = {},
): ManagerMeltOperationDto {
	return {
		id,
		mintUrl: "https://mint.example",
		method: "bolt11",
		methodData: {
			amountSats: "55",
			changeOutputData: [
				{
					blindedMessage: {
						amount: 123,
					},
				},
			],
		},
		unit: "sat",
		state,
		createdAt: 18,
		updatedAt: 19,
		amount: "55",
		fee_reserve: "2",
		swap_fee: "1",
		inputAmount: "56",
		changeAmount: "0",
		effectiveFee: "2",
		...overrides,
	};
}

function sendOperation(
	id: string,
	state: ManagerSendOperationDto["state"],
	overrides: Partial<ManagerSendOperationDto> = {},
): ManagerSendOperationDto {
	return {
		id,
		mintUrl: "https://mint.example",
		amount: "21",
		unit: "sat",
		method: "default",
		methodData: {},
		state,
		needsSwap: true,
		fee: "1",
		inputAmount: "22",
		inputProofSecrets: ["secret-1"],
		outputData: { outputs: [] },
		createdAt: 12,
		updatedAt: 13,
		...overrides,
	};
}

function token(operationId: string) {
	return {
		token: [
			{
				mint: "https://mint.example",
				proofs: [{ id: operationId, amount: 21 }],
			},
		],
	};
}

function createSendOperationConsumer(
	manager: RemoteMintManagerSurface,
	operationId: string,
) {
	let current: RemoteSendOperation | null = null;
	let unsubscribe: (() => void) | undefined;
	const refresh = async () => {
		current = await manager.ops.send.get(operationId);
	};

	return {
		get current() {
			return current;
		},
		async mount() {
			await refresh();
			unsubscribe = manager.on("send:pending", (payload) => {
				if (payload.operationId === operationId) {
					current = payload.operation;
				}
			});
		},
		unmount() {
			unsubscribe?.();
			unsubscribe = undefined;
		},
	};
}
