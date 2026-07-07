import { describe, expect, it } from "bun:test";
import {
	createManagerEventForwarder,
	createManagerRpcRequestHandlers,
	type ManagerRpcManagerLike,
} from "./manager-rpc.ts";
import type {
	ManagerEventName,
	ManagerHistoryEntryDto,
	ManagerMintOperationDto,
} from "../mainview/lib/manager-rpc.ts";

describe("manager RPC handlers", () => {
	it("maps mint requests to a manager-like object and serializes responses", async () => {
		const calls: unknown[] = [];
		const manager = createFakeManager(calls);
		const handlers = createManagerRpcRequestHandlers(async () => manager);

		await expect(handlers.managerMintGetAllMints()).resolves.toEqual([
			serializedMint("https://mint.example"),
		]);
		await expect(
			handlers.managerMintAddMint({
				mintUrl: "https://mint.example",
				options: { trusted: true },
			}),
		).resolves.toEqual({
			mint: serializedMint("https://mint.example"),
			keysets: [serializedKeyset("https://mint.example")],
		});
		await handlers.managerMintTrustMint({ mintUrl: "https://mint.example" });
		await handlers.managerMintUntrustMint({ mintUrl: "https://mint.example" });
		await expect(
			handlers.managerMintIsTrustedMint({ mintUrl: "https://mint.example" }),
		).resolves.toBe(true);
		await expect(
			handlers.managerWalletBalancesByMint({
				mintUrls: ["https://mint.example"],
				units: ["sat"],
				trustedOnly: true,
			}),
		).resolves.toEqual({
			"https://mint.example": serializedBalance("sat"),
		});
		await expect(
			handlers.managerWalletBalancesByMintAndUnit({
				mintUrls: ["https://mint.example"],
				units: ["sat"],
				trustedOnly: true,
			}),
		).resolves.toEqual({
			"https://mint.example": {
				sat: serializedBalance("sat"),
			},
		});
		await expect(
			handlers.managerWalletBalancesByUnit({
				mintUrls: ["https://mint.example"],
				units: ["sat"],
				trustedOnly: true,
			}),
		).resolves.toEqual({
			sat: serializedBalance("sat"),
		});
		await expect(
			handlers.managerWalletBalancesTotal({
				mintUrls: ["https://mint.example"],
				units: ["sat"],
				trustedOnly: true,
			}),
		).resolves.toEqual(serializedBalance("sat"));
		await expect(
			handlers.managerWalletBalancesTotalByUnit({
				mintUrls: ["https://mint.example"],
				units: ["sat"],
				trustedOnly: true,
			}),
		).resolves.toEqual({
			sat: serializedBalance("sat"),
		});
		await expect(
			handlers.managerHistoryGetPaginatedHistory({ offset: 10, limit: 5 }),
		).resolves.toEqual([serializedHistoryEntry("history-1", "123")]);
		await expect(
			handlers.managerMintOpsPrepare({
				quote: {
					mintUrl: "https://mint.example",
					method: "bolt11",
					quoteId: "quote-1",
				},
				amount: "5",
			}),
		).resolves.toEqual(serializedMintOperation("mint-op-1", "pending", "5"));
		await expect(
			handlers.managerMintOpsRefresh({ operationId: "mint-op-1" }),
		).resolves.toEqual(serializedMintOperation("mint-op-1", "pending", "6"));
		await expect(
			handlers.managerMintOpsExecute({ operationId: "mint-op-1" }),
		).resolves.toEqual(serializedMintOperation("mint-op-1", "executing", "7"));
		await expect(
			handlers.managerMintOpsCheckPayment({ operationId: "mint-op-1" }),
		).resolves.toEqual({
			category: "ready",
			observedRemoteState: "PAID",
			observedRemoteStateAt: 12,
			quoteSnapshot: {
				amount: "8",
				quoteData: {
					amountPaid: "8",
					amountIssued: "0",
				},
			},
		});
		await expect(
			handlers.managerMintOpsFinalize({ operationId: "mint-op-1" }),
		).resolves.toEqual(serializedMintOperation("mint-op-1", "finalized", "9"));
		await expect(
			handlers.managerMintOpsGet({ operationId: "mint-op-1" }),
		).resolves.toEqual(serializedMintOperation("mint-op-1", "pending", "10"));
		await expect(
			handlers.managerMintOpsListByQuote({
				mintUrl: "https://mint.example",
				quoteId: "quote-1",
			}),
		).resolves.toEqual([
			serializedMintOperation("mint-op-1", "pending", "11"),
		]);
		await expect(handlers.managerMintOpsListPending()).resolves.toEqual([
			serializedMintOperation("mint-op-1", "pending", "12"),
		]);
		await expect(handlers.managerMintOpsListInFlight()).resolves.toEqual([
			serializedMintOperation("mint-op-1", "executing", "13"),
		]);

		expect(calls).toEqual([
			["getAllMints"],
			["addMint", "https://mint.example", { trusted: true }],
			["trustMint", "https://mint.example"],
			["untrustMint", "https://mint.example"],
			["isTrustedMint", "https://mint.example"],
			[
				"balances.byMint",
				{
					mintUrls: ["https://mint.example"],
					units: ["sat"],
					trustedOnly: true,
				},
			],
			[
				"balances.byMintAndUnit",
				{
					mintUrls: ["https://mint.example"],
					units: ["sat"],
					trustedOnly: true,
				},
			],
			[
				"balances.byUnit",
				{
					mintUrls: ["https://mint.example"],
					units: ["sat"],
					trustedOnly: true,
				},
			],
			[
				"balances.total",
				{
					mintUrls: ["https://mint.example"],
					units: ["sat"],
					trustedOnly: true,
				},
			],
			[
				"balances.totalByUnit",
				{
					mintUrls: ["https://mint.example"],
					units: ["sat"],
					trustedOnly: true,
				},
			],
			["getPaginatedHistory", 10, 5],
			[
				"mintOps.prepare",
				{
					quote: {
						mintUrl: "https://mint.example",
						method: "bolt11",
						quoteId: "quote-1",
					},
					amount: "5",
				},
			],
			["mintOps.refresh", "mint-op-1"],
			["mintOps.execute", "mint-op-1"],
			["mintOps.checkPayment", "mint-op-1"],
			["mintOps.finalize", "mint-op-1"],
			["mintOps.get", "mint-op-1"],
			[
				"mintOps.listByQuote",
				{
					mintUrl: "https://mint.example",
					quoteId: "quote-1",
				},
			],
			["mintOps.listPending"],
			["mintOps.listInFlight"],
		]);
	});

	it("forwards subscribed mint manager events and disposes event subscriptions", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "mint:updated" });
		await Promise.resolve();

		manager.emit("mint:updated", {
			mint: rawMint("https://mint.example"),
			keysets: [rawKeyset("https://mint.example")],
		});
		manager.emit("mint:trusted", { mintUrl: "https://mint.example" });
		forwarder.unsubscribe({ event: "mint:updated" });
		manager.emit("mint:updated", {
			mint: rawMint("https://mint.example/ignored"),
			keysets: [],
		});

		expect(emitted).toEqual([
			{
				event: "mint:updated",
				payload: {
					mint: serializedMint("https://mint.example"),
					keysets: [serializedKeyset("https://mint.example")],
				},
			},
		]);
		expect(calls).toEqual([
			["on", "mint:updated"],
			["off", "mint:updated"],
		]);
	});

	it("forwards subscribed proof balance refresh events with serializable amounts", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "proofs:reserved" });
		await Promise.resolve();

		manager.emit("proofs:reserved", {
			mintUrl: "https://mint.example",
			operationId: "op-1",
			secrets: ["secret-1"],
			amount: { amount: amountLike("5"), unit: "sat" },
		});
		forwarder.unsubscribe({ event: "proofs:reserved" });

		expect(emitted).toEqual([
			{
				event: "proofs:reserved",
				payload: {
					mintUrl: "https://mint.example",
					operationId: "op-1",
					secrets: ["secret-1"],
					amount: { amount: "5", unit: "sat" },
				},
			},
		]);
		expect(JSON.stringify(emitted)).toBe(
			'[{"event":"proofs:reserved","payload":{"mintUrl":"https://mint.example","operationId":"op-1","secrets":["secret-1"],"amount":{"amount":"5","unit":"sat"}}}]',
		);
		expect(calls).toEqual([
			["on", "proofs:reserved"],
			["off", "proofs:reserved"],
		]);
	});

	it("forwards subscribed history manager events with serialized entries", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "history:updated" });
		await Promise.resolve();

		manager.emit("history:updated", {
			mintUrl: "https://mint.example",
			entry: rawHistoryEntry("history-2", 456n),
		});
		forwarder.unsubscribe({ event: "history:updated" });
		manager.emit("history:updated", {
			mintUrl: "https://mint.example",
			entry: rawHistoryEntry("history-ignored", 1n),
		});

		expect(emitted).toEqual([
			{
				event: "history:updated",
				payload: {
					mintUrl: "https://mint.example",
					entry: serializedHistoryEntry("history-2", "456"),
				},
			},
		]);
		expect(calls).toEqual([
			["on", "history:updated"],
			["off", "history:updated"],
		]);
	});

	it("forwards subscribed mint operation events with serialized amounts", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "mint-op:pending" });
		await Promise.resolve();

		manager.emit("mint-op:pending", {
			mintUrl: "https://mint.example",
			operationId: "mint-op-1",
			operation: rawMintOperation("mint-op-1", "pending", amountLike("21")),
		});
		forwarder.unsubscribe({ event: "mint-op:pending" });
		manager.emit("mint-op:pending", {
			mintUrl: "https://mint.example",
			operationId: "mint-op-ignored",
			operation: rawMintOperation("mint-op-ignored", "pending", amountLike("1")),
		});

		expect(emitted).toEqual([
			{
				event: "mint-op:pending",
				payload: {
					mintUrl: "https://mint.example",
					operationId: "mint-op-1",
					operation: serializedMintOperation("mint-op-1", "pending", "21"),
				},
			},
		]);
		expect(calls).toEqual([
			["on", "mint-op:pending"],
			["off", "mint-op:pending"],
		]);
	});

	it("surfaces manager mint operation errors through rejected handlers", async () => {
		const manager = createFakeManager([]);
		manager.ops.mint.finalize = async () => {
			throw new Error("Mint quote expired");
		};
		const handlers = createManagerRpcRequestHandlers(async () => manager);

		await expect(
			handlers.managerMintOpsFinalize({ operationId: "mint-op-1" }),
		).rejects.toThrow("Mint quote expired");
	});

	it("keeps one manager event subscription for multiple renderer listeners", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "mint:trusted" });
		forwarder.subscribe({ event: "mint:trusted" });
		await Promise.resolve();
		forwarder.unsubscribe({ event: "mint:trusted" });
		manager.emit("mint:trusted", { mintUrl: "https://mint.example" });
		forwarder.unsubscribe({ event: "mint:trusted" });
		manager.emit("mint:trusted", { mintUrl: "https://mint.example/ignored" });

		expect(emitted).toEqual([
			{
				event: "mint:trusted",
				payload: { mintUrl: "https://mint.example" },
			},
		]);
		expect(calls).toEqual([
			["on", "mint:trusted"],
			["off", "mint:trusted"],
		]);
	});
});

