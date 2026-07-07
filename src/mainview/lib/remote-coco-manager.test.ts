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
	ManagerReceiveOperationDto,
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
		receive: {
			prepare: (params: { token: string }) => Promise<ReceiveOperationLike>;
			execute: (
				operationOrId: ReceiveOperationLike | string,
			) => Promise<ReceiveOperationLike>;
			get: (operationId: string) => Promise<ReceiveOperationLike | null>;
			refresh: (operationId: string) => Promise<ReceiveOperationLike>;
			cancel: (operationId: string, reason?: string) => Promise<void>;
			listPrepared: () => Promise<ReceiveOperationLike[]>;
			listInFlight: () => Promise<ReceiveOperationLike[]>;
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
				| "receive-op:prepared"
				| "receive-op:finalized"
				| "receive-op:rolled-back",
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
			event:
				| "receive-op:prepared"
				| "receive-op:finalized"
				| "receive-op:rolled-back",
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

type ReceiveOperationLike = Omit<
	ManagerReceiveOperationDto,
	"amount" | "fee"
> & {
	amount: AmountLike;
	fee?: AmountLike;
};

type ReceiveOperationEvent = {
	mintUrl: string;
	operationId: string;
	operation: ReceiveOperationLike;
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
				managerReceivePrepare: async (params: unknown) => {
					calls.push(["managerReceivePrepare", params]);
					return receiveOperation("receive-1", "prepared");
				},
				managerReceiveExecute: async (params: unknown) => {
					calls.push(["managerReceiveExecute", params]);
					return receiveOperation("receive-1", "finalized");
				},
				managerReceiveGet: async (params: unknown) => {
					calls.push(["managerReceiveGet", params]);
					return receiveOperation("receive-1", "prepared");
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
					return [receiveOperation("receive-1", "prepared")];
				},
				managerReceiveListInFlight: async () => {
					calls.push(["managerReceiveListInFlight"]);
					return [receiveOperation("receive-2", "executing")];
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

	it("forwards Coco React receive operation lifecycle calls and rehydrates amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		const prepared = await manager.ops.receive.prepare({ token: "cashu-token" });
		const finalized = await manager.ops.receive.execute(prepared);
		const fetched = await manager.ops.receive.get("receive-1");
		const refreshed = await manager.ops.receive.refresh("receive-1");
		await manager.ops.receive.cancel("receive-1", "user cancelled");
		const preparedList = await manager.ops.receive.listPrepared();
		const inFlightList = await manager.ops.receive.listInFlight();

		expect(prepared.state).toBe("prepared");
		expect(finalized.state).toBe("finalized");
		expect(fetched?.state).toBe("prepared");
		expect(refreshed.state).toBe("executing");
		expect(prepared.amount.add("2").toString()).toBe("23");
		expect(prepared.fee?.add("2").toString()).toBe("3");
		expect(preparedList[0]?.amount.toString()).toBe("21");
		expect(inFlightList[0]?.state).toBe("executing");
		expect(fake.calls).toEqual([
			["managerReceivePrepare", { token: "cashu-token" }],
			["managerReceiveExecute", { operationId: "receive-1" }],
			["managerReceiveGet", { operationId: "receive-1" }],
			["managerReceiveRefresh", { operationId: "receive-1" }],
			[
				"managerReceiveCancel",
				{ operationId: "receive-1", reason: "user cancelled" },
			],
			["managerReceiveListPrepared"],
			["managerReceiveListInFlight"],
		]);
	});

	it("supports a hook-equivalent receive consumer updating from receive lifecycle events", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;
		const receive = createReceiveOperationConsumer(manager);

		await receive.mount();
		fake.emit({
			event: "receive-op:finalized",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "receive-1",
				operation: receiveOperation("receive-1", "finalized"),
			},
		});
		receive.unmount();
		fake.emit({
			event: "receive-op:rolled-back",
			payload: {
				mintUrl: "https://mint.example",
				operationId: "receive-ignored",
				operation: receiveOperation("receive-ignored", "rolled_back"),
			},
		});

		expect(receive.operations.map((operation) => operation.state)).toEqual([
			"finalized",
		]);
		expect(receive.operations[0]?.amount.add("2").toString()).toBe("23");
		expect(fake.calls).toEqual([
			["managerReceiveListPrepared"],
			["addMessageListener", "managerEvent"],
			["managerEventSubscribe", { event: "receive-op:finalized" }],
			["managerEventUnsubscribe", { event: "receive-op:finalized" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("surfaces receive operation errors from the manager RPC", async () => {
		const fake = createFakeRpc();
		fake.rpc.request.managerReceivePrepare = async () => {
			throw new Error("Token validation failed");
		};
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteMintManagerSurface;

		await expect(
			manager.ops.receive.prepare({ token: "bad-token" }),
		).rejects.toThrow("Token validation failed");
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

function createReceiveOperationConsumer(manager: RemoteMintManagerSurface) {
	let operations: ReceiveOperationLike[] = [];
	let unsubscribe: (() => void) | undefined;

	return {
		get operations() {
			return operations;
		},
		async mount() {
			operations = await manager.ops.receive.listPrepared();
			unsubscribe = manager.on("receive-op:finalized", (payload) => {
				operations = operations
					.filter((operation) => operation.id !== payload.operationId)
					.concat(payload.operation);
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

function receiveOperation(
	id: string,
	state: ManagerReceiveOperationDto["state"],
): ManagerReceiveOperationDto {
	return {
		id,
		mintUrl: "https://mint.example",
		unit: "sat",
		amount: "21",
		inputProofs: [
			{
				id: "proof-1",
				amount: 21,
				secret: "secret-1",
				C: "C-1",
			},
		],
		createdAt: 20,
		updatedAt: 30,
		state,
		source: { type: "manual-token" },
		fee: "1",
		outputData: { keep: [{ amount: 20 }] },
	};
}
