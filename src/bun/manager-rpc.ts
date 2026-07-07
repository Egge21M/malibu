import type {
	ManagerAddMintParams,
	ManagerBalanceScopeDto,
	ManagerBalanceSnapshotDto,
	ManagerBalancesByMintAndUnitDto,
	ManagerBalancesByMintDto,
	ManagerBalancesByUnitDto,
	ManagerEventDto,
	ManagerEventName,
	ManagerEventPayloads,
	ManagerHistoryEntryDto,
	ManagerHistoryPaginationParams,
	ManagerKeysetDto,
	ManagerMintDto,
	ManagerEventSubscriptionDto,
	ManagerMintOperationDto,
	ManagerMintOperationIdParams,
	ManagerMintOperationListByQuoteParams,
	ManagerMintOperationPrepareParams,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
	ManagerPendingMintCheckResultDto,
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

type ManagerMintOperationLike = {
	id: string;
	mintUrl: string;
	method?: string;
	state: string;
	amount?: unknown;
	unit?: string;
	quoteId?: string;
	request?: string;
	expiry?: number | null;
	error?: string;
	createdAt: number;
	updatedAt: number;
};

type ManagerPendingMintCheckResultLike = {
	observedRemoteState?: unknown;
	observedRemoteStateAt: number;
	quoteSnapshot?: object;
	category: string;
	terminalFailure?: {
		reason: string;
		code?: string;
		retryable?: boolean;
		observedAt: number;
	};
};

type ManagerMintOpsApiLike = {
	recovery: {
		run: () => Promise<void>;
		inProgress: () => boolean;
	};
	diagnostics: {
		isLocked: (operationId: string) => boolean;
	};
	prepare: (
		input: ManagerMintOperationPrepareParams,
	) => Promise<ManagerMintOperationLike>;
	refresh: (operationId: string) => Promise<ManagerMintOperationLike>;
	execute: (operationId: string) => Promise<ManagerMintOperationLike>;
	checkPayment: (
		operationId: string,
	) => Promise<ManagerPendingMintCheckResultLike>;
	finalize: (operationId: string) => Promise<ManagerMintOperationLike>;
	get: (operationId: string) => Promise<ManagerMintOperationLike | null>;
	listByQuote: (
		params: ManagerMintOperationListByQuoteParams,
	) => Promise<ManagerMintOperationLike[]>;
	listPending: () => Promise<ManagerMintOperationLike[]>;
	listInFlight: () => Promise<ManagerMintOperationLike[]>;
};

export type ManagerRpcManagerLike = {
	mint: ManagerMintApiLike;
	wallet: {
		balances: ManagerWalletBalancesApiLike;
	};
	history: ManagerHistoryApiLike;
	ops: {
		mint: ManagerMintOpsApiLike;
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
	managerMintOpsPrepare: (
		params: ManagerMintOperationPrepareParams,
	) => Promise<ManagerMintOperationDto>;
	managerMintOpsRefresh: (
		params: ManagerMintOperationIdParams,
	) => Promise<ManagerMintOperationDto>;
	managerMintOpsExecute: (
		params: ManagerMintOperationIdParams,
	) => Promise<ManagerMintOperationDto>;
	managerMintOpsCheckPayment: (
		params: ManagerMintOperationIdParams,
	) => Promise<ManagerPendingMintCheckResultDto>;
	managerMintOpsFinalize: (
		params: ManagerMintOperationIdParams,
	) => Promise<ManagerMintOperationDto>;
	managerMintOpsGet: (
		params: ManagerMintOperationIdParams,
	) => Promise<ManagerMintOperationDto | null>;
	managerMintOpsListByQuote: (
		params: ManagerMintOperationListByQuoteParams,
	) => Promise<ManagerMintOperationDto[]>;
	managerMintOpsListPending: () => Promise<ManagerMintOperationDto[]>;
	managerMintOpsListInFlight: () => Promise<ManagerMintOperationDto[]>;
	managerMintOpsRecoveryRun: () => Promise<void>;
	managerMintOpsRecoveryInProgress: () => Promise<boolean>;
	managerMintOpsDiagnosticsIsLocked: (
		params: ManagerMintOperationIdParams,
	) => Promise<boolean>;
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
		managerMintOpsPrepare: async (params) => {
			const manager = await getManager();
			return serializeMintOperation(await manager.ops.mint.prepare(params));
		},
		managerMintOpsRefresh: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMintOperation(
				await manager.ops.mint.refresh(operationId),
			);
		},
		managerMintOpsExecute: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMintOperation(
				await manager.ops.mint.execute(operationId),
			);
		},
		managerMintOpsCheckPayment: async ({ operationId }) => {
			const manager = await getManager();
			return serializePendingMintCheckResult(
				await manager.ops.mint.checkPayment(operationId),
			);
		},
		managerMintOpsFinalize: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMintOperation(
				await manager.ops.mint.finalize(operationId),
			);
		},
		managerMintOpsGet: async ({ operationId }) => {
			const manager = await getManager();
			const operation = await manager.ops.mint.get(operationId);
			return operation ? serializeMintOperation(operation) : null;
		},
		managerMintOpsListByQuote: async (params) => {
			const manager = await getManager();
			return (await manager.ops.mint.listByQuote(params)).map(
				serializeMintOperation,
			);
		},
		managerMintOpsListPending: async () => {
			const manager = await getManager();
			return (await manager.ops.mint.listPending()).map(serializeMintOperation);
		},
		managerMintOpsListInFlight: async () => {
			const manager = await getManager();
			return (await manager.ops.mint.listInFlight()).map(
				serializeMintOperation,
			);
		},
		managerMintOpsRecoveryRun: async () => {
			const manager = await getManager();
			await manager.ops.mint.recovery.run();
		},
		managerMintOpsRecoveryInProgress: async () => {
			const manager = await getManager();
			return manager.ops.mint.recovery.inProgress();
		},
		managerMintOpsDiagnosticsIsLocked: async ({ operationId }) => {
			const manager = await getManager();
			return manager.ops.mint.diagnostics.isLocked(operationId);
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
		event === "mint-op:pending" ||
		event === "mint-op:executing" ||
		event === "mint-op:finalized" ||
		event === "mint-op:requeue"
	) {
		const operationPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerMintOperationLike;
		};
		return {
			event,
			payload: {
				mintUrl: operationPayload.mintUrl,
				operationId: operationPayload.operationId,
				operation: serializeMintOperation(operationPayload.operation),
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

function serializeMintOperation(
	operation: ManagerMintOperationLike,
): ManagerMintOperationDto {
	return serializeAmountFields(operation) as ManagerMintOperationDto;
}

function serializePendingMintCheckResult(
	result: ManagerPendingMintCheckResultLike,
): ManagerPendingMintCheckResultDto {
	return serializeAmountFields(result) as ManagerPendingMintCheckResultDto;
}

const AMOUNT_FIELD_NAMES = new Set([
	"amount",
	"amountIssued",
	"amountPaid",
	"fee",
	"feeReserve",
	"fee_reserve",
	"inputAmount",
	"swap_fee",
]);

function serializeAmountFields(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(serializeAmountFields);
	}

	if (!input || typeof input !== "object") {
		return input;
	}

	return Object.fromEntries(
		Object.entries(input).map(([key, value]) => {
			if (AMOUNT_FIELD_NAMES.has(key) && value !== undefined && value !== null) {
				return [key, serializeAmountFieldValue(value)];
			}

			return [key, serializeAmountFields(value)];
		}),
	);
}

function serializeAmountFieldValue(value: unknown): unknown {
	if (isUnitAmountRecord(value)) {
		return serializeAmountFields(value);
	}

	return serializeAmount(value);
}

function isUnitAmountRecord(value: unknown): value is { amount: unknown; unit: unknown } {
	return (
		!!value &&
		typeof value === "object" &&
		"amount" in value &&
		"unit" in value
	);
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
