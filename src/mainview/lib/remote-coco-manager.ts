import {
	Amount,
	type HistoryEntry,
	type Manager,
	type MeltOperation,
	type MeltQuote,
	type QuoteIdentity,
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
	ManagerCreateMeltQuoteParams,
	ManagerEventDto,
	ManagerEventName,
	ManagerEventPayloads,
	ManagerHistoryEntryDto,
	ManagerHistoryPaginationParams,
	ManagerListPendingMeltQuotesParams,
	ManagerMeltOperationDto,
	ManagerMeltQuoteDto,
	ManagerMintDto,
	ManagerEventSubscriptionDto,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
	ManagerMintOperationDto,
	ManagerMintOperationIdParams,
	ManagerMintOperationListByQuoteParams,
	ManagerMintOperationPrepareParams,
	ManagerOperationIdParams,
	ManagerPendingMintCheckResultDto,
	ManagerPrepareReceiveParams,
	ManagerPrepareMeltParams,
	ManagerPreparedReceiveOperationDto,
	ManagerQuoteIdentityDto,
	ManagerReceiveOperationDto,
	ManagerSendExecuteParams,
	ManagerSendExecuteResultDto,
	ManagerSendOperationEventName,
	ManagerSendOperationDto,
	ManagerSendOperationIdParams,
	ManagerSendPrepareParams,
	ManagerOperationIdWithReasonParams,
} from "@/lib/manager-rpc";

type RemoteManagerEventPayloads = Omit<
	ManagerEventPayloads,
	| "history:updated"
	| "mint-op:pending"
	| "mint-op:executing"
		| "mint-op:finalized"
		| "mint-op:requeue"
		| ManagerSendOperationEventName
		| "receive-op:prepared"
		| "receive-op:finalized"
		| "receive-op:rolled-back"
		| "melt-op:prepared"
		| "melt-op:pending"
		| "melt-op:finalized"
		| "melt-op:rolled-back"
		| "melt-quote:updated"