function createFakeManager(calls: unknown[]) {
	const listeners = new Map<ManagerEventName, Set<(payload: never) => void>>();
	const manager = {
		mint: {
			getAllMints: async () => {
				calls.push(["getAllMints"]);
				return [rawMint("https://mint.example")];
			},
			addMint: async (mintUrl: string, options?: { trusted?: boolean }) => {
				calls.push(["addMint", mintUrl, options]);
				return {
					mint: rawMint(mintUrl),
					keysets: [rawKeyset(mintUrl)],
				};
			},
			trustMint: async (mintUrl: string) => {
				calls.push(["trustMint", mintUrl]);
			},
			untrustMint: async (mintUrl: string) => {
				calls.push(["untrustMint", mintUrl]);
			},
			isTrustedMint: async (mintUrl: string) => {
				calls.push(["isTrustedMint", mintUrl]);
				return true;
			},
		},
		wallet: {
			balances: {
				byMint: async (scope?: unknown) => {
					calls.push(["balances.byMint", scope]);
					return {
						"https://mint.example": rawBalance("sat"),
					};
				},
				byMintAndUnit: async (scope?: unknown) => {
					calls.push(["balances.byMintAndUnit", scope]);
					return {
						"https://mint.example": {
							sat: rawBalance("sat"),
						},
					};
				},
				byUnit: async (scope?: unknown) => {
					calls.push(["balances.byUnit", scope]);
					return {
						sat: rawBalance("sat"),
					};
				},
				total: async (scope?: unknown) => {
					calls.push(["balances.total", scope]);
					return rawBalance("sat");
				},
				totalByUnit: async (scope?: unknown) => {
					calls.push(["balances.totalByUnit", scope]);
					return {
						sat: rawBalance("sat"),
					};
				},
			},
		},
		history: {
			getPaginatedHistory: async (offset?: number, limit?: number) => {
				calls.push(["getPaginatedHistory", offset, limit]);
				return [rawHistoryEntry("history-1", 123n)];
			},
		},
		ops: {
			mint: {
				prepare: async (input: unknown) => {
					calls.push(["mintOps.prepare", input]);
					return rawMintOperation("mint-op-1", "pending", amountLike("5"));
				},
				refresh: async (operationId: string) => {
					calls.push(["mintOps.refresh", operationId]);
					return rawMintOperation("mint-op-1", "pending", amountLike("6"));
				},
				execute: async (operationOrId: unknown) => {
					calls.push(["mintOps.execute", operationOrId]);
					return rawMintOperation("mint-op-1", "executing", amountLike("7"));
				},
				checkPayment: async (operationId: string) => {
					calls.push(["mintOps.checkPayment", operationId]);
					return {
						category: "ready",
						observedRemoteState: "PAID",
						observedRemoteStateAt: 12,
						quoteSnapshot: {
							amount: amountLike("8"),
							quoteData: {
								amountPaid: amountLike("8"),
								amountIssued: amountLike("0"),
							},
						},
					};
				},
				finalize: async (operationId: string) => {
					calls.push(["mintOps.finalize", operationId]);
					return rawMintOperation("mint-op-1", "finalized", amountLike("9"));
				},
				get: async (operationId: string) => {
					calls.push(["mintOps.get", operationId]);
					return rawMintOperation("mint-op-1", "pending", amountLike("10"));
				},
				listByQuote: async (params: unknown) => {
					calls.push(["mintOps.listByQuote", params]);
					return [rawMintOperation("mint-op-1", "pending", amountLike("11"))];
				},
				listPending: async () => {
					calls.push(["mintOps.listPending"]);
					return [rawMintOperation("mint-op-1", "pending", amountLike("12"))];
				},
				listInFlight: async () => {
					calls.push(["mintOps.listInFlight"]);
					return [
						rawMintOperation("mint-op-1", "executing", amountLike("13")),
					];
				},
			},
		},
		on<TEventName extends ManagerEventName>(
			event: TEventName,
			handler: (payload: unknown) => void,
		) {
			calls.push(["on", event]);
			const eventListeners = listeners.get(event) ?? new Set();
			eventListeners.add(handler as (payload: never) => void);
			listeners.set(event, eventListeners);
			return () => {
				calls.push(["off", event]);
				eventListeners.delete(handler as (payload: never) => void);
			};
		},
		emit<TEventName extends ManagerEventName>(
			event: TEventName,
			payload: unknown,
		) {
			for (const listener of listeners.get(event) ?? []) {
				listener(payload as never);
			}
		},
	};

	return manager satisfies ManagerRpcManagerLike & {
		emit: <TEventName extends ManagerEventName>(
			event: TEventName,
			payload: unknown,
		) => void;
	};
}

