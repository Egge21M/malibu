import type { Manager } from "@cashu/coco-core";
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
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
	ManagerProofDto,
	ManagerSendExecuteParams,
	ManagerSendExecuteResultDto,
	ManagerSendOperationDto,
	ManagerSendOperationIdParams,
	ManagerSendPrepareParams,
} from "../mainview/lib/manager-rpc.ts";

type ManagerSendPrepareInput = Parameters<Manager["ops"]["send"]["prepare"]>[0];

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

type ManagerSendOperationLike = Omit<
	ManagerSendOperationDto,
	"amount" | "fee" | "inputAmount"
> & {
	amount: unknown;
	fee?: unknown;
	inputAmount?: unknown;
};

type ManagerSendApiLike = {
	recovery: {
		run: () => Promise<void>;
		inProgress: () => boolean;
	};
	diagnostics: {
		isLocked: (operationId: string) => boolean;
	};
	prepare: (input: ManagerSendPrepareInput) => Promise<ManagerSendOperationLike>;
	execute: (
		operationId: string,
		options?: { memo?: string },
	) => Promise<{
		operation: ManagerSendOperationLike;
		token: unknown;
	}>;
	get: (operationId: string) => Promise<ManagerSendOperationLike | null>;
	listPrepared: () => Promise<ManagerSendOperationLike[]>;
	listInFlight: () => Promise<ManagerSendOperationLike[]>;
	refresh: (operationId: string) => Promise<ManagerSendOperationLike>;
	cancel: (operationId: string) => Promise<void>;
	reclaim: (operationId: string) => Promise<void>;
	finalize: (operationId: string) => Promise<void>;
};

export type ManagerRpcManagerLike = {
	mint: ManagerMintApiLike;
	wallet: {
		balances: ManagerWalletBalancesApiLike;
	};
	history: ManagerHistoryApiLike;
	ops: {
		send: ManagerSendApiLike;
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
	managerSendPrepare: (
		params: ManagerSendPrepareParams,
	) => Promise<ManagerSendOperationDto>;
	managerSendExecute: (
		params: ManagerSendExecuteParams,
	) => Promise<ManagerSendExecuteResultDto>;
	managerSendGet: (
		params: ManagerSendOperationIdParams,
	) => Promise<ManagerSendOperationDto | null>;
	managerSendListPrepared: () => Promise<ManagerSendOperationDto[]>;
	managerSendListInFlight: () => Promise<ManagerSendOperationDto[]>;
	managerSendRefresh: (
		params: ManagerSendOperationIdParams,
	) => Promise<ManagerSendOperationDto>;
	managerSendCancel: (params: ManagerSendOperationIdParams) => Promise<void>;
	managerSendReclaim: (params: ManagerSendOperationIdParams) => Promise<void>;
	managerSendFinalize: (params: ManagerSendOperationIdParams) => Promise<void>;
	managerSendRecoveryRun: () => Promise<void>;
	managerSendRecoveryInProgress: () => Promise<boolean>;
	managerSendDiagnosticsIsLocked: (
		params: ManagerSendOperationIdParams,
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
		managerSendPrepare: async (params) => {
			const manager = await getManager();
			return serializeSendOperation(
				await manager.ops.send.prepare({
					mintUrl: params.mintUrl,
					amount: params.amount,
					unit: params.unit,
					target: params.target as ManagerSendPrepareInput["target"],
				}),
			);
		},
		managerSendExecute: async ({ operationId, options }) => {
			const manager = await getManager();
			const result = await manager.ops.send.execute(operationId, options);
			return {
				operation: serializeSendOperation(result.operation),
				token: result.token,
			};
		},
		managerSendGet: async ({ operationId }) => {
			const manager = await getManager();
			const operation = await manager.ops.send.get(operationId);
			return operation ? serializeSendOperation(operation) : null;
		},
		managerSendListPrepared: async () => {
			const manager = await getManager();
			const operations = await manager.ops.send.listPrepared();
			return operations.map(serializeSendOperation);
		},
		managerSendListInFlight: async () => {
			const manager = await getManager();
			const operations = await manager.ops.send.listInFlight();
			return operations.map(serializeSendOperation);
		},
		managerSendRefresh: async ({ operationId }) => {
			const manager = await getManager();
			return serializeSendOperation(await manager.ops.send.refresh(operationId));
		},
		managerSendCancel: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.send.cancel(operationId);
		},
		managerSendReclaim: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.send.reclaim(operationId);
		},
		managerSendFinalize: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.send.finalize(operationId);
		},
		managerSendRecoveryRun: async () => {
			const manager = await getManager();
			await manager.ops.send.recovery.run();
		},
		managerSendRecoveryInProgress: async () => {
			const manager = await getManager();
			return manager.ops.send.recovery.inProgress();
		},
		managerSendDiagnosticsIsLocked: async ({ operationId }) => {
			const manager = await getManager();
			return manager.ops.send.diagnostics.isLocked(operationId);
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
		event === "send:prepared" ||
		event === "send:finalized" ||
		event === "send:rolled-back"
	) {
		const sendPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerSendOperationLike;
		};
		return {
			event,
			payload: {
				mintUrl: sendPayload.mintUrl,
				operationId: sendPayload.operationId,
				operation: serializeSendOperation(sendPayload.operation),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "send:pending") {
		const sendPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerSendOperationLike;
			token: unknown;
		};
		return {
			event,
			payload: {
				mintUrl: sendPayload.mintUrl,
				operationId: sendPayload.operationId,
				operation: serializeSendOperation(sendPayload.operation),
				token: sendPayload.token,
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

function serializeSendOperation(
	operation: ManagerSendOperationLike,
): ManagerSendOperationDto {
	return omitUndefined({
		id: operation.id,
		mintUrl: operation.mintUrl,
		amount: serializeAmount(operation.amount),
		unit: operation.unit,
		method: operation.method,
		methodData: operation.methodData,
		state: operation.state,
		createdAt: operation.createdAt,
		updatedAt: operation.updatedAt,
		error: operation.error,
		needsSwap: operation.needsSwap,
		fee: serializeOptionalAmount(operation.fee),
		inputAmount: serializeOptionalAmount(operation.inputAmount),
		inputProofSecrets: operation.inputProofSecrets,
		outputData: operation.outputData,
		token: operation.token,
	});
}

function serializeOptionalAmount(input: unknown): string | undefined {
	if (input === null || input === undefined) {
		return undefined;
	}

	return serializeAmount(input);
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

function omitUndefined<TRecord extends Record<string, unknown>>(
	record: TRecord,
): TRecord {
	return Object.fromEntries(
		Object.entries(record).filter(([, value]) => value !== undefined),
	) as TRecord;
}
