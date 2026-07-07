import { describe, expect, it } from "bun:test";
import {
	createManagerEventForwarder,
	createManagerRpcRequestHandlers,
	type ManagerRpcManagerLike,
} from "./manager-rpc.ts";
import type {
	ManagerEventName,
	ManagerHistoryEntryDto,
	ManagerSendOperationDto,
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

	it("maps send operation requests and preserves execution token payloads", async () => {
		const calls: unknown[] = [];
		const manager = createFakeManager(calls);
		const handlers = createManagerRpcRequestHandlers(async () => manager);

		await expect(
			handlers.managerSendPrepare({
				mintUrl: "https://mint.example",
				amount: "21",
				unit: "sat",
				target: { pubkey: "02abc" },
			}),
		).resolves.toEqual(serializedSendOperation("send-1", "prepared"));
		await expect(
			handlers.managerSendExecute({
				operationId: "send-1",
				options: { memo: "for coffee" },
			}),
		).resolves.toEqual({
			operation: serializedSendOperation("send-1", "pending", {
				token: rawToken("send-1"),
			}),
			token: rawToken("send-1"),
		});
		await expect(
			handlers.managerSendGet({ operationId: "send-1" }),
		).resolves.toEqual(
			serializedSendOperation("send-1", "pending", {
				token: rawToken("send-1"),
			}),
		);
		await expect(handlers.managerSendListPrepared()).resolves.toEqual([
			serializedSendOperation("send-1", "prepared"),
		]);
		await expect(handlers.managerSendListInFlight()).resolves.toEqual([
			serializedSendOperation("send-2", "pending", {
				token: rawToken("send-2"),
			}),
		]);
		await expect(
			handlers.managerSendRefresh({ operationId: "send-1" }),
		).resolves.toEqual(
			serializedSendOperation("send-1", "finalized", {
				token: rawToken("send-1"),
			}),
		);
		await handlers.managerSendCancel({ operationId: "send-1" });
		await handlers.managerSendReclaim({ operationId: "send-1" });
		await handlers.managerSendFinalize({ operationId: "send-1" });

		expect(calls).toEqual([
			[
				"send.prepare",
				{
					mintUrl: "https://mint.example",
					amount: "21",
					unit: "sat",
					target: { pubkey: "02abc" },
				},
			],
			["send.execute", "send-1", { memo: "for coffee" }],
			["send.get", "send-1"],
			["send.listPrepared"],
			["send.listInFlight"],
			["send.refresh", "send-1"],
			["send.cancel", "send-1"],
			["send.reclaim", "send-1"],
			["send.finalize", "send-1"],
		]);
	});

	it("forwards subscribed send lifecycle events with serialized operations", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "send:pending" });
		await Promise.resolve();

		manager.emit("send:pending", {
			mintUrl: "https://mint.example",
			operationId: "send-1",
			operation: rawSendOperation("send-1", "pending", {
				token: rawToken("send-1"),
			}),
			token: rawToken("send-1"),
		});
		forwarder.unsubscribe({ event: "send:pending" });
		manager.emit("send:pending", {
			mintUrl: "https://mint.example",
			operationId: "send-ignored",
			operation: rawSendOperation("send-ignored", "pending"),
			token: rawToken("send-ignored"),
		});

		expect(emitted).toEqual([
			{
				event: "send:pending",
				payload: {
					mintUrl: "https://mint.example",
					operationId: "send-1",
					operation: serializedSendOperation("send-1", "pending", {
						token: rawToken("send-1"),
					}),
					token: rawToken("send-1"),
				},
			},
		]);
		expect(JSON.stringify(emitted)).toContain('"amount":"21"');
		expect(calls).toEqual([
			["on", "send:pending"],
			["off", "send:pending"],
		]);
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
			send: {
				prepare: async (input: unknown) => {
					calls.push(["send.prepare", input]);
					return rawSendOperation("send-1", "prepared");
				},
				execute: async (operationId: string, options?: unknown) => {
					calls.push(["send.execute", operationId, options]);
					return {
						operation: rawSendOperation(operationId, "pending", {
							token: rawToken(operationId),
						}),
						token: rawToken(operationId),
					};
				},
				get: async (operationId: string) => {
					calls.push(["send.get", operationId]);
					return rawSendOperation(operationId, "pending", {
						token: rawToken(operationId),
					});
				},
				listPrepared: async () => {
					calls.push(["send.listPrepared"]);
					return [rawSendOperation("send-1", "prepared")];
				},
				listInFlight: async () => {
					calls.push(["send.listInFlight"]);
					return [
						rawSendOperation("send-2", "pending", {
							token: rawToken("send-2"),
						}),
					];
				},
				refresh: async (operationId: string) => {
					calls.push(["send.refresh", operationId]);
					return rawSendOperation(operationId, "finalized", {
						token: rawToken(operationId),
					});
				},
				cancel: async (operationId: string) => {
					calls.push(["send.cancel", operationId]);
				},
				reclaim: async (operationId: string) => {
					calls.push(["send.reclaim", operationId]);
				},
				finalize: async (operationId: string) => {
					calls.push(["send.finalize", operationId]);
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

function rawSendOperation(
	id: string,
	state: ManagerSendOperationDto["state"],
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		mintUrl: "https://mint.example",
		amount: amountLike("21"),
		unit: "sat",
		method: "default",
		methodData: {},
		state,
		needsSwap: true,
		fee: amountLike("1"),
		inputAmount: amountLike("22"),
		inputProofSecrets: ["secret-1"],
		outputData: { outputs: [] },
		createdAt: 12,
		updatedAt: 13,
		...overrides,
	};
}

function serializedSendOperation(
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

function rawToken(operationId: string) {
	return {
		token: [
			{
				mint: "https://mint.example",
				proofs: [{ id: operationId, amount: 21 }],
			},
		],
	};
}

function amountLike(value: string) {
	return {
		toJSON: () => value,
		toString: () => value,
	};
}
