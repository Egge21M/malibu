import {
	Amount,
	type HistoryEntry,
	type Manager,
	type ReceiveOperation,
} from "@cashu/coco-core";
import type {
	ManagerAddMintParams,
	ManagerBalanceScopeDto,
	ManagerBalanceSnapshotDto,
	ManagerBalancesByMintAndUnitDto,
	ManagerBalancesByMintDto,
	ManagerBalancesByUnitDto,
	ManagerCancelOperationParams,
	ManagerEventDto,
	ManagerEventName,
	ManagerEventPayloads,
	ManagerHistoryEntryDto,
	ManagerHistoryPaginationParams,
	ManagerMintDto,
	ManagerEventSubscriptionDto,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
	ManagerOperationIdParams,
	ManagerPrepareReceiveParams,
	ManagerPreparedReceiveOperationDto,
	ManagerReceiveOperationDto,
} from "@/lib/manager-rpc";

type RemoteManagerEventPayloads = Omit<
	ManagerEventPayloads,
	| "history:updated"
	| "receive-op:prepared"
	| "receive-op:finalized"
	| "receive-op:rolled-back"
> & {
	"history:updated": {
		mintUrl: string;
		entry: HistoryEntry;
	};
	"receive-op:prepared": {
		mintUrl: string;
		operationId: string;
		operation: ReceiveOperation;
	};
	"receive-op:finalized": {
		mintUrl: string;
		operationId: string;
		operation: ReceiveOperation;
	};
	"receive-op:rolled-back": {
		mintUrl: string;
		operationId: string;
		operation: ReceiveOperation;
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
		managerReceivePrepare: (
			params: ManagerPrepareReceiveParams,
		) => Promise<ManagerPreparedReceiveOperationDto>;
		managerReceiveExecute: (
			params: ManagerOperationIdParams,
		) => Promise<ManagerReceiveOperationDto>;
		managerReceiveGet: (
			params: ManagerOperationIdParams,
		) => Promise<ManagerReceiveOperationDto | null>;
		managerReceiveRefresh: (
			params: ManagerOperationIdParams,
		) => Promise<ManagerReceiveOperationDto>;
		managerReceiveCancel: (params: ManagerCancelOperationParams) => Promise<void>;
		managerReceiveListPrepared: () => Promise<ManagerPreparedReceiveOperationDto[]>;
		managerReceiveListInFlight: () => Promise<ManagerReceiveOperationDto[]>;
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
		receive: unsupportedAwareObject("Remote Coco manager receive ops API", {
			prepare: async (params: ManagerPrepareReceiveParams) =>
				rehydrateReceiveOperation(
					await this.rpc.request.managerReceivePrepare(params),
				),
			execute: async (operationOrId: ReceiveOperation | string) =>
				rehydrateReceiveOperation(
					await this.rpc.request.managerReceiveExecute({
						operationId: operationIdFrom(operationOrId),
					}),
				),
			get: async (operationId: string) => {
				const operation = await this.rpc.request.managerReceiveGet({
					operationId,
				});
				return operation ? rehydrateReceiveOperation(operation) : null;
			},
			refresh: async (operationId: string) =>
				rehydrateReceiveOperation(
					await this.rpc.request.managerReceiveRefresh({ operationId }),
				),
			cancel: (operationId: string, reason?: string) =>
				this.rpc.request.managerReceiveCancel({ operationId, reason }),
			listPrepared: async () =>
				(await this.rpc.request.managerReceiveListPrepared()).map(
					rehydrateReceiveOperation,
				),
			listInFlight: async () =>
				(await this.rpc.request.managerReceiveListInFlight()).map(
					rehydrateReceiveOperation,
				),
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
		event.event === "receive-op:prepared" ||
		event.event === "receive-op:finalized" ||
		event.event === "receive-op:rolled-back"
	) {
		return {
			...event.payload,
			operation: rehydrateReceiveOperation(event.payload.operation),
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

function rehydrateReceiveOperation(
	operation: ManagerReceiveOperationDto,
): ReceiveOperation {
	return {
		...operation,
		amount: Amount.from(operation.amount),
		...(operation.fee === undefined ? {} : { fee: Amount.from(operation.fee) }),
	} as ReceiveOperation;
}

function operationIdFrom(operationOrId: ReceiveOperation | string): string {
	if (typeof operationOrId === "string") {
		return operationOrId;
	}

	return operationOrId.id;
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
