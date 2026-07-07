import { Amount, type HistoryEntry, type Manager } from "@cashu/coco-core";
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
	ManagerMintDto,
	ManagerEventSubscriptionDto,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
	ManagerMintOperationDto,
	ManagerMintOperationIdParams,
	ManagerMintOperationListByQuoteParams,
	ManagerMintOperationPrepareParams,
	ManagerPendingMintCheckResultDto,
} from "@/lib/manager-rpc";

type RemoteManagerEventPayloads = Omit<
	ManagerEventPayloads,
	"history:updated" | "mint-op:pending" | "mint-op:executing" | "mint-op:finalized" | "mint-op:requeue"
> & {
	"history:updated": {
		mintUrl: string;
		entry: HistoryEntry;
	};
	"mint-op:pending": ManagerMintOperationEventPayload;
	"mint-op:executing": ManagerMintOperationEventPayload;
	"mint-op:finalized": ManagerMintOperationEventPayload;
	"mint-op:requeue": ManagerMintOperationEventPayload;
};

type ManagerEventHandler<TEventName extends ManagerEventName> = (
	payload: RemoteManagerEventPayloads[TEventName],
) => void | Promise<void>;

type MintOperationLike = {
	id: string;
	mintUrl: string;
	method: string;
	state: string;
	amount?: Amount;
	unit?: string;
	quoteId?: string;
	request?: string;
	expiry?: number | null;
	error?: string;
	createdAt: number;
	updatedAt: number;
};

type ManagerMintOperationEventPayload = {
	mintUrl: string;
	operationId: string;
	operation: MintOperationLike;
};

