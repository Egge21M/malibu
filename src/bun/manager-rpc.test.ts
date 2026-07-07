import { describe, expect, it } from "bun:test";
import {
	createManagerEventForwarder,
	createManagerRpcRequestHandlers,
	type ManagerRpcManagerLike,
} from "./manager-rpc.ts";
import type {
	ManagerEventName,
	ManagerHistoryEntryDto,
	ManagerMeltOperationDto,
	ManagerMeltQuoteDto,
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

	it("maps melt quote and operation requests to the real manager surface", async () => {
		const calls: unknown[] = [];
		const manager = createFakeManager(calls);
		const handlers = createManagerRpcRequestHandlers(async () => manager);

		await expect(
			handlers.managerMeltQuoteCreate({
				mintUrl: "https://mint.example",
				method: "bolt11",
				methodData: { invoice: "lnbc1invoice", amountSats: "21" },
				unit: "sat",
			}),
		).resolves.toEqual(serializedMeltQuote("quote-1", "UNPAID"));
		await expect(
			handlers.managerMeltQuoteGet({
				mintUrl: "https://mint.example",
				quoteId: "quote-1",
			}),
		).resolves.toEqual(serializedMeltQuote("quote-1", "UNPAID"));
		await expect(
			handlers.managerMeltQuoteListPending({ method: "bolt11" }),
		).resolves.toEqual([serializedMeltQuote("quote-1", "UNPAID")]);
		await expect(
			handlers.managerMeltQuoteRefresh({
				mintUrl: "https://mint.example",
				quoteId: "quote-1",
			}),
		).resolves.toEqual(serializedMeltQuote("quote-1", "PENDING"));
		await expect(
			handlers.managerMeltPrepare({
				quote: {
					mintUrl: "https://mint.example",
					quoteId: "quote-1",
					method: "bolt11",
				},
				feeIndex: 0,
			}),
		).resolves.toEqual(serializedMeltOperation("melt-1", "prepared"));
		await expect(
			handlers.managerMeltExecute({ operationId: "melt-1" }),
		).resolves.toEqual(serializedMeltOperation("melt-1", "pending"));
		await expect(
			handlers.managerMeltGet({ operationId: "melt-1" }),
		).resolves.toEqual(serializedMeltOperation("melt-1", "pending"));
		await expect(
			handlers.managerMeltGetByQuote({
				mintUrl: "https://mint.example",
				quoteId: "quote-1",
			}),
		).resolves.toEqual(serializedMeltOperation("melt-1", "pending"));
		await expect(
			handlers.managerMeltListByQuote({
				mintUrl: "https://mint.example",
				quoteId: "quote-1",
			}),
		).resolves.toEqual([serializedMeltOperation("melt-1", "pending")]);
		await expect(handlers.managerMeltListPrepared()).resolves.toEqual([
			serializedMeltOperation("melt-1", "prepared"),
		]);
		await expect(handlers.managerMeltListInFlight()).resolves.toEqual([
			serializedMeltOperation("melt-1", "pending"),
		]);
		await expect(
			handlers.managerMeltRefresh({ operationId: "melt-1" }),
		).resolves.toEqual(serializedMeltOperation("melt-1", "finalized"));
		await handlers.managerMeltCancel({
			operationId: "melt-1",
			reason: "user cancelled",
		});
		await handlers.managerMeltReclaim({
			operationId: "melt-1",
			reason: "retry later",
		});
		await handlers.managerMeltFinalize({ operationId: "melt-1" });
		await handlers.managerMeltRecoveryRun();
		await expect(handlers.managerMeltRecoveryInProgress()).resolves.toBe(true);
		await expect(
			handlers.managerMeltDiagnosticsIsLocked({ operationId: "melt-1" }),
		).resolves.toBe(true);

		expect(calls).toEqual([
			[
				"meltQuote.create",
				{
					mintUrl: "https://mint.example",
					method: "bolt11",
					methodData: { invoice: "lnbc1invoice", amountSats: "21" },
					unit: "sat",
				},
			],
			[
				"meltQuote.get",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
			["meltQuote.listPending", { method: "bolt11" }],
			[
				"meltQuote.refresh",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
			[
				"melt.prepare",
				{
					quote: {
						mintUrl: "https://mint.example",
						quoteId: "quote-1",
						method: "bolt11",
					},
					feeIndex: 0,
				},
			],
			["melt.execute", "melt-1"],
			["melt.get", "melt-1"],
			[
				"melt.getByQuote",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
			[
				"melt.listByQuote",
				{ mintUrl: "https://mint.example", quoteId: "quote-1" },
			],
			["melt.listPrepared"],
			["melt.listInFlight"],
			["melt.refresh", "melt-1"],
			["melt.cancel", "melt-1", "user cancelled"],
			["melt.reclaim", "melt-1", "retry later"],
			["melt.finalize", "melt-1"],
			["melt.recovery.run"],
			["melt.recovery.inProgress"],
			["melt.diagnostics.isLocked", "melt-1"],
		]);
	});

	it("surfaces melt errors from the real manager", async () => {
		const handlers = createManagerRpcRequestHandlers(async () => ({
			...createFakeManager([]),
			ops: {
				...createFakeManager([]).ops,
				melt: {
					...createFakeManager([]).ops.melt,
					execute: async () => {
						throw new Error("remote melt failed");
					},
				},
			},
		}));

		await expect(
			handlers.managerMeltExecute({ operationId: "melt-1" }),
		).rejects.toThrow("remote melt failed");
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

	it("forwards subscribed melt lifecycle events with serialized payloads", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "melt-op:pending" });
		forwarder.subscribe({ event: "melt-quote:updated" });
		await Promise.resolve();

		manager.emit("melt-op:pending", {
			mintUrl: "https://mint.example",
			operationId: "melt-1",
			operation: rawMeltOperation("melt-1", "pending"),
		});
		manager.emit("melt-quote:updated", {
			mintUrl: "https://mint.example",
			method: "bolt11",
			quoteId: "quote-1",
			quote: rawMeltQuote("quote-1", "PENDING"),
		});
		forwarder.unsubscribe({ event: "melt-op:pending" });
		forwarder.unsubscribe({ event: "melt-quote:updated" });

		expect(emitted).toEqual([
			{
				event: "melt-op:pending",
				payload: {
					mintUrl: "https://mint.example",
					operationId: "melt-1",
					operation: serializedMeltOperation("melt-1", "pending"),
				},
			},
			{
				event: "melt-quote:updated",
				payload: {
					mintUrl: "https://mint.example",
					method: "bolt11",
					quoteId: "quote-1",
					quote: serializedMeltQuote("quote-1", "PENDING"),
				},
			},
		]);
		expect(calls).toEqual([
			["on", "melt-op:pending"],
			["on", "melt-quote:updated"],
			["off", "melt-op:pending"],
			["off", "melt-quote:updated"],
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
		quotes: {
			melt: {
				create: async (params: unknown) => {
					calls.push(["meltQuote.create", params]);
					return rawMeltQuote("quote-1", "UNPAID");
				},
				get: async (params: unknown) => {
					calls.push(["meltQuote.get", params]);
					return rawMeltQuote("quote-1", "UNPAID");
				},
				listPending: async (params?: unknown) => {
					calls.push(["meltQuote.listPending", params]);
					return [rawMeltQuote("quote-1", "UNPAID")];
				},
				refresh: async (params: unknown) => {
					calls.push(["meltQuote.refresh", params]);
					return rawMeltQuote("quote-1", "PENDING");
				},
			},
		},
		ops: {
			melt: {
				recovery: {
					run: async () => {
						calls.push(["melt.recovery.run"]);
					},
					inProgress: () => {
						calls.push(["melt.recovery.inProgress"]);
						return true;
					},
				},
				diagnostics: {
					isLocked: (operationId: string) => {
						calls.push(["melt.diagnostics.isLocked", operationId]);
						return operationId === "melt-1";
					},
				},
				prepare: async (params: unknown) => {
					calls.push(["melt.prepare", params]);
					return rawMeltOperation("melt-1", "prepared");
				},
				execute: async (operationId: string) => {
					calls.push(["melt.execute", operationId]);
					return rawMeltOperation("melt-1", "pending");
				},
				get: async (operationId: string) => {
					calls.push(["melt.get", operationId]);
					return rawMeltOperation("melt-1", "pending");
				},
				getByQuote: async (params: unknown) => {
					calls.push(["melt.getByQuote", params]);
					return rawMeltOperation("melt-1", "pending");
				},
				listByQuote: async (params: unknown) => {
					calls.push(["melt.listByQuote", params]);
					return [rawMeltOperation("melt-1", "pending")];
				},
				listPrepared: async () => {
					calls.push(["melt.listPrepared"]);
					return [rawMeltOperation("melt-1", "prepared")];
				},
				listInFlight: async () => {
					calls.push(["melt.listInFlight"]);
					return [rawMeltOperation("melt-1", "pending")];
				},
				refresh: async (operationId: string) => {
					calls.push(["melt.refresh", operationId]);
					return rawMeltOperation("melt-1", "finalized");
				},
				cancel: async (operationId: string, reason?: string) => {
					calls.push(["melt.cancel", operationId, reason]);
				},
				reclaim: async (operationId: string, reason?: string) => {
					calls.push(["melt.reclaim", operationId, reason]);
				},
				finalize: async (operationId: string) => {
					calls.push(["melt.finalize", operationId]);
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

function rawMeltQuote(quoteId: string, state: string) {
	return {
		mintUrl: "https://mint.example",
		method: "bolt11",
		quoteId,
		quote: quoteId,
		request: "lnbc1invoice",
		amount: amountLike("21"),
		unit: "sat",
		expiry: 1_700_000_000,
		state,
		fee_reserve: amountLike("1"),
		createdAt: 20,
		updatedAt: 21,
	};
}

function serializedMeltQuote(
	quoteId: string,
	state: string,
): ManagerMeltQuoteDto {
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
		createdAt: 20,
		updatedAt: 21,
	};
}

function rawMeltOperation(id: string, state: string) {
	return {
		id,
		mintUrl: "https://mint.example",
		method: "bolt11",
		methodData: { invoice: "lnbc1invoice" },
		unit: "sat",
		state,
		createdAt: 22,
		updatedAt: 23,
		quoteId: "quote-1",
		needsSwap: true,
		amount: amountLike("21"),
		fee_reserve: amountLike("1"),
		swap_fee: amountLike("0"),
		inputAmount: amountLike("22"),
		inputProofSecrets: ["secret-1"],
		changeOutputData: [],
	};
}

function serializedMeltOperation(
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
		createdAt: 22,
		updatedAt: 23,
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

function amountLike(value: string) {
	return {
		toJSON: () => value,
		toString: () => value,
	};
}