function rawMint(mintUrl: string) {
	return {
		mintUrl,
		name: "",
		mintInfo: { nuts: {} },
		trusted: true,
		createdAt: 1,
		updatedAt: 2,
	};
}

function serializedMint(mintUrl: string) {
	return {
		mintUrl,
		name: mintUrl,
		mintInfo: { nuts: {} },
		trusted: true,
		createdAt: 1,
		updatedAt: 2,
	};
}

function rawKeyset(mintUrl: string) {
	return {
		mintUrl,
		id: "keyset-1",
		unit: "sat",
		keypairs: {},
		active: true,
		feePpk: 0,
		updatedAt: 3,
	};
}

function serializedKeyset(mintUrl: string) {
	return {
		mintUrl,
		id: "keyset-1",
		unit: "sat",
		keypairs: {},
		active: true,
		feePpk: 0,
		updatedAt: 3,
	};
}

function rawBalance(unit: string) {
	return {
		spendable: amountLike("5"),
		reserved: amountLike("1"),
		total: amountLike("6"),
		unit,
	};
}

function serializedBalance(unit: string) {
	return {
		spendable: "5",
		reserved: "1",
		total: "6",
		unit,
	};
}

function rawHistoryEntry(id: string, amount: unknown) {
	return {
		id,
		type: "send" as const,
		source: "operation" as const,
		operationId: "send-1",
		state: "finalized",
		mintUrl: "https://mint.example",
		unit: "sat",
		amount,
		metadata: { memo: "remote history" },
		token: { token: [{ mint: "https://mint.example", proofs: [] }] },
		createdAt: 10,
		updatedAt: 11,
	};
}

function serializedHistoryEntry(
	id: string,
	amount: string,
): ManagerHistoryEntryDto {
	return {
		id,
		type: "send",
		source: "operation",
		operationId: "send-1",
		state: "finalized",
		mintUrl: "https://mint.example",
		unit: "sat",
		amount,
		metadata: { memo: "remote history" },
		error: undefined,
		legacyHistoryId: undefined,
		paymentRequest: undefined,
		quoteId: undefined,
		remoteState: undefined,
		token: { token: [{ mint: "https://mint.example", proofs: [] }] },
		createdAt: 10,
		updatedAt: 11,
	};
}

function rawMintOperation(
	id: string,
	state: string,
	amount: unknown,
) {
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

function serializedMintOperation(
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

function amountLike(value: string) {
	return {
		toJSON: () => value,
		toString: () => value,
	};
}