type RemoteManagerRpc = {
	request: {
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
	send: {
		managerEventSubscribe: (payload: ManagerEventSubscriptionDto) => void;
		managerEventUnsubscribe: (payload: ManagerEventSubscriptionDto) => void;
	};
	addMessageListener: (
		message: "managerEvent",
		handler: (payload: ManagerEventDto) => void,
	) => void;
	removeMessageListener: (
		message: "managerEvent",
		handler: (payload: ManagerEventDto) => void,
	) => void;
};

class RemoteCocoManager {
	private readonly listeners = new Map<
		ManagerEventName,
		Set<ManagerEventHandler<ManagerEventName>>
	>();
	private listeningToRpc = false;

	readonly mint = unsupportedAwareObject("Remote Coco manager mint API", {
		getAllMints: () => this.rpc.request.managerMintGetAllMints(),
		addMint: (mintUrl: string, options?: { trusted?: boolean }) =>
			this.rpc.request.managerMintAddMint({ mintUrl, options }),
		trustMint: (mintUrl: string) =>
			this.rpc.request.managerMintTrustMint({ mintUrl }),
		untrustMint: (mintUrl: string) =>
			this.rpc.request.managerMintUntrustMint({ mintUrl }),
		isTrustedMint: (mintUrl: string) =>
			this.rpc.request.managerMintIsTrustedMint({ mintUrl }),
	});

	readonly wallet = unsupportedAwareObject("Remote Coco manager wallet API", {
		balances: unsupportedAwareObject("Remote Coco manager balance API", {
			byMint: async (scope?: ManagerBalanceScopeDto) =>
				rehydrateBalancesByMint(
					await this.rpc.request.managerWalletBalancesByMint(scope),
				),
			byMintAndUnit: async (scope?: ManagerBalanceScopeDto) =>
				rehydrateBalancesByMintAndUnit(
					await this.rpc.request.managerWalletBalancesByMintAndUnit(scope),
				),
			byUnit: async (scope?: ManagerBalanceScopeDto) =>
				rehydrateBalancesByUnit(
					await this.rpc.request.managerWalletBalancesByUnit(scope),
				),
			total: async (scope?: ManagerBalanceScopeDto) =>
				rehydrateBalanceSnapshot(
					await this.rpc.request.managerWalletBalancesTotal(scope),
				),
			totalByUnit: async (scope?: ManagerBalanceScopeDto) =>
				rehydrateBalancesByUnit(
					await this.rpc.request.managerWalletBalancesTotalByUnit(scope),
				),
		}),
	});

	readonly history = unsupportedAwareObject("Remote Coco manager history API", {
		getPaginatedHistory: async (offset?: number, limit?: number) => {
			const entries =
				await this.rpc.request.managerHistoryGetPaginatedHistory({
					offset,
					limit,
				});
			return entries.map(rehydrateHistoryEntry);
		},
	});

	readonly ops = unsupportedAwareObject("Remote Coco manager ops API", {
		mint: unsupportedAwareObject("Remote Coco manager mint operations API", {
			recovery: unsupportedAwareObject(
				"Remote Coco manager mint operation recovery API",
				{
					run: () => this.rpc.request.managerMintOpsRecoveryRun(),
					inProgress: () =>
						this.rpc.request.managerMintOpsRecoveryInProgress(),
				},
			),
			diagnostics: unsupportedAwareObject(
				"Remote Coco manager mint operation diagnostics API",
				{
					isLocked: (operationId: string) =>
						this.rpc.request.managerMintOpsDiagnosticsIsLocked({
							operationId,
						}),
				},
			),
			prepare: async (input: ManagerMintOperationPrepareParams) =>
				rehydrateMintOperation(
					await this.rpc.request.managerMintOpsPrepare({
						quote: input.quote,
						amount: stringifyAmount(input.amount),
					}),
				),
			refresh: async (operationId: string) =>
				rehydrateMintOperation(
					await this.rpc.request.managerMintOpsRefresh({ operationId }),
				),
			execute: async (operationOrId: MintOperationLike | string) =>
				rehydrateMintOperation(
					await this.rpc.request.managerMintOpsExecute({
						operationId:
							typeof operationOrId === "string" ? operationOrId : operationOrId.id,
					}),
				),
			checkPayment: async (operationId: string) =>
				rehydrateAmountFields(
					await this.rpc.request.managerMintOpsCheckPayment({
						operationId,
					}),
				),
			finalize: async (operationId: string) =>
				rehydrateMintOperation(
					await this.rpc.request.managerMintOpsFinalize({ operationId }),
				),
			get: async (operationId: string) => {
				const operation = await this.rpc.request.managerMintOpsGet({
					operationId,
				});
				return operation ? rehydrateMintOperation(operation) : null;
			},
			listByQuote: async (params: ManagerMintOperationListByQuoteParams) =>
				(
					await this.rpc.request.managerMintOpsListByQuote(params)
				).map(rehydrateMintOperation),
			listPending: async () =>
				(
					await this.rpc.request.managerMintOpsListPending()
				).map(rehydrateMintOperation),
			listInFlight: async () =>
				(
					await this.rpc.request.managerMintOpsListInFlight()
				).map(rehydrateMintOperation),
		}),
	});

	constructor(private readonly rpc: RemoteManagerRpc) {}

	on<TEventName extends ManagerEventName>(
		event: TEventName,
		handler: ManagerEventHandler<TEventName>,
	): () => void {
		this.ensureRpcEventListener();
		const listeners = this.listeners.get(event) ?? new Set();
		const shouldSubscribe = listeners.size === 0;
		listeners.add(handler as ManagerEventHandler<ManagerEventName>);
		this.listeners.set(event, listeners);
		if (shouldSubscribe) {
			this.rpc.send.managerEventSubscribe({ event });
		}

		return () => this.off(event, handler);
	}

	off<TEventName extends ManagerEventName>(
		event: TEventName,
		handler: ManagerEventHandler<TEventName>,
	): void {
		const listeners = this.listeners.get(event);
		const hadHandler = listeners?.has(
			handler as ManagerEventHandler<ManagerEventName>,
		);
		listeners?.delete(handler as ManagerEventHandler<ManagerEventName>);
		if (listeners?.size === 0) {
			this.listeners.delete(event);
			if (hadHandler) {
				this.rpc.send.managerEventUnsubscribe({ event });
			}
		}
		this.stopRpcEventListenerIfIdle();
	}

	private ensureRpcEventListener(): void {
		if (this.listeningToRpc) {
			return;
		}

		this.rpc.addMessageListener("managerEvent", this.handleManagerEvent);
		this.listeningToRpc = true;
	}

	private stopRpcEventListenerIfIdle(): void {
		if (!this.listeningToRpc || this.listeners.size > 0) {
			return;
		}

		this.rpc.removeMessageListener("managerEvent", this.handleManagerEvent);
		this.listeningToRpc = false;
	}

	private readonly handleManagerEvent = (event: ManagerEventDto): void => {
		const listeners = this.listeners.get(event.event);
		if (!listeners) {
			return;
		}

		const payload = rehydrateManagerEventPayload(event);
		for (const listener of listeners) {
			void listener(payload as RemoteManagerEventPayloads[ManagerEventName]);
		}
	};
}

export function createRemoteCocoManager(rpc: RemoteManagerRpc): Manager {
	return unsupportedAwareObject("Remote Coco manager", new RemoteCocoManager(rpc), {
		allowProperties: new Set(["mint", "wallet", "history", "ops", "on", "off"]),
	}) as unknown as Manager;
}

function rehydrateBalancesByMint(balances: ManagerBalancesByMintDto) {
	return Object.fromEntries(
		Object.entries(balances).map(([mintUrl, balance]) => [
			mintUrl,
			rehydrateBalanceSnapshot(balance),
		]),
	);
}

function rehydrateBalancesByMintAndUnit(
	balances: ManagerBalancesByMintAndUnitDto,
) {
	return Object.fromEntries(
		Object.entries(balances).map(([mintUrl, unitBalances]) => [
			mintUrl,
			Object.fromEntries(
				Object.entries(unitBalances).map(([unit, balance]) => [
					unit,
					rehydrateBalanceSnapshot(balance),
				]),
			),
		]),
	);
}

function rehydrateBalancesByUnit(balances: ManagerBalancesByUnitDto) {
	return Object.fromEntries(
		Object.entries(balances).map(([unit, balance]) => [
			unit,
			rehydrateBalanceSnapshot(balance),
		]),
	);
}

function rehydrateBalanceSnapshot(balance: ManagerBalanceSnapshotDto) {
	return {
		spendable: Amount.from(balance.spendable),
		reserved: Amount.from(balance.reserved),
		total: Amount.from(balance.total),
		unit: balance.unit,
	};
}

function rehydrateManagerEventPayload(event: ManagerEventDto) {
	if (event.event === "history:updated") {
		return {
			mintUrl: event.payload.mintUrl,
			entry: rehydrateHistoryEntry(event.payload.entry),
		};
	}

	if (event.event === "proofs:saved") {
		return {
			...event.payload,
			proofs: event.payload.proofs.map((proof) => ({
				...proof,
				amount: Amount.from(proof.amount),
			})),
		};
	}

	if (event.event === "proofs:reserved") {
		return {
			...event.payload,
			amount: {
				...event.payload.amount,
				amount: Amount.from(event.payload.amount.amount),
			},
		};
	}

	if (
		event.event === "mint-op:pending" ||
		event.event === "mint-op:executing" ||
		event.event === "mint-op:finalized" ||
		event.event === "mint-op:requeue"
	) {
		return {
			...event.payload,
			operation: rehydrateMintOperation(event.payload.operation),
		};
	}

	return event.payload;
}

function rehydrateHistoryEntry(entry: ManagerHistoryEntryDto): HistoryEntry {
	return {
		...entry,
		amount: Amount.from(entry.amount),
	} as HistoryEntry;
}

function rehydrateMintOperation(
	operation: ManagerMintOperationDto,
): MintOperationLike {
	return rehydrateAmountFields(operation) as MintOperationLike;
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

function rehydrateAmountFields(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(rehydrateAmountFields);
	}

	if (!input || typeof input !== "object") {
		return input;
	}

	return Object.fromEntries(
		Object.entries(input).map(([key, value]) => {
			if (
				AMOUNT_FIELD_NAMES.has(key) &&
				typeof value === "string" &&
				value.length > 0
			) {
				return [key, Amount.from(value)];
			}

			return [key, rehydrateAmountFields(value)];
		}),
	);
}

function stringifyAmount(input: unknown): string {
	if (typeof input === "string") {
		return input;
	}
	if (typeof input === "number" || typeof input === "bigint") {
		return input.toString();
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

	throw new Error("Cannot serialize mint operation amount value.");
}

function unsupportedAwareObject<TTarget extends object>(
	label: string,
	target: TTarget,
	options?: { allowProperties?: Set<PropertyKey> },
): TTarget {
	return new Proxy(target, {
		get(currentTarget, property, receiver) {
			if (
				property in currentTarget ||
				typeof property === "symbol" ||
				options?.allowProperties?.has(property)
			) {
				return Reflect.get(currentTarget, property, receiver);
			}

			throw new Error(
				`${label} does not support "${String(property)}" yet. Add it to the manager RPC contract before using it in the renderer.`,
			);
		},
	});
}