> & {
	"history:updated": {
		mintUrl: string;
		entry: HistoryEntry;
	};
	"mint-op:pending": ManagerMintOperationEventPayload;
	"mint-op:executing": ManagerMintOperationEventPayload;
	"mint-op:finalized": ManagerMintOperationEventPayload;
	"mint-op:requeue": ManagerMintOperationEventPayload;
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
	"melt-op:prepared": MeltOperationEventPayload;
	"melt-op:pending": MeltOperationEventPayload;
	"melt-op:finalized": MeltOperationEventPayload;
	"melt-op:rolled-back": MeltOperationEventPayload;
	"melt-quote:updated": {
		mintUrl: string;
		method: string;
		quoteId: string;
		quote: MeltQuote;
	};
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

type MeltOperationEventPayload = {
	mintUrl: string;
	operationId: string;
	operation: MeltOperation;
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

	readonly quotes = unsupportedAwareObject("Remote Coco manager quotes API", {
		melt: unsupportedAwareObject("Remote Coco manager melt quote API", {
			create: async (input: ManagerCreateMeltQuoteParams) =>
				rehydrateMeltQuote(
					await this.rpc.request.managerMeltQuoteCreate(
						dehydrateCreateMeltQuoteParams(input),
					),
				),
			get: async (input: QuoteIdentity) => {
				const quote = await this.rpc.request.managerMeltQuoteGet(
					dehydrateQuoteIdentity(input),
				);
				return quote ? rehydrateMeltQuote(quote) : null;
			},
			listPending: async (input?: ManagerListPendingMeltQuotesParams) =>
				(
					await this.rpc.request.managerMeltQuoteListPending(input)
				).map(rehydrateMeltQuote),
			refresh: async (input: QuoteIdentity) =>
				rehydrateMeltQuote(
					await this.rpc.request.managerMeltQuoteRefresh(
						dehydrateQuoteIdentity(input),
					),
				),
		}),
	});

	readonly ops = unsupportedAwareObject("Remote Coco manager operations API", {
		mint: unsupportedAwareObject("Remote Coco manager mint operations API", {
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
		melt: unsupportedAwareObject("Remote Coco manager melt operation API", {
			prepare: async (input: { quote: MeltQuote; feeIndex?: number }) =>
				rehydrateMeltOperation(
					await this.rpc.request.managerMeltPrepare({
						quote: dehydrateMeltQuoteRef(input.quote),
						feeIndex: input.feeIndex,
					}),
				),
			execute: async (operationOrId: MeltOperation | string) =>
				rehydrateMeltOperation(
					await this.rpc.request.managerMeltExecute({
						operationId: getMeltOperationId(operationOrId),
					}),
				),
			get: async (operationId: string) => {
				const operation = await this.rpc.request.managerMeltGet({
					operationId,
				});
				return operation ? rehydrateMeltOperation(operation) : null;
			},
			getByQuote: async (input: QuoteIdentity) => {
				const operation = await this.rpc.request.managerMeltGetByQuote(
					dehydrateQuoteIdentity(input),
				);
				return operation ? rehydrateMeltOperation(operation) : null;
			},
			listByQuote: async (input: QuoteIdentity) =>
				(
					await this.rpc.request.managerMeltListByQuote(
						dehydrateQuoteIdentity(input),
					)
				).map(rehydrateMeltOperation),
			listPrepared: async () =>
				(
					await this.rpc.request.managerMeltListPrepared()
				).map(rehydrateMeltOperation),
			listInFlight: async () =>
				(
					await this.rpc.request.managerMeltListInFlight()
				).map(rehydrateMeltOperation),
			refresh: async (operationId: string) =>
				rehydrateMeltOperation(
					await this.rpc.request.managerMeltRefresh({ operationId }),
				),
			cancel: (operationId: string, reason?: string) =>
				this.rpc.request.managerMeltCancel({ operationId, reason }),
			reclaim: (operationId: string, reason?: string) =>
				this.rpc.request.managerMeltReclaim({ operationId, reason }),
			finalize: (operationId: string) =>
				this.rpc.request.managerMeltFinalize({ operationId }),
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
		allowProperties: new Set([
			"mint",
			"wallet",
			"history",
			"quotes",
			"ops",
			"on",
			"off",
		]),
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

	if (
		event.event === "melt-op:prepared" ||
		event.event === "melt-op:pending" ||
		event.event === "melt-op:finalized" ||
		event.event === "melt-op:rolled-back"
	) {
		return {
			...event.payload,
			operation: rehydrateMeltOperation(event.payload.operation),
		};
	}

	if (event.event === "melt-quote:updated") {
		return {
			...event.payload,
			quote: rehydrateMeltQuote(event.payload.quote),
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

function rehydrateMeltQuote(quote: ManagerMeltQuoteDto): MeltQuote {
	return {
		...quote,
		amount: Amount.from(quote.amount),
		...(quote.fee_reserve === undefined
			? {}
			: { fee_reserve: Amount.from(quote.fee_reserve) }),
		...(Array.isArray(quote.fee_options)
			? { fee_options: rehydrateMeltFeeOptions(quote.fee_options) }
			: {}),
	} as unknown as MeltQuote;
}

function rehydrateMeltOperation(
	operation: ManagerMeltOperationDto,
): MeltOperation {
	return {
		...operation,
		methodData: rehydrateMeltMethodData(operation.methodData),
		...(operation.amount === undefined
			? {}
			: { amount: Amount.from(operation.amount) }),
		...(operation.fee_reserve === undefined
			? {}
			: { fee_reserve: Amount.from(operation.fee_reserve) }),
		...(operation.swap_fee === undefined
			? {}
			: { swap_fee: Amount.from(operation.swap_fee) }),
		...(operation.inputAmount === undefined
			? {}
			: { inputAmount: Amount.from(operation.inputAmount) }),
		...(operation.changeAmount === undefined
			? {}
			: { changeAmount: Amount.from(operation.changeAmount) }),
		...(operation.effectiveFee === undefined
			? {}
			: { effectiveFee: Amount.from(operation.effectiveFee) }),
	} as unknown as MeltOperation;
}

function rehydrateMeltMethodData(
	methodData: Record<string, unknown>,
): Record<string, unknown> {
	if (typeof methodData.amountSats !== "string") {
		return methodData;
	}

	return {
		...methodData,
		amountSats: Amount.from(methodData.amountSats),
	};
}

function rehydrateMeltFeeOptions(feeOptions: unknown[]): unknown[] {
	return feeOptions.map((feeOption) => {
		if (!feeOption || typeof feeOption !== "object") {
			return feeOption;
		}

		const feeOptionRecord = feeOption as Record<string, unknown>;
		if (typeof feeOptionRecord.fee_reserve !== "string") {
			return feeOption;
		}

		return {
			...feeOptionRecord,
			fee_reserve: Amount.from(feeOptionRecord.fee_reserve),
		};
	});
}

function dehydrateAmount(input: unknown): unknown {
	if (
		typeof input === "string" ||
		typeof input === "number" ||
		typeof input === "bigint"
	) {
		return input.toString();
	}

	if (!input || typeof input !== "object") {
		return input;
	}

	if ("toString" in input && typeof input.toString === "function") {
		const stringValue = input.toString();
		if (stringValue !== "[object Object]") {
			return stringValue;
		}
	}

	return input;
}

function dehydrateCreateMeltQuoteParams(
	input: ManagerCreateMeltQuoteParams,
): ManagerCreateMeltQuoteParams {
	return {
		...input,
		methodData: dehydrateMethodData(input.methodData),
	};
}

function dehydrateMethodData(
	methodData: Record<string, unknown>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(methodData).map(([key, value]) => [
			key,
			key === "amountSats" ? dehydrateAmount(value) : value,
		]),
	);
}

function dehydrateMeltQuoteRef(
	quote: MeltQuote,
): ManagerPrepareMeltParams["quote"] {
	return {
		mintUrl: quote.mintUrl,
		quoteId: quote.quoteId,
		method: quote.method,
	};
}

function dehydrateQuoteIdentity(input: QuoteIdentity): ManagerQuoteIdentityDto {
	return {
		mintUrl: input.mintUrl,
		quoteId: input.quoteId,
	};
}

function getMeltOperationId(operationOrId: MeltOperation | string): string {
	return typeof operationOrId === "string" ? operationOrId : operationOrId.id;
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
