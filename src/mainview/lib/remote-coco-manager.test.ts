import { describe, expect, it } from "bun:test";
import type { HistoryEntry } from "@cashu/coco-core";
import type {
	ManagerEventDto,
	ManagerHistoryEntryDto,
	ManagerMintDto,
	ManagerMintWithKeysetsDto,
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
	on: (
		event: "mint:added" | "mint:updated",
		handler: (payload: ManagerMintWithKeysetsDto) => void,
	) => () => void;
	off: (
		event: "mint:added" | "mint:updated",
		handler: (payload: ManagerMintWithKeysetsDto) => void,
	) => void;
};

type RemoteHistoryManagerSurface = {
	history: {
		getPaginatedHistory: (
			offset?: number,
			limit?: number,
		) => Promise<HistoryEntry[]>;
	};
	on: (
		event: "history:updated",
		handler: (payload: { mintUrl: string; entry: HistoryEntry }) => void,
	) => () => void;
	off: (
		event: "history:updated",
		handler: (payload: { mintUrl: string; entry: HistoryEntry }) => void,
	) => void;
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
				managerHistoryGetPaginatedHistory: async (params: unknown) => {
					calls.push(["managerHistoryGetPaginatedHistory", params]);
					return [historyEntry("history-1", "42")];
				},
			},
			send: {
				managerMintEventSubscribe: (params: unknown) => {
					calls.push(["managerMintEventSubscribe", params]);
				},
				managerMintEventUnsubscribe: (params: unknown) => {
					calls.push(["managerMintEventUnsubscribe", params]);
				},
				managerHistoryEventSubscribe: (params: unknown) => {
					calls.push(["managerHistoryEventSubscribe", params]);
				},
				managerHistoryEventUnsubscribe: (params: unknown) => {
					calls.push(["managerHistoryEventUnsubscribe", params]);
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

	it("forwards Coco React history pagination calls and rehydrates history amounts", async () => {
		const fake = createFakeRpc();
		const manager = createRemoteCocoManager(
			fake.rpc,
		) as unknown as RemoteHistoryManagerSurface;

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
		) as unknown as RemoteHistoryManagerSurface;
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
			["managerHistoryEventSubscribe", { event: "history:updated" }],
			["managerHistoryGetPaginatedHistory", { offset: 0, limit: 24 }],
			["managerHistoryEventUnsubscribe", { event: "history:updated" }],
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
			["managerMintEventSubscribe", { event: "mint:added" }],
			["managerMintEventUnsubscribe", { event: "mint:added" }],
			["removeMessageListener", "managerEvent"],
		]);

		const secondUnsubscribe = manager.on("mint:updated", handler);
		secondUnsubscribe();
		unsubscribe();
		expect(fake.calls.slice(-4)).toEqual([
			["addMessageListener", "managerEvent"],
			["managerMintEventSubscribe", { event: "mint:updated" }],
			["managerMintEventUnsubscribe", { event: "mint:updated" }],
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
			["managerMintEventSubscribe", { event: "mint:added" }],
			["managerMintEventUnsubscribe", { event: "mint:added" }],
			["removeMessageListener", "managerEvent"],
		]);
	});

	it("throws clear errors for unsupported manager surface area", () => {
		const manager = createRemoteCocoManager(
			createFakeRpc().rpc,
		) as unknown as RemoteMintManagerSurface & RemoteHistoryManagerSurface;

		expect(() => (manager as unknown as Record<string, unknown>)["wallet"]).toThrow(
			'Remote Coco manager does not support "wallet" yet',
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

function createPaginatedHistoryConsumer(
	manager: RemoteHistoryManagerSurface,
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
