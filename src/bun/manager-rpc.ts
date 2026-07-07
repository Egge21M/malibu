import type {
	ManagerAddMintParams,
	ManagerEventDto,
	ManagerEventName,
	ManagerEventPayloads,
	ManagerKeysetDto,
	ManagerHistoryEntryDto,
	ManagerHistoryEventName,
	ManagerHistoryPaginationParams,
	ManagerMintDto,
	ManagerMintEventName,
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

type ManagerHistoryEntryLike = Omit<ManagerHistoryEntryDto, "amount"> & {
	amount: unknown;
};

type ManagerHistoryApiLike = {
	getPaginatedHistory: (
		offset?: number,
		limit?: number,
	) => Promise<ManagerHistoryEntryLike[]>;
};

type ManagerRpcManagerEventPayloads = Omit<
	ManagerEventPayloads,
	"history:updated"
> & {
	"history:updated": {
		mintUrl: string;
		entry: ManagerHistoryEntryLike;
	};
};

export type ManagerRpcManagerLike = {
	mint: ManagerMintApiLike;
	history: ManagerHistoryApiLike;
	on: <TEventName extends ManagerEventName>(
		event: TEventName,
		handler: (payload: ManagerRpcManagerEventPayloads[TEventName]) => void,
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
	managerHistoryGetPaginatedHistory: (
		params: ManagerHistoryPaginationParams,
	) => Promise<ManagerHistoryEntryDto[]>;
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
		managerHistoryGetPaginatedHistory: async ({ offset, limit }) => {
			const manager = await getManager();
			const entries = await manager.history.getPaginatedHistory(offset, limit);
			return entries.map(serializeHistoryEntry);
		},
	};
}

export function createManagerMintEventForwarder(
	getManager: () => Promise<ManagerRpcManagerLike>,
	emit: <TEventName extends ManagerEventName>(
		event: ManagerEventDto<TEventName>,
	) => void,
) {
	return createManagerEventForwarder<ManagerMintEventName>(
		getManager,
		emit,
		serializeManagerEvent,
	);
}

export function createManagerHistoryEventForwarder(
	getManager: () => Promise<ManagerRpcManagerLike>,
	emit: <TEventName extends ManagerEventName>(
		event: ManagerEventDto<TEventName>,
	) => void,
) {
	return createManagerEventForwarder<ManagerHistoryEventName>(
		getManager,
		emit,
		serializeManagerEvent,
	);
}

function createManagerEventForwarder<TEventName extends ManagerEventName>(
	getManager: () => Promise<ManagerRpcManagerLike>,
	emit: <TName extends ManagerEventName>(event: ManagerEventDto<TName>) => void,
	serializeEvent: <TName extends ManagerEventName>(
		event: TName,
		payload: ManagerRpcManagerEventPayloads[TName],
	) => ManagerEventDto<TName>,
) {
	const subscriptionCounts = new Map<TEventName, number>();
	const offHandlers = new Map<TEventName, () => void>();
	const pendingSubscriptions = new Map<TEventName, Promise<void>>();

	return {
		subscribe: (
			{ event }: { event: TEventName },
		) => {
			const eventName = event;
			subscriptionCounts.set(event, (subscriptionCounts.get(event) ?? 0) + 1);
			if (offHandlers.has(eventName) || pendingSubscriptions.has(eventName)) {
				return;
			}

			const pending = getManager()
				.then((manager) => {
					if ((subscriptionCounts.get(event) ?? 0) === 0) {
						return;
					}
					const off = manager.on(event, (payload) => {
						emit(serializeEvent(event, payload));
					});
					offHandlers.set(eventName, off);
				})
				.finally(() => {
					pendingSubscriptions.delete(eventName);
				});
			pendingSubscriptions.set(eventName, pending);
			void pending;
		},
		unsubscribe: (
			{ event }: { event: TEventName },
		) => {
			const eventName = event;
			const currentCount = subscriptionCounts.get(event) ?? 0;
			if (currentCount <= 1) {
				subscriptionCounts.delete(event);
				const off = offHandlers.get(eventName);
				if (off) {
					off();
					offHandlers.delete(eventName);
				}
				return;
			}

			subscriptionCounts.set(event, currentCount - 1);
		},
		dispose: () => {
			subscriptionCounts.clear();
			for (const off of offHandlers.values()) {
				off();
			}
			offHandlers.clear();
			pendingSubscriptions.clear();
		},
	};
}

function serializeManagerEvent<TEventName extends ManagerEventName>(
	event: TEventName,
	payload: ManagerRpcManagerEventPayloads[TEventName],
): ManagerEventDto<TEventName> {
	if (event === "mint:added" || event === "mint:updated") {
		return {
			event,
			payload: serializeMintWithKeysets(
				payload as ManagerEventPayloads["mint:added"],
			),
		} as ManagerEventDto<TEventName>;
	}

	if (event === "history:updated") {
		return {
			event,
			payload: serializeHistoryEventPayload(
				payload as ManagerRpcManagerEventPayloads["history:updated"],
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

function serializeHistoryEventPayload(
	payload: ManagerRpcManagerEventPayloads["history:updated"],
): ManagerEventPayloads["history:updated"] {
	return {
		mintUrl: payload.mintUrl,
		entry: serializeHistoryEntry(payload.entry as ManagerHistoryEntryLike),
	};
}

function serializeHistoryEntry(entry: ManagerHistoryEntryLike): ManagerHistoryEntryDto {
	return {
		id: entry.id,
		type: entry.type,
		source: entry.source,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
		mintUrl: entry.mintUrl,
		unit: entry.unit,
		state: String(entry.state),
		amount: serializeAmount(entry.amount),
		metadata: entry.metadata,
		error: entry.error,
		operationId: entry.operationId,
		legacyHistoryId: entry.legacyHistoryId,
		paymentRequest: entry.paymentRequest,
		quoteId: entry.quoteId,
		remoteState: entry.remoteState,
		token: entry.token,
	};
}

function serializeAmount(input: unknown): string {
	if (input === null || input === undefined) {
		return "0";
	}

	if (typeof input === "string") {
		return input;
	}

	if (typeof input === "number" || typeof input === "bigint") {
		return input.toString();
	}

	if (typeof input === "object" && "toString" in input) {
		return String(input.toString());
	}

	return String(input);
}
