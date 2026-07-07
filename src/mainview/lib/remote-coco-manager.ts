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
	ManagerSendExecuteParams,
	ManagerSendExecuteResultDto,
	ManagerSendOperationEventName,
	ManagerSendOperationDto,
	ManagerSendOperationIdParams,
	ManagerSendPrepareParams,
} from "@/lib/manager-rpc";

type RemoteManagerEventPayloads = Omit<
	ManagerEventPayloads,
	"history:updated" | ManagerSendOperationEventName
> & {
	"history:updated": {
		mintUrl: string;
		entry: HistoryEntry;
	};
	"send:prepared": {
		mintUrl: string;
		operationId: string;
		operation: RemoteSendOperation;
	};
	"send:pending": {
		mintUrl: string;
		operationId: string;
		operation: RemoteSendOperation;
		token: unknown;
	};
	"send:finalized": {
		mintUrl: string;
		operationId: string;
		operation: RemoteSendOperation;
	};
	"send:rolled-back": {
		mintUrl: string;
		operationId: string;
		operation: RemoteSendOperation;
	};
};

type ManagerEventHandler<TEventName extends ManagerEventName> = (
	payload: RemoteManagerEventPayloads[TEventName],
) => void | Promise<void>;

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

	readonly ops = unsupportedAwareObject("Remote Coco manager operations API", {
		send: unsupportedAwareObject("Remote Coco manager send operations API", {
			prepare: async (input: RemotePrepareSendInput) =>
				rehydrateSendOperation(
					await this.rpc.request.managerSendPrepare(
						serializePrepareSendInput(input),
					),
				),
			execute: async (
				operationOrId: RemoteSendOperation | string,
				options?: { memo?: string },
			) => {
				const result = await this.rpc.request.managerSendExecute({
					operationId: getOperationId(operationOrId),
					options,
				});
				return {
					operation: rehydrateSendOperation(result.operation),
					token: result.token,
				};
			},
			get: async (operationId: string) => {
				const operation = await this.rpc.request.managerSendGet({ operationId });
				return operation ? rehydrateSendOperation(operation) : null;
			},
			listPrepared: async () => {
				const operations = await this.rpc.request.managerSendListPrepared();
				return operations.map(rehydrateSendOperation);
			},
			listInFlight: async () => {
				const operations = await this.rpc.request.managerSendListInFlight();
				return operations.map(rehydrateSendOperation);
			},
			refresh: async (operationId: string) =>
				rehydrateSendOperation(
					await this.rpc.request.managerSendRefresh({ operationId }),
				),
			cancel: (operationId: string) =>
				this.rpc.request.managerSendCancel({ operationId }),
			reclaim: (operationId: string) =>
				this.rpc.request.managerSendReclaim({ operationId }),
			finalize: (operationId: string) =>
				this.rpc.request.managerSendFinalize({ operationId }),
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
		event.event === "send:prepared" ||
		event.event === "send:finalized" ||
		event.event === "send:rolled-back"
	) {
		return {
			...event.payload,
			operation: rehydrateSendOperation(event.payload.operation),
		};
	}

	if (event.event === "send:pending") {
		return {
			...event.payload,
			operation: rehydrateSendOperation(event.payload.operation),
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

type RemoteSendOperation = Omit<
	ManagerSendOperationDto,
	"amount" | "fee" | "inputAmount"
> & {
	amount: Amount;
	fee?: Amount;
	inputAmount?: Amount;
};

type RemotePrepareSendInput = {
	mintUrl: string;
	amount: AmountInput;
	unit?: string;
	target?: unknown;
};

type AmountInput =
	| string
	| number
	| bigint
	| {
			amount?: string | number | bigint | { toString: () => string };
			unit?: string;
			toString?: () => string;
	  };

function serializePrepareSendInput(
	input: RemotePrepareSendInput,
): ManagerSendPrepareParams {
	const amount = serializeAmountInput(input.amount);
	const amountUnit =
		typeof input.amount === "object" && input.amount !== null
			? input.amount.unit
			: undefined;

	return {
		mintUrl: input.mintUrl,
		amount,
		unit: input.unit ?? amountUnit,
		target: input.target,
	};
}

function serializeAmountInput(input: AmountInput): string {
	if (typeof input === "string") {
		return input;
	}

	if (typeof input === "number" || typeof input === "bigint") {
		return input.toString();
	}

	if (input.amount !== undefined) {
		return serializeAmountInput(input.amount);
	}

	if (typeof input.toString === "function") {
		return input.toString();
	}

	throw new Error("Cannot serialize remote manager amount input.");
}

function getOperationId(operationOrId: RemoteSendOperation | string): string {
	return typeof operationOrId === "string" ? operationOrId : operationOrId.id;
}

function rehydrateSendOperation(
	operation: ManagerSendOperationDto,
): RemoteSendOperation {
	return {
		...operation,
		amount: Amount.from(operation.amount),
		fee:
			operation.fee === undefined ? undefined : Amount.from(operation.fee),
		inputAmount:
			operation.inputAmount === undefined
				? undefined
				: Amount.from(operation.inputAmount),
	};
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
