import type {
	ManagerAddMintParams,
	ManagerBalanceScopeDto,
	ManagerBalanceSnapshotDto,
	ManagerBalancesByMintAndUnitDto,
	ManagerBalancesByMintDto,
	ManagerBalancesByUnitDto,
	ManagerCreateMeltQuoteParams,
	ManagerEventDto,
	ManagerEventName,
	ManagerEventPayloads,
	ManagerHistoryEntryDto,
	ManagerHistoryPaginationParams,
	ManagerKeysetDto,
	ManagerListPendingMeltQuotesParams,
	ManagerMeltOperationDto,
	ManagerMeltQuoteDto,
	ManagerOperationIdParams,
	ManagerOperationIdWithReasonParams,
	ManagerPrepareMeltParams,
	ManagerQuoteIdentityDto,
	ManagerMintDto,
	ManagerEventSubscriptionDto,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
	ManagerProofDto,
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

type ManagerBalanceSnapshotLike = {
	spendable: unknown;
	reserved: unknown;
	total: unknown;
	unit: string;
};

type ManagerBalancesByMintLike = Record<string, ManagerBalanceSnapshotLike>;

type ManagerBalancesByMintAndUnitLike = Record<
	string,
	Record<string, ManagerBalanceSnapshotLike>
>;

type ManagerBalancesByUnitLike = Record<string, ManagerBalanceSnapshotLike>;

type ManagerWalletBalancesApiLike = {
	byMint: (scope?: ManagerBalanceScopeDto) => Promise<ManagerBalancesByMintLike>;
	byMintAndUnit: (
		scope?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByMintAndUnitLike>;
	byUnit: (scope?: ManagerBalanceScopeDto) => Promise<ManagerBalancesByUnitLike>;
	total: (scope?: ManagerBalanceScopeDto) => Promise<ManagerBalanceSnapshotLike>;
	totalByUnit: (
		scope?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByUnitLike>;
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

type ManagerMeltQuoteLike = {
	mintUrl: string;
	method: string;
	quoteId: string;
	request: string;
	unit: string;
	expiry: number;
	state: string;
	createdAt: number;
	updatedAt: number;
	amount: unknown;
	fee_reserve?: unknown;
};

type ManagerMeltOperationLike = {
	id: string;
	mintUrl: string;
	method: string;
	methodData: Record<string, unknown>;
	unit: string;
	state: string;
	createdAt: number;
	updatedAt: number;
	amount?: unknown;
	fee_reserve?: unknown;
	swap_fee?: unknown;
	inputAmount?: unknown;
	changeAmount?: unknown;
	effectiveFee?: unknown;
};

type ManagerMeltQuoteApiLike = {
	create: (params: any) => Promise<ManagerMeltQuoteLike>;
	get: (params: any) => Promise<ManagerMeltQuoteLike | null>;
	listPending: (
		params?: any,
	) => Promise<ManagerMeltQuoteLike[]>;
	refresh: (params: any) => Promise<ManagerMeltQuoteLike>;
};

type ManagerMeltOpsApiLike = {
	prepare: (params: any) => Promise<ManagerMeltOperationLike>;
	execute: (operationId: any) => Promise<ManagerMeltOperationLike>;
	get: (operationId: any) => Promise<ManagerMeltOperationLike | null>;
	getByQuote: (
		params: any,
	) => Promise<ManagerMeltOperationLike | null>;
	listByQuote: (
		params: any,
	) => Promise<ManagerMeltOperationLike[]>;
	listPrepared: () => Promise<ManagerMeltOperationLike[]>;
	listInFlight: () => Promise<ManagerMeltOperationLike[]>;
	refresh: (operationId: any) => Promise<ManagerMeltOperationLike>;
	cancel: (operationId: any, reason?: any) => Promise<void>;
	reclaim: (operationId: any, reason?: any) => Promise<void>;
	finalize: (operationId: any) => Promise<void>;
};

export type ManagerRpcManagerLike = {
	mint: ManagerMintApiLike;
	wallet: {
		balances: ManagerWalletBalancesApiLike;
	};
	history: ManagerHistoryApiLike;
	quotes: {
		melt: ManagerMeltQuoteApiLike;
	};
	ops: {
		melt: ManagerMeltOpsApiLike;
	};
	on: <TEventName extends ManagerEventName>(
		event: TEventName,
		handler: (payload: unknown) => void,
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
	managerWalletBalancesByMint: (
		params?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByMintDto>;
	managerWalletBalancesByMintAndUnit: (
		params?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByMintAndUnitDto>;
	managerWalletBalancesByUnit: (
		params?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByUnitDto>;
	managerWalletBalancesTotal: (
		params?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalanceSnapshotDto>;
	managerWalletBalancesTotalByUnit: (
		params?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByUnitDto>;
	managerHistoryGetPaginatedHistory: (
		params: ManagerHistoryPaginationParams,
	) => Promise<ManagerHistoryEntryDto[]>;
	managerMeltQuoteCreate: (
		params: ManagerCreateMeltQuoteParams,
	) => Promise<ManagerMeltQuoteDto>;
	managerMeltQuoteGet: (
		params: ManagerQuoteIdentityDto,
	) => Promise<ManagerMeltQuoteDto | null>;
	managerMeltQuoteListPending: (
		params?: ManagerListPendingMeltQuotesParams,
	) => Promise<ManagerMeltQuoteDto[]>;
	managerMeltQuoteRefresh: (
		params: ManagerQuoteIdentityDto,
	) => Promise<ManagerMeltQuoteDto>;
	managerMeltPrepare: (
		params: ManagerPrepareMeltParams,
	) => Promise<ManagerMeltOperationDto>;
	managerMeltExecute: (
		params: ManagerOperationIdParams,
	) => Promise<ManagerMeltOperationDto>;
	managerMeltGet: (
		params: ManagerOperationIdParams,
	) => Promise<ManagerMeltOperationDto | null>;
	managerMeltGetByQuote: (
		params: ManagerQuoteIdentityDto,
	) => Promise<ManagerMeltOperationDto | null>;
	managerMeltListByQuote: (
		params: ManagerQuoteIdentityDto,
	) => Promise<ManagerMeltOperationDto[]>;
	managerMeltListPrepared: () => Promise<ManagerMeltOperationDto[]>;
	managerMeltListInFlight: () => Promise<ManagerMeltOperationDto[]>;
	managerMeltRefresh: (
		params: ManagerOperationIdParams,
	) => Promise<ManagerMeltOperationDto>;
	managerMeltCancel: (
		params: ManagerOperationIdWithReasonParams,
	) => Promise<void>;
	managerMeltReclaim: (
		params: ManagerOperationIdWithReasonParams,
	) => Promise<void>;
	managerMeltFinalize: (params: ManagerOperationIdParams) => Promise<void>;
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
		managerWalletBalancesByMint: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByMint(
				await manager.wallet.balances.byMint(scope),
			);
		},
		managerWalletBalancesByMintAndUnit: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByMintAndUnit(
				await manager.wallet.balances.byMintAndUnit(scope),
			);
		},
		managerWalletBalancesByUnit: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByUnit(
				await manager.wallet.balances.byUnit(scope),
			);
		},
		managerWalletBalancesTotal: async (scope) => {
			const manager = await getManager();
			return serializeBalanceSnapshot(
				await manager.wallet.balances.total(scope),
			);
		},
		managerWalletBalancesTotalByUnit: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByUnit(
				await manager.wallet.balances.totalByUnit(scope),
			);
		},
		managerHistoryGetPaginatedHistory: async ({ offset, limit }) => {
			const manager = await getManager();
			const entries = await manager.history.getPaginatedHistory(offset, limit);
			return entries.map(serializeHistoryEntry);
		},
		managerMeltQuoteCreate: async (params) => {
			const manager = await getManager();
			return serializeMeltQuote(await manager.quotes.melt.create(params));
		},
		managerMeltQuoteGet: async (params) => {
			const manager = await getManager();
			const quote = await manager.quotes.melt.get(params);
			return quote ? serializeMeltQuote(quote) : null;
		},
		managerMeltQuoteListPending: async (params) => {
			const manager = await getManager();
			const quotes = await manager.quotes.melt.listPending(params);
			return quotes.map(serializeMeltQuote);
		},
		managerMeltQuoteRefresh: async (params) => {
			const manager = await getManager();
			return serializeMeltQuote(await manager.quotes.melt.refresh(params));
		},
		managerMeltPrepare: async (params) => {
			const manager = await getManager();
			return serializeMeltOperation(await manager.ops.melt.prepare(params));
		},
		managerMeltExecute: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMeltOperation(await manager.ops.melt.execute(operationId));
		},
		managerMeltGet: async ({ operationId }) => {
			const manager = await getManager();
			const operation = await manager.ops.melt.get(operationId);
			return operation ? serializeMeltOperation(operation) : null;
		},
		managerMeltGetByQuote: async (params) => {
			const manager = await getManager();
			const operation = await manager.ops.melt.getByQuote(params);
			return operation ? serializeMeltOperation(operation) : null;
		},
		managerMeltListByQuote: async (params) => {
			const manager = await getManager();
			const operations = await manager.ops.melt.listByQuote(params);
			return operations.map(serializeMeltOperation);
		},
		managerMeltListPrepared: async () => {
			const manager = await getManager();
			const operations = await manager.ops.melt.listPrepared();
			return operations.map(serializeMeltOperation);
		},
		managerMeltListInFlight: async () => {
			const manager = await getManager();
			const operations = await manager.ops.melt.listInFlight();
			return operations.map(serializeMeltOperation);
		},
		managerMeltRefresh: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMeltOperation(await manager.ops.melt.refresh(operationId));
		},
		managerMeltCancel: async ({ operationId, reason }) => {
			const manager = await getManager();
			await manager.ops.melt.cancel(operationId, reason);
		},
		managerMeltReclaim: async ({ operationId, reason }) => {
			const manager = await getManager();
			await manager.ops.melt.reclaim(operationId, reason);
		},
		managerMeltFinalize: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.melt.finalize(operationId);
		},
	};
}

export function createManagerEventForwarder(
	getManager: () => Promise<ManagerRpcManagerLike>,
	emit: (event: ManagerEventDto) => void,
) {
	const subscriptionCounts = new Map<ManagerEventName, number>();
	const offHandlers = new Map<ManagerEventName, () => void>();
	const pendingSubscriptions = new Map<ManagerEventName, Promise<void>>();

	return {
		subscribe: ({ event }: ManagerEventSubscriptionDto) => {
			subscriptionCounts.set(event, (subscriptionCounts.get(event) ?? 0) + 1);
			if (offHandlers.has(event) || pendingSubscriptions.has(event)) {
				return;
			}

			const pending = getManager()
				.then((manager) => {
					if ((subscriptionCounts.get(event) ?? 0) === 0) {
						return;
					}
					const off = manager.on(event, (payload) => {
						emit(serializeManagerEvent(event, payload));
					});
					offHandlers.set(event, off);
				})
				.finally(() => {
					pendingSubscriptions.delete(event);
				});
			pendingSubscriptions.set(event, pending);
			void pending;
		},
		unsubscribe: ({ event }: ManagerEventSubscriptionDto) => {
			const currentCount = subscriptionCounts.get(event) ?? 0;
			if (currentCount <= 1) {
				subscriptionCounts.delete(event);
				const off = offHandlers.get(event);
				if (off) {
					off();
					offHandlers.delete(event);
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
	payload: unknown,
): ManagerEventDto<TEventName> {
	if (event === "mint:added" || event === "mint:updated") {
		return {
			event,
			payload: serializeMintWithKeysets(
				payload as ManagerEventPayloads["mint:added"],
			),
		} as ManagerEventDto<TEventName>;
	}

	if (event === "proofs:saved") {
		const savedPayload = payload as ManagerEventPayloads["proofs:saved"];
		return {
			event,
			payload: {
				...savedPayload,
				proofs: savedPayload.proofs.map(serializeProof),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "proofs:reserved") {
		const reservedPayload = payload as ManagerEventPayloads["proofs:reserved"];
		return {
			event,
			payload: {
				...reservedPayload,
				amount: serializeUnitAmount(reservedPayload.amount),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "history:updated") {
		const historyPayload = payload as {
			mintUrl: string;
			entry: ManagerHistoryEntryLike;
		};
		return {
			event,
			payload: {
				mintUrl: historyPayload.mintUrl,
				entry: serializeHistoryEntry(historyPayload.entry),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (
		event === "melt-op:prepared" ||
		event === "melt-op:pending" ||
		event === "melt-op:finalized" ||
		event === "melt-op:rolled-back"
	) {
		const operationPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerMeltOperationLike;
		};
		return {
			event,
			payload: {
				...operationPayload,
				operation: serializeMeltOperation(operationPayload.operation),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "melt-quote:updated") {
		const quotePayload = payload as {
			mintUrl: string;
			method: string;
			quoteId: string;
			quote: ManagerMeltQuoteLike;
		};
		return {
			event,
			payload: {
				...quotePayload,
				quote: serializeMeltQuote(quotePayload.quote),
			},
		} as ManagerEventDto<TEventName>;
	}

	return {
		event,
		payload: payload as ManagerEventPayloads[TEventName],
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

function serializeBalancesByMint(
	balances: ManagerBalancesByMintLike,
): ManagerBalancesByMintDto {
	return Object.fromEntries(
		Object.entries(balances).map(([mintUrl, balance]) => [
			mintUrl,
			serializeBalanceSnapshot(balance),
		]),
	);
}

function serializeBalancesByMintAndUnit(
	balances: ManagerBalancesByMintAndUnitLike,
): ManagerBalancesByMintAndUnitDto {
	return Object.fromEntries(
		Object.entries(balances).map(([mintUrl, unitBalances]) => [
			mintUrl,
			Object.fromEntries(
				Object.entries(unitBalances).map(([unit, balance]) => [
					unit,
					serializeBalanceSnapshot(balance),
				]),
			),
		]),
	);
}

function serializeBalancesByUnit(
	balances: ManagerBalancesByUnitLike,
): ManagerBalancesByUnitDto {
	return Object.fromEntries(
		Object.entries(balances).map(([unit, balance]) => [
			unit,
			serializeBalanceSnapshot(balance),
		]),
	);
}

function serializeBalanceSnapshot(
	balance: ManagerBalanceSnapshotLike,
): ManagerBalanceSnapshotDto {
	return {
		spendable: serializeAmount(balance.spendable),
		reserved: serializeAmount(balance.reserved),
		total: serializeAmount(balance.total),
		unit: balance.unit,
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

function serializeProof(proof: ManagerProofDto): ManagerProofDto {
	return {
		...proof,
		amount: serializeAmount(proof.amount),
	};
}

function serializeUnitAmount(input: {
	amount: unknown;
	unit: string;
}): { amount: string; unit: string } {
	return {
		...input,
		amount: serializeAmount(input.amount),
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

function serializeMeltQuote(quote: ManagerMeltQuoteLike): ManagerMeltQuoteDto {
	const serialized = {
		...(quote as Record<string, unknown>),
		mintUrl: quote.mintUrl,
		method: quote.method,
		quoteId: quote.quoteId,
		request: quote.request,
		amount: serializeAmount(quote.amount),
		unit: quote.unit,
		expiry: quote.expiry,
		state: String(quote.state),
		createdAt: quote.createdAt,
		updatedAt: quote.updatedAt,
	} as ManagerMeltQuoteDto;

	if (quote.fee_reserve !== undefined) {
		serialized.fee_reserve = serializeAmount(quote.fee_reserve);
	}

	return serialized;
}

function serializeMeltOperation(
	operation: ManagerMeltOperationLike,
): ManagerMeltOperationDto {
	const serialized = {
		...(operation as Record<string, unknown>),
		id: operation.id,
		mintUrl: operation.mintUrl,
		method: operation.method,
		methodData: operation.methodData,
		unit: operation.unit,
		state: String(operation.state),
		createdAt: operation.createdAt,
		updatedAt: operation.updatedAt,
	} as ManagerMeltOperationDto;

	copySerializedAmount(operation, serialized, "amount");
	copySerializedAmount(operation, serialized, "fee_reserve");
	copySerializedAmount(operation, serialized, "swap_fee");
	copySerializedAmount(operation, serialized, "inputAmount");
	copySerializedAmount(operation, serialized, "changeAmount");
	copySerializedAmount(operation, serialized, "effectiveFee");

	return serialized;
}

function copySerializedAmount(
	source: Record<string, unknown>,
	target: Record<string, unknown>,
	field: string,
): void {
	if (source[field] !== undefined) {
		target[field] = serializeAmount(source[field]);
	}
}

function serializeAmount(input: unknown): string {
	if (typeof input === "bigint") {
		return input.toString();
	}
	if (typeof input === "number") {
		return String(input);
	}
	if (typeof input === "string") {
		return input;
	}
	if (input && typeof input === "object") {
		if ("toJSON" in input && typeof input.toJSON === "function") {
			const jsonValue = input.toJSON();
			if (
				typeof jsonValue === "string" ||
				typeof jsonValue === "number" ||
				typeof jsonValue === "bigint"
			) {
				return jsonValue.toString();
			}
		}
		if ("toString" in input && typeof input.toString === "function") {
			const stringValue = input.toString();
			if (stringValue !== "[object Object]") {
				return stringValue;
			}
		}
	}

	throw new Error("Cannot serialize manager amount value.");
}
