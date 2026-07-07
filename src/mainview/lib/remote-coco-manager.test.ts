import { describe, expect, it } from "bun:test";
import type { HistoryEntry } from "@cashu/coco-core";
import type {
	ManagerBalanceScopeDto,
	ManagerBalancesByMintAndUnitDto,
	ManagerBalancesByMintDto,
	ManagerBalancesByUnitDto,
	ManagerEventDto,
	ManagerHistoryEntryDto,
	ManagerMintDto,
	ManagerMintWithKeysetsDto,
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
	};
	history: {
		getPaginatedHistory: (
			offset?: number,
			limit?: number,
		) => Promise<HistoryEntry[]>;
	};
	ops: {
		send: {
			recovery: {
				run: () => Promise<void>;
				inProgress: () => Promise<boolean>;
			};
			diagnostics: {
				isLocked: (operationId: string) => Promise<boolean>;
			};
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
			event: "send:pending",
			handler: (payload: SendPendingEvent) => void,
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
			event: "send:pending",
			handler: (payload: SendPendingEvent) => void,
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
				managerSendRecoveryRun: async () => {
					calls.push(["managerSendRecoveryRun"]);
				},
				managerSendRecoveryInProgress: async () => {
					calls.push(["managerSendRecoveryInProgress"]);
					return true;
				},
				managerSendDiagnosticsIsLocked: async (params: unknown) => {
					calls.push(["managerSendDiagnosticsIsLocked", params]);
					return Boolean(
						params &&
						typeof params === "object" &&
						"operationId" in params &&
						params.operationId === "send-locked",
					);
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

	it("forwards Coco React send recovery and diagnostics calls", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		await manager.ops.send.recovery.run();
		await expect(manager.ops.send.recovery.inProgress()).resolves.toBe(true);
		await expect(
			manager.ops.send.diagnostics.isLocked("send-locked"),
		).resolves.toBe(true);
		await expect(
			manager.ops.send.diagnostics.isLocked("send-open"),
		).resolves.toBe(false);

		expect(fake.calls).toEqual([
			["managerSendRecoveryRun"],
			["managerSendRecoveryInProgress"],
			["managerSendDiagnosticsIsLocked", { operationId: "send-locked" }],
			["managerSendDiagnosticsIsLocked", { operationId: "send-open" }],
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
		expect(
			() =>
				(manager.ops as unknown as Record<string, unknown>)["receive"],
		).toThrow(
			'Remote Coco manager operations API does not support "receive" yet',
		);
		expect(
			() =>
				(
					manager.ops.send as unknown as Record<string, unknown>
				)["recover"],
		).toThrow(
			'Remote Coco manager send operations API does not support "recover" yet',
		);
		expect(
			() =>
				(
					manager.ops.send.recovery as unknown as Record<string, unknown>
				)["stop"],
		).toThrow(
			'Remote Coco manager send recovery API does not support "stop" yet',
		);
		expect(
			() =>
				(
					manager.ops.send.diagnostics as unknown as Record<string, unknown>
				)["locks"],
		).toThrow(
			'Remote Coco manager send diagnostics API does not support "locks" yet',
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

function createSendOperationConsumer(
	manager: RemoteMintManagerSurface,
	operationId: string,
) {
	let current: RemoteSendOperation | null = null;
	let unsubscribe: (() => void) | undefined;

	return {
		get current() {
			return current;
		},
		async mount() {
			current = await manager.ops.send.get(operationId);
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
