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
	ManagerMintOperationDto,
	ManagerMintQuoteDto,
	ManagerPreparedReceiveOperationDto,
	ManagerReceiveOperationDto,
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
			await expect(
				handlers.managerMintQuoteCreate({
					mintUrl: "https://mint.example",
					method: "bolt11",
					amount: {
						amount: "21",
						unit: "sat",
					},
				}),
			).resolves.toEqual(serializedMintQuote("quote-1"));
			await expect(
				handlers.managerMintQuoteListPending({ method: "bolt11" }),
			).resolves.toEqual([serializedMintQuote("quote-1")]);
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
					"mintQuote.create",
					{
						mintUrl: "https://mint.example",
						method: "bolt11",
						amount: {
							amount: "21",
							unit: "sat",
						},
					},
				],
				["mintQuote.listPending", { method: "bolt11" }],
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

	it("maps wallet restore requests to the manager wallet API", async () => {
		const calls: unknown[] = [];
		const manager = createFakeManager(calls);
		const handlers = createManagerRpcRequestHandlers(async () => manager);

		await handlers.managerWalletRestore({
			mintUrl: "https://mint.example",
			options: { units: ["sat"] },
		});

		expect(calls).toEqual([
			["wallet.restore", "https://mint.example", { units: ["sat"] }],
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

	it("maps receive operation requests and serializes prepared results", async () => {
		const calls: unknown[] = [];
		const manager = createFakeManager(calls);
		const handlers = createManagerRpcRequestHandlers(async () => manager);

		await expect(
			handlers.managerReceivePrepare({ token: "cashuA..." }),
		).resolves.toEqual(
			serializedPreparedReceiveOperation("receive-1", {
				fee: "1",
				outputData: { outputs: [] },
			}),
		);
		await expect(
			handlers.managerReceiveExecute({ operationId: "receive-1" }),
		).resolves.toEqual(serializedReceiveOperation("receive-1", "finalized"));
		await expect(
			handlers.managerReceiveGet({ operationId: "receive-1" }),
		).resolves.toEqual(
			serializedPreparedReceiveOperation("receive-1", {
				fee: "1",
				outputData: { outputs: [] },
			}),
		);
		await expect(
			handlers.managerReceiveRefresh({ operationId: "receive-1" }),
		).resolves.toEqual(serializedReceiveOperation("receive-1", "executing"));
		await handlers.managerReceiveCancel({
			operationId: "receive-1",
			reason: "user",
		});
		await expect(handlers.managerReceiveListPrepared()).resolves.toEqual([
			serializedPreparedReceiveOperation("receive-1", {
				fee: "1",
				outputData: { outputs: [] },
			}),
		]);
		await expect(handlers.managerReceiveListInFlight()).resolves.toEqual([
			serializedReceiveOperation("receive-2", "executing"),
		]);

		expect(calls).toEqual([
			["receive.prepare", { token: "cashuA..." }],
			["receive.execute", "receive-1"],
			["receive.get", "receive-1"],
			["receive.refresh", "receive-1"],
			["receive.cancel", "receive-1", "user"],
			["receive.listPrepared"],
			["receive.listInFlight"],
		]);
	});

	it("forwards subscribed receive lifecycle events with serialized operations", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "receive-op:prepared" });
		await Promise.resolve();

		manager.emit("receive-op:prepared", {
			mintUrl: "https://mint.example",
			operationId: "receive-1",
			operation: rawReceiveOperation("receive-1", "prepared", {
				fee: amountLike("1"),
				outputData: { outputs: [] },
			}),
		});
		forwarder.unsubscribe({ event: "receive-op:prepared" });

		expect(emitted).toEqual([
			{
				event: "receive-op:prepared",
				payload: {
					mintUrl: "https://mint.example",
					operationId: "receive-1",
					operation: serializedReceiveOperation("receive-1", "prepared", {
						fee: "1",
						outputData: { outputs: [] },
					}),
				},
			},
		]);
		expect(calls).toEqual([
			["on", "receive-op:prepared"],
			["off", "receive-op:prepared"],
		]);
	});

	it("maps melt quote and operation requests with path-specific amount serialization", async () => {
		const calls: unknown[] = [];
		const manager = createFakeManager(calls);
		const handlers = createManagerRpcRequestHandlers(async () => manager);
		const quoteRef = { mintUrl: "https://mint.example", quoteId: "quote-1" };

		await expect(
			handlers.managerMeltQuoteCreate({
				mintUrl: "https://mint.example",
				method: "bolt11",
				methodData: { request: "lnbc1...", amountSats: "55" },
				unit: "sat",
			}),
		).resolves.toEqual(serializedMeltQuote("quote-1"));
		await expect(handlers.managerMeltQuoteGet(quoteRef)).resolves.toEqual(
			serializedMeltQuote("quote-1"),
		);
		await expect(
			handlers.managerMeltQuoteListPending({ method: "bolt11" }),
		).resolves.toEqual([serializedMeltQuote("quote-1")]);
		await expect(handlers.managerMeltQuoteRefresh(quoteRef)).resolves.toEqual(
			serializedMeltQuote("quote-1", { state: "PAID" }),
		);
		await expect(
			handlers.managerMeltPrepare({
				quote: { ...quoteRef, method: "bolt11" },
			}),
		).resolves.toEqual(serializedMeltOperation("melt-1", "prepared"));
		await expect(
			handlers.managerMeltExecute({ operationId: "melt-1" }),
		).resolves.toEqual(serializedMeltOperation("melt-1", "pending"));
		await expect(handlers.managerMeltGet({ operationId: "melt-1" })).resolves.toEqual(
			serializedMeltOperation("melt-1", "pending"),
		);
		await expect(handlers.managerMeltGetByQuote(quoteRef)).resolves.toEqual(
			serializedMeltOperation("melt-1", "pending"),
		);
		await expect(handlers.managerMeltListByQuote(quoteRef)).resolves.toEqual([
			serializedMeltOperation("melt-1", "pending"),
		]);
		await expect(handlers.managerMeltListPrepared()).resolves.toEqual([
			serializedMeltOperation("melt-1", "prepared"),
		]);
		await expect(handlers.managerMeltListInFlight()).resolves.toEqual([
			serializedMeltOperation("melt-2", "pending"),
		]);
		await expect(
			handlers.managerMeltRefresh({ operationId: "melt-1" }),
		).resolves.toEqual(serializedMeltOperation("melt-1", "finalized"));
		await handlers.managerMeltCancel({ operationId: "melt-1", reason: "user" });
		await handlers.managerMeltReclaim({ operationId: "melt-1", reason: "retry" });
		await handlers.managerMeltFinalize({ operationId: "melt-1" });

		expect(
			(
				(await handlers.managerMeltGet({ operationId: "melt-1" }))
					?.methodData as Record<string, unknown>
			).changeOutputData,
		).toEqual([{ blindedMessage: { amount: 123 } }]);
		expect(calls).toContainEqual(["melt.cancel", "melt-1", "user"]);
		expect(calls).toContainEqual(["melt.reclaim", "melt-1", "retry"]);
		expect(calls).toContainEqual(["melt.finalize", "melt-1"]);
	});

	it("forwards subscribed melt lifecycle events with serialized operations", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerEventForwarder(
			async () => manager,
			(event) => emitted.push(event),
		);

		forwarder.subscribe({ event: "melt-op:prepared" });
		await Promise.resolve();

		manager.emit("melt-op:prepared", {
			mintUrl: "https://mint.example",
			operationId: "melt-1",
			operation: rawMeltOperation("melt-1", "prepared"),
		});
		forwarder.unsubscribe({ event: "melt-op:prepared" });

		expect(emitted).toEqual([
			{
				event: "melt-op:prepared",
				payload: {
					mintUrl: "https://mint.example",
					operationId: "melt-1",
					operation: serializedMeltOperation("melt-1", "prepared"),
				},
			},
		]);
		expect(calls).toEqual([
			["on", "melt-op:prepared"],
			["off", "melt-op:prepared"],
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
			restore: async (mintUrl: string, options?: { units?: string[] }) => {
				calls.push(["wallet.restore", mintUrl, options]);
			},
		},
			history: {
				getPaginatedHistory: async (offset?: number, limit?: number) => {
					calls.push(["getPaginatedHistory", offset, limit]);
					return [rawHistoryEntry("history-1", 123n)];
				},
			},
				quotes: {
					mint: {
						create: async (params: unknown) => {
							calls.push(["mintQuote.create", params]);
							return rawMintQuote("quote-1");
						},
						listPending: async (params?: unknown) => {
							calls.push(["mintQuote.listPending", params]);
							return [rawMintQuote("quote-1")];
						},
					},
					melt: {
						create: async (params: unknown) => {
							calls.push(["meltQuote.create", params]);
						return rawMeltQuote("quote-1");
					},
					get: async (params: unknown) => {
						calls.push(["meltQuote.get", params]);
						return rawMeltQuote("quote-1");
					},
					listPending: async (params?: unknown) => {
						calls.push(["meltQuote.listPending", params]);
						return [rawMeltQuote("quote-1")];
					},
					refresh: async (params: unknown) => {
						calls.push(["meltQuote.refresh", params]);
						return rawMeltQuote("quote-1", { state: "PAID" });
					},
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
				receive: {
				prepare: async (params: unknown) => {
					calls.push(["receive.prepare", params]);
					return rawReceiveOperation("receive-1", "prepared", {
						fee: amountLike("1"),
						outputData: { outputs: [] },
					}) as RawPreparedReceiveOperation;
				},
				execute: async (operationId: string) => {
					calls.push(["receive.execute", operationId]);
					return rawReceiveOperation(operationId, "finalized");
				},
				get: async (operationId: string) => {
					calls.push(["receive.get", operationId]);
					return rawReceiveOperation(operationId, "prepared", {
						fee: amountLike("1"),
						outputData: { outputs: [] },
					});
				},
				refresh: async (operationId: string) => {
					calls.push(["receive.refresh", operationId]);
					return rawReceiveOperation(operationId, "executing");
				},
				cancel: async (operationId: string, reason?: string) => {
					calls.push(["receive.cancel", operationId, reason]);
				},
				listPrepared: async () => {
					calls.push(["receive.listPrepared"]);
					return [
						rawReceiveOperation("receive-1", "prepared", {
							fee: amountLike("1"),
							outputData: { outputs: [] },
						}) as RawPreparedReceiveOperation,
					];
				},
				listInFlight: async () => {
					calls.push(["receive.listInFlight"]);
					return [rawReceiveOperation("receive-2", "executing")];
				},
			},
			melt: {
				prepare: async (params: unknown) => {
					calls.push(["melt.prepare", params]);
					return rawMeltOperation("melt-1", "prepared");
				},
				execute: async (operationId: string) => {
					calls.push(["melt.execute", operationId]);
					return rawMeltOperation(operationId, "pending");
				},
				get: async (operationId: string) => {
					calls.push(["melt.get", operationId]);
					return rawMeltOperation(operationId, "pending");
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
					return [rawMeltOperation("melt-2", "pending")];
				},
				refresh: async (operationId: string) => {
					calls.push(["melt.refresh", operationId]);
					return rawMeltOperation(operationId, "finalized");
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

function rawReceiveOperation<TState extends ManagerReceiveOperationDto["state"]>(
	id: string,
	state: TState,
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		mintUrl: "https://mint.example",
		unit: "sat",
		amount: amountLike("34"),
		inputProofs: [{ secret: "secret-1" }],
		createdAt: 14,
		updatedAt: 15,
		state,
		source: { type: "manual-token" as const },
		...overrides,
	};
}

type RawPreparedReceiveOperation = ReturnType<
	typeof rawReceiveOperation<"prepared">
> & {
	fee: unknown;
	outputData: unknown;
};

function serializedReceiveOperation(
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

function serializedPreparedReceiveOperation(
	id: string,
	overrides: Partial<ManagerPreparedReceiveOperationDto> = {},
): ManagerPreparedReceiveOperationDto {
	return {
		...serializedReceiveOperation(id, "prepared"),
		fee: "1",
		outputData: { outputs: [] },
		...overrides,
		state: "prepared",
	};
}

function rawMintQuote(quoteId: string, overrides: Record<string, unknown> = {}) {
	return {
		mintUrl: "https://mint.example",
		method: "bolt11",
		quoteId,
		request: "lnbc1...",
		amount: amountLike("21"),
		unit: "sat",
		expiry: 123,
		state: "UNPAID",
		createdAt: 18,
		updatedAt: 19,
		...overrides,
	};
}

function serializedMintQuote(
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

function rawMeltQuote(
	quoteId: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		mintUrl: "https://mint.example",
		method: "bolt11",
		quoteId,
		request: "lnbc1...",
		amount: amountLike("55"),
		unit: "sat",
		expiry: 123,
		state: "UNPAID",
		fee_reserve: amountLike("2"),
		fee_options: [{ fee_reserve: amountLike("2"), label: "fast" }],
		createdAt: 16,
		updatedAt: 17,
		...overrides,
	};
}

function serializedMeltQuote(
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

function rawMeltOperation(
	id: string,
	state: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		id,
		mintUrl: "https://mint.example",
		method: "bolt11",
		methodData: {
			amountSats: amountLike("55"),
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
		amount: amountLike("55"),
		fee_reserve: amountLike("2"),
		swap_fee: amountLike("1"),
		inputAmount: amountLike("56"),
		changeAmount: amountLike("0"),
		effectiveFee: amountLike("2"),
		...overrides,
	};
}

function serializedMeltOperation(
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

function amountLike(value: string) {
	return {
		toJSON: () => value,
		toString: () => value,
	};
}
