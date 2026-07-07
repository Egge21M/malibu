export type ManagerMintDto = {
	mintUrl: string;
	name: string;
	mintInfo: unknown;
	trusted: boolean;
	createdAt: number;
	updatedAt: number;
};

export type ManagerKeysetDto = {
	mintUrl: string;
	id: string;
	unit: string;
	keypairs: Record<string, string>;
	active: boolean;
	feePpk: number;
	updatedAt: number;
};

export type ManagerMintEventName =
	| "mint:added"
	| "mint:updated"
	| "mint:trusted"
	| "mint:untrusted";

export type ManagerBalanceRefreshEventName =
	| "proofs:saved"
	| "proofs:state-changed"
	| "proofs:reserved"
	| "proofs:released";

export type ManagerHistoryType = "mint" | "melt" | "send" | "receive";

export type ManagerHistoryEventName = "history:updated";

export type ManagerMeltEventName =
	| "melt-op:prepared"
	| "melt-op:pending"
	| "melt-op:finalized"
	| "melt-op:rolled-back"
	| "melt-quote:updated";

export type ManagerEventName =
	| ManagerMintEventName
	| ManagerBalanceRefreshEventName
	| ManagerHistoryEventName
	| ManagerMeltEventName;

export type ManagerMintWithKeysetsDto = {
	mint: ManagerMintDto;
	keysets: ManagerKeysetDto[];
};

export type ManagerBalanceScopeDto = {
	mintUrls?: string[];
	units?: string[];
	trustedOnly?: boolean;
};

export type ManagerBalanceSnapshotDto = {
	spendable: string;
	reserved: string;
	total: string;
	unit: string;
};

export type ManagerBalancesByMintDto = Record<string, ManagerBalanceSnapshotDto>;

export type ManagerBalancesByMintAndUnitDto = Record<
	string,
	Record<string, ManagerBalanceSnapshotDto>
>;

export type ManagerBalancesByUnitDto = Record<string, ManagerBalanceSnapshotDto>;

export type ManagerProofDto = Record<string, unknown> & {
	amount: string;
	mintUrl: string;
	unit: string;
	state: string;
};

export type ManagerUnitAmountDto = {
	amount: string;
	unit: string;
};

export type ManagerHistoryEntryDto = {
	id: string;
	type: ManagerHistoryType;
	source: "operation" | "legacy";
	createdAt: number;
	updatedAt: number;
	mintUrl: string;
	unit: string;
	state: string;
	amount: string;
	metadata?: Record<string, string>;
	error?: string;
	operationId?: string;
	legacyHistoryId?: string;
	paymentRequest?: string;
	quoteId?: string;
	remoteState?: string;
	token?: unknown;
};

export type ManagerQuoteIdentityDto = {
	mintUrl: string;
	quoteId: string;
};

export type ManagerMeltMethod = "bolt11" | "bolt12" | "onchain";

export type ManagerMeltQuoteDto = Record<string, unknown> & {
	mintUrl: string;
	method: ManagerMeltMethod | string;
	quoteId: string;
	quote?: string;
	request: string;
	amount: string;
	unit: string;
	expiry: number;
	state: string;
	fee_reserve?: string;
	createdAt: number;
	updatedAt: number;
};

export type ManagerMeltOperationDto = Record<string, unknown> & {
	id: string;
	mintUrl: string;
	method: ManagerMeltMethod | string;
	methodData: Record<string, unknown>;
	unit: string;
	state: string;
	createdAt: number;
	updatedAt: number;
	error?: string;
	quoteId?: string;
	needsSwap?: boolean;
	amount?: string;
	fee_reserve?: string;
	swap_fee?: string;
	inputAmount?: string;
	inputProofSecrets?: string[];
	changeAmount?: string;
	effectiveFee?: string;
};

export type ManagerCreateMeltQuoteParams = {
	mintUrl: string;
	method: ManagerMeltMethod | string;
	methodData: Record<string, unknown>;
	unit?: string;
};

export type ManagerListPendingMeltQuotesParams = {
	method?: ManagerMeltMethod | string;
};

export type ManagerPrepareMeltParams = {
	quote: ManagerQuoteIdentityDto & {
		method: ManagerMeltMethod | string;
	};
	feeIndex?: number;
};

export type ManagerOperationIdParams = {
	operationId: string;
};

export type ManagerOperationIdWithReasonParams = ManagerOperationIdParams & {
	reason?: string;
};

