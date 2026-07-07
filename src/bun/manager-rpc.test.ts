import { describe, expect, it } from "bun:test";
import {
	createManagerEventForwarder,
	createManagerRpcRequestHandlers,
	type ManagerRpcManagerLike,
} from "./manager-rpc.ts";
import type {
	ManagerEventName,
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

function amountLike(value: string) {
	return {
		toJSON: () => value,
		toString: () => value,
	};
}
