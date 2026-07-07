import { describe, expect, it } from "bun:test";
import {
	createManagerHistoryEventForwarder,
	createManagerMintEventForwarder,
	createManagerRpcRequestHandlers,
	type ManagerRpcManagerLike,
} from "./manager-rpc.ts";
import type {
	ManagerEventName,
	ManagerEventPayloads,
	ManagerHistoryEntryDto,
} from "../mainview/lib/manager-rpc.ts";

type FakeManagerEventPayloads = Omit<
	ManagerEventPayloads,
	"history:updated"
> & {
	"history:updated": {
		mintUrl: string;
		entry: ReturnType<typeof rawHistoryEntry>;
	};
};

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
			handlers.managerHistoryGetPaginatedHistory({ offset: 10, limit: 5 }),
		).resolves.toEqual([serializedHistoryEntry("history-1", "123")]);

		expect(calls).toEqual([
			["getAllMints"],
			["addMint", "https://mint.example", { trusted: true }],
			["trustMint", "https://mint.example"],
			["untrustMint", "https://mint.example"],
			["isTrustedMint", "https://mint.example"],
			["getPaginatedHistory", 10, 5],
		]);
	});

	it("forwards subscribed mint manager events and disposes event subscriptions", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerMintEventForwarder(
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

	it("keeps one manager event subscription for multiple renderer listeners", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerMintEventForwarder(
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

	it("forwards subscribed history manager events with serialized entries", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const forwarder = createManagerHistoryEventForwarder(
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
		history: {
			getPaginatedHistory: async (offset?: number, limit?: number) => {
				calls.push(["getPaginatedHistory", offset, limit]);
				return [rawHistoryEntry("history-1", 123n)];
			},
		},
		on<TEventName extends ManagerEventName>(
			event: TEventName,
			handler: (payload: FakeManagerEventPayloads[TEventName]) => void,
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
			payload: FakeManagerEventPayloads[TEventName],
		) {
			for (const listener of listeners.get(event) ?? []) {
				listener(payload as never);
			}
		},
	};

	return manager satisfies ManagerRpcManagerLike & {
		emit: <TEventName extends ManagerEventName>(
			event: TEventName,
			payload: FakeManagerEventPayloads[TEventName],
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