export type ManagerEventPayloads = {
	"mint:added": ManagerMintWithKeysetsDto;
	"mint:updated": ManagerMintWithKeysetsDto;
	"mint:trusted": { mintUrl: string };
	"mint:untrusted": { mintUrl: string };
	"proofs:saved": {
		mintUrl: string;
		keysetId: string;
		proofs: ManagerProofDto[];
	};
	"proofs:state-changed": {
		mintUrl: string;
		secrets: string[];
		state: string;
	};
	"proofs:reserved": {
		mintUrl: string;
		operationId: string;
		secrets: string[];
		amount: ManagerUnitAmountDto;
	};
	"proofs:released": {
		mintUrl: string;
		secrets: string[];
	};
	"history:updated": {
		mintUrl: string;
		entry: ManagerHistoryEntryDto;
	};
	"melt-op:prepared": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMeltOperationDto;
	};
	"melt-op:pending": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMeltOperationDto;
	};
	"melt-op:finalized": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMeltOperationDto;
	};
	"melt-op:rolled-back": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMeltOperationDto;
	};
	"melt-quote:updated": {
		mintUrl: string;
		method: ManagerMeltMethod | string;
		quoteId: string;
		quote: ManagerMeltQuoteDto;
	};
};

export type ManagerEventSubscriptionDto = {
	event: ManagerEventName;
};

export type ManagerEventDto<
	TEventName extends ManagerEventName = ManagerEventName,
> = {
	[TName in TEventName]: {
		event: TName;
		payload: ManagerEventPayloads[TName];
	};
}[TEventName];

export type ManagerAddMintParams = {
	mintUrl: string;
	options?: {
		trusted?: boolean;
	};
};

export type ManagerMintUrlParams = {
	mintUrl: string;
};

export type ManagerHistoryPaginationParams = {
	offset?: number;
	limit?: number;
};

export type ManagerRpcRequests = {
	managerMintGetAllMints: {
		params: undefined;
		response: ManagerMintDto[];
	};
	managerMintAddMint: {
		params: ManagerAddMintParams;
		response: ManagerMintWithKeysetsDto;
	};
	managerMintTrustMint: {
		params: ManagerMintUrlParams;
		response: void;
	};
	managerMintUntrustMint: {
		params: ManagerMintUrlParams;
		response: void;
	};
	managerMintIsTrustedMint: {
		params: ManagerMintUrlParams;
		response: boolean;
	};
	managerWalletBalancesByMint: {
		params: ManagerBalanceScopeDto | undefined;
		response: ManagerBalancesByMintDto;
	};
	managerWalletBalancesByMintAndUnit: {
		params: ManagerBalanceScopeDto | undefined;
		response: ManagerBalancesByMintAndUnitDto;
	};
	managerWalletBalancesByUnit: {
		params: ManagerBalanceScopeDto | undefined;
		response: ManagerBalancesByUnitDto;
	};
	managerWalletBalancesTotal: {
		params: ManagerBalanceScopeDto | undefined;
		response: ManagerBalanceSnapshotDto;
	};
	managerWalletBalancesTotalByUnit: {
		params: ManagerBalanceScopeDto | undefined;
		response: ManagerBalancesByUnitDto;
	};
	managerHistoryGetPaginatedHistory: {
		params: ManagerHistoryPaginationParams;
		response: ManagerHistoryEntryDto[];
	};
	managerMeltQuoteCreate: {
		params: ManagerCreateMeltQuoteParams;
		response: ManagerMeltQuoteDto;
	};
	managerMeltQuoteGet: {
		params: ManagerQuoteIdentityDto;
		response: ManagerMeltQuoteDto | null;
	};
	managerMeltQuoteListPending: {
		params: ManagerListPendingMeltQuotesParams | undefined;
		response: ManagerMeltQuoteDto[];
	};
	managerMeltQuoteRefresh: {
		params: ManagerQuoteIdentityDto;
		response: ManagerMeltQuoteDto;
	};
	managerMeltPrepare: {
		params: ManagerPrepareMeltParams;
		response: ManagerMeltOperationDto;
	};
	managerMeltExecute: {
		params: ManagerOperationIdParams;
		response: ManagerMeltOperationDto;
	};
	managerMeltGet: {
		params: ManagerOperationIdParams;
		response: ManagerMeltOperationDto | null;
	};
	managerMeltGetByQuote: {
		params: ManagerQuoteIdentityDto;
		response: ManagerMeltOperationDto | null;
	};
	managerMeltListByQuote: {
		params: ManagerQuoteIdentityDto;
		response: ManagerMeltOperationDto[];
	};
	managerMeltListPrepared: {
		params: undefined;
		response: ManagerMeltOperationDto[];
	};
	managerMeltListInFlight: {
		params: undefined;
		response: ManagerMeltOperationDto[];
	};
	managerMeltRefresh: {
		params: ManagerOperationIdParams;
		response: ManagerMeltOperationDto;
	};
	managerMeltCancel: {
		params: ManagerOperationIdWithReasonParams;
		response: void;
	};
	managerMeltReclaim: {
		params: ManagerOperationIdWithReasonParams;
		response: void;
	};
	managerMeltFinalize: {
		params: ManagerOperationIdParams;
		response: void;
	};
};

export type ManagerRpcBunMessages = {
	managerEventSubscribe: ManagerEventSubscriptionDto;
	managerEventUnsubscribe: ManagerEventSubscriptionDto;
};

export type ManagerRpcWebviewMessages = {
	managerEvent: ManagerEventDto;
};
