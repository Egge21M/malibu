import { describe, expect, it } from "bun:test";
import {
	createManagerRpcRequestHandlers,
	forwardManagerMintEvents,
	type ManagerRpcManagerLike,
} from "./manager-rpc.ts";
import type {
	ManagerMintEventName,
	ManagerMintEventPayloads,
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

		expect(calls).toEqual([
			["getAllMints"],
			["addMint", "https://mint.example", { trusted: true }],
			["trustMint", "https://mint.example"],
			["untrustMint", "https://mint.example"],
			["isTrustedMint", "https://mint.example"],
		]);
	});

	it("forwards mint manager events and disposes event subscriptions", async () => {
		const calls: unknown[] = [];
		const emitted: unknown[] = [];
		const manager = createFakeManager(calls);
		const dispose = await forwardManagerMintEvents(
			async () => manager,
			(event) => emitted.push(event),
		);

		manager.emit("mint:updated", {
			mint: rawMint("https://mint.example"),
			keysets: [rawKeyset("https://mint.example")],
		});
		manager.emit("mint:trusted", { mintUrl: "https://mint.example" });
		dispose();
		manager.emit("mint:untrusted", { mintUrl: "https://mint.example" });

		expect(emitted).toEqual([
			{
				event: "mint:updated",
				payload: {
					mint: serializedMint("https://mint.example"),
					keysets: [serializedKeyset("https://mint.example")],
				},
			},
			{
				event: "mint:trusted",
				payload: { mintUrl: "https://mint.example" },
			},
		]);
		expect(calls).toEqual([
			["on", "mint:added"],
			["on", "mint:updated"],
			["on", "mint:trusted"],
			["on", "mint:untrusted"],
			["off", "mint:added"],
			["off", "mint:updated"],
			["off", "mint:trusted"],
			["off", "mint:untrusted"],
		]);
	});
});

function createFakeManager(calls: unknown[]) {
	const listeners = new Map<ManagerMintEventName, Set<(payload: never) => void>>();
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
		on<TEventName extends ManagerMintEventName>(
			event: TEventName,
			handler: (payload: ManagerMintEventPayloads[TEventName]) => void,
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
		emit<TEventName extends ManagerMintEventName>(
			event: TEventName,
			payload: ManagerMintEventPayloads[TEventName],
		) {
			for (const listener of listeners.get(event) ?? []) {
				listener(payload as never);
			}
		},
	};

	return manager satisfies ManagerRpcManagerLike & {
		emit: <TEventName extends ManagerMintEventName>(
			event: TEventName,
			payload: ManagerMintEventPayloads[TEventName],
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
