import type {
	ManagerAddMintParams,
	ManagerEventDto,
	ManagerKeysetDto,
	ManagerMintDto,
	ManagerMintEventName,
	ManagerMintEventPayloads,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
} from "../mainview/lib/manager-rpc.ts";

type ManagerMintLike = {
	mintUrl: string;
	name?: string;
	mintInfo?: unknown;
	trusted: boolean;
	createdAt: number;
	updatedAt: number;
};

type ManagerKeysetLike = {
	mintUrl: string;
	id: string;
	unit: string;
	keypairs?: Record<string, string>;
	active: boolean;
	feePpk?: number;
	updatedAt: number;
};

type ManagerMintApiLike = {
	getAllMints: () => Promise<ManagerMintLike[]>;
	addMint: (
		mintUrl: string,
		options?: { trusted?: boolean },
	) => Promise<{
		mint: ManagerMintLike;
		keysets: ManagerKeysetLike[];
	}>;
	trustMint: (mintUrl: string) => Promise<void>;
	untrustMint: (mintUrl: string) => Promise<void>;
	isTrustedMint: (mintUrl: string) => Promise<boolean>;
};

export type ManagerRpcManagerLike = {
	mint: ManagerMintApiLike;
	on: <TEventName extends ManagerMintEventName>(
		event: TEventName,
		handler: (payload: ManagerMintEventPayloads[TEventName]) => void,
	) => () => void;
};

type ManagerRpcRequestHandlers = {
	managerMintGetAllMints: () => Promise<ManagerMintDto[]>;
	managerMintAddMint: (
		params: ManagerAddMintParams,
	) => Promise<ManagerMintWithKeysetsDto>;
	managerMintTrustMint: (params: ManagerMintUrlParams) => Promise<void>;
	managerMintUntrustMint: (params: ManagerMintUrlParams) => Promise<void>;
	managerMintIsTrustedMint: (params: ManagerMintUrlParams) => Promise<boolean>;
};

export function createManagerRpcRequestHandlers(
	getManager: () => Promise<ManagerRpcManagerLike>,
): ManagerRpcRequestHandlers {
	return {
		managerMintGetAllMints: async () => {
			const manager = await getManager();
			const mints = await manager.mint.getAllMints();
			return mints.map(serializeManagerMint);
		},
		managerMintAddMint: async ({ mintUrl, options }) => {
			const manager = await getManager();
			return serializeMintWithKeysets(
				await manager.mint.addMint(mintUrl, options),
			);
		},
		managerMintTrustMint: async ({ mintUrl }) => {
			const manager = await getManager();
			await manager.mint.trustMint(mintUrl);
		},
		managerMintUntrustMint: async ({ mintUrl }) => {
			const manager = await getManager();
			await manager.mint.untrustMint(mintUrl);
		},
		managerMintIsTrustedMint: async ({ mintUrl }) => {
			const manager = await getManager();
			return manager.mint.isTrustedMint(mintUrl);
		},
	};
}

export async function forwardManagerMintEvents(
	getManager: () => Promise<ManagerRpcManagerLike>,
	emit: (event: ManagerEventDto) => void,
): Promise<() => void> {
	const manager = await getManager();
	const offHandlers = MANAGER_MINT_EVENTS.map((eventName) =>
		manager.on(eventName, (payload) => {
			emit(serializeManagerEvent(eventName, payload));
		}),
	);

	return () => {
		for (const off of offHandlers) {
			off();
		}
	};
}

const MANAGER_MINT_EVENTS: ManagerMintEventName[] = [
	"mint:added",
	"mint:updated",
	"mint:trusted",
	"mint:untrusted",
];

function serializeManagerEvent<TEventName extends ManagerMintEventName>(
	event: TEventName,
	payload: ManagerMintEventPayloads[TEventName],
): ManagerEventDto<TEventName> {
	if (event === "mint:added" || event === "mint:updated") {
		return {
			event,
			payload: serializeMintWithKeysets(
				payload as ManagerMintEventPayloads["mint:added"],
			),
		} as ManagerEventDto<TEventName>;
	}

	return {
		event,
		payload,
	} as ManagerEventDto<TEventName>;
}

function serializeMintWithKeysets(input: {
	mint: ManagerMintLike;
	keysets: ManagerKeysetLike[];
}): ManagerMintWithKeysetsDto {
	return {
		mint: serializeManagerMint(input.mint),
		keysets: input.keysets.map(serializeManagerKeyset),
	};
}

function serializeManagerMint(mint: ManagerMintLike): ManagerMintDto {
	return {
		mintUrl: mint.mintUrl,
		name: mint.name || mint.mintUrl,
		mintInfo: mint.mintInfo ?? null,
		trusted: mint.trusted,
		createdAt: mint.createdAt,
		updatedAt: mint.updatedAt,
	};
}

function serializeManagerKeyset(keyset: ManagerKeysetLike): ManagerKeysetDto {
	return {
		mintUrl: keyset.mintUrl,
		id: keyset.id,
		unit: keyset.unit,
		keypairs: keyset.keypairs ?? {},
		active: keyset.active,
		feePpk: keyset.feePpk ?? 0,
		updatedAt: keyset.updatedAt,
	};
}
