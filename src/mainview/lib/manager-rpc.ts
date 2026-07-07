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

export type ManagerMintOperationEventName =
	| "mint-op:pending"
	| "mint-op:executing"
	| "mint-op:finalized"
	| "mint-op:requeue";

export type ManagerEventName =
	| ManagerMintEventName
	| ManagerBalanceRefreshEventName
	| ManagerHistoryEventName
	| ManagerMintOperationEventName;

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

export type ManagerMintOperationDto = Record<string, unknown> & {
	id: string;
	mintUrl: string;
	method: ManagerMintMethod;
	state: string;
	amount?: string;
	unit?: string;
	quoteId?: string;
	request?: string;
	expiry?: number | null;
	error?: string;
	createdAt: number;
	updatedAt: number;
};

export type ManagerPendingMintCheckResultDto = Record<string, unknown> & {
	observedRemoteState?: unknown;
	observedRemoteStateAt: number;
	quoteSnapshot?: Record<string, unknown>;
	category: string;
	terminalFailure?: {
		reason: string;
		code?: string;
		retryable?: boolean;
		observedAt: number;
	};
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
	"mint-op:pending": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMintOperationDto;
	};
	"mint-op:executing": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMintOperationDto;
	};
	"mint-op:finalized": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMintOperationDto;
	};
	"mint-op:requeue": {
		mintUrl: string;
		operationId: string;
		operation: ManagerMintOperationDto;
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

export type ManagerMintOperationPrepareParams = {
	quote: {
		mintUrl: string;
		method: ManagerMintMethod;
		quoteId: string;
	};
	amount: string;
};

export type ManagerMintOperationIdParams = {
	operationId: string;
};

export type ManagerMintOperationListByQuoteParams = {
	mintUrl: string;
	quoteId: string;
};

export type ManagerMintMethod = "bolt11" | "onchain" | "bolt12";

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
	managerMintOpsPrepare: {
		params: ManagerMintOperationPrepareParams;
		response: ManagerMintOperationDto;
	};
	managerMintOpsRefresh: {
		params: ManagerMintOperationIdParams;
		response: ManagerMintOperationDto;
	};
	managerMintOpsExecute: {
		params: ManagerMintOperationIdParams;
		response: ManagerMintOperationDto;
	};
	managerMintOpsCheckPayment: {
		params: ManagerMintOperationIdParams;
		response: ManagerPendingMintCheckResultDto;
	};
	managerMintOpsFinalize: {
		params: ManagerMintOperationIdParams;
		response: ManagerMintOperationDto;
	};
	managerMintOpsGet: {
		params: ManagerMintOperationIdParams;
		response: ManagerMintOperationDto | null;
	};
	managerMintOpsListByQuote: {
		params: ManagerMintOperationListByQuoteParams;
		response: ManagerMintOperationDto[];
	};
	managerMintOpsListPending: {
		params: undefined;
		response: ManagerMintOperationDto[];
	};
	managerMintOpsListInFlight: {
		params: undefined;
		response: ManagerMintOperationDto[];
	};
};

export type ManagerRpcBunMessages = {
	managerEventSubscribe: ManagerEventSubscriptionDto;
	managerEventUnsubscribe: ManagerEventSubscriptionDto;
};

export type ManagerRpcWebviewMessages = {
	managerEvent: ManagerEventDto;
};
