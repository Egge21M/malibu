import { describe, expect, it } from "bun:test";
import type {
	ManagerBalanceScopeDto,
	ManagerBalancesByMintAndUnitDto,
	ManagerBalancesByMintDto,
	ManagerBalancesByUnitDto,
	ManagerEventDto,
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
	on: {
		(
			event: "mint:added" | "mint:updated",
			handler: (payload: ManagerMintWithKeysetsDto) => void,
		): () => void;
		(
			event: "proofs:reserved",
			handler: (payload: ProofsReservedEvent) => void,
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
			() => (manager as unknown as Record<string, unknown>)["history"],
		).toThrow('Remote Coco manager does not support "history" yet');
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
