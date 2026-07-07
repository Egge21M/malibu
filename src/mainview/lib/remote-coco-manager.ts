import {
	Amount,
	type HistoryEntry,
	type Manager,
	type MeltOperation,
	type MeltQuote,
	type QuoteIdentity,
} from "@cashu/coco-core";
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
} from "@/lib/manager-rpc";

type RemoteManagerEventPayloads = Omit<
	ManagerEventPayloads,
	| "history:updated"
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

type MeltOperationEventPayload = {
	mintUrl: string;
	operationId: string;
	operation: MeltOperation;
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

	readonly ops = unsupportedAwareObject("Remote Coco manager ops API", {
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
						operationId: getOperationId(operationOrId),
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

	return event.payload;
}

function rehydrateHistoryEntry(entry: ManagerHistoryEntryDto): HistoryEntry {
	return {
		...entry,
		amount: Amount.from(entry.amount),
	} as HistoryEntry;
}

function rehydrateMeltQuote(quote: ManagerMeltQuoteDto): MeltQuote {
	return rehydrateAmountFields(quote, ["amount", "fee_reserve"]) as unknown as MeltQuote;
}

function rehydrateMeltOperation(
	operation: ManagerMeltOperationDto,
): MeltOperation {
	return rehydrateAmountFields(operation, [
		"amount",
		"fee_reserve",
		"swap_fee",
		"inputAmount",
		"changeAmount",
		"effectiveFee",
	]) as unknown as MeltOperation;
}

function rehydrateAmountFields<TValue extends Record<string, unknown>>(
	value: TValue,
	fields: string[],
): TValue {
	const rehydrated: Record<string, unknown> = { ...value };
	for (const field of fields) {
		const fieldValue = rehydrated[field];
		if (typeof fieldValue === "string") {
			rehydrated[field] = Amount.from(fieldValue);
		}
	}

	return rehydrated as TValue;
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

function getOperationId(operationOrId: MeltOperation | string): string {
	return typeof operationOrId === "string" ? operationOrId : operationOrId.id;
}

function dehydrateAmount(input: unknown): unknown {
	if (
		typeof input === "string" ||
		typeof input === "number" ||
		typeof input === "bigint"
	) {
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

	return input;
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
