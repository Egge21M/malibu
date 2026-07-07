import type { Token } from "@cashu/cashu-ts";

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

export type ManagerSendOperationEventName =
	| "send:prepared"
	| "send:pending"
	| "send:finalized"
	| "send:rolled-back";

export type ManagerReceiveOperationEventName =
	| "receive-op:prepared"
	| "receive-op:finalized"
	| "receive-op:rolled-back";

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
	| ManagerMintOperationEventName
	| ManagerSendOperationEventName
	| ManagerReceiveOperationEventName
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

export type ManagerRestoreMintParams = {
	mintUrl: string;
	options?: {
		units?: string[];
	};
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

export type ManagerSendOperationState =
	| "init"
	| "prepared"
	| "executing"
	| "pending"
	| "finalized"
	| "rolling_back"
	| "rolled_back";

export type ManagerSendOperationDto = {
	id: string;
	mintUrl: string;
	amount: string;
	unit: string;
	method: string;
	methodData: unknown;
	state: ManagerSendOperationState;
	createdAt: number;
	updatedAt: number;
	error?: string;
	needsSwap?: boolean;
	fee?: string;
	inputAmount?: string;
	inputProofSecrets?: string[];
	outputData?: unknown;
	token?: unknown;
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

export type ManagerMintQuoteDto = Record<string, unknown> & {
	mintUrl: string;
	method: ManagerMintMethod | string;
	quoteId: string;
	request: string;
	amount?: string;
	unit: string;
	expiry: number | null;
	state?: string;
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

export type ManagerReceiveOperationStateDto =
	| "init"
	| "prepared"
	| "executing"
	| "finalized"
	| "rolled_back";

export type ManagerReceiveOperationSourceDto =
	| {
			type: "manual-token";
		}
	| {
			type: "payment-request";
			requestOperationId: string;
			requestId?: string;
			attemptId: string;
			transport: "inband" | "nostr" | "post";
			transportMessageId?: string;
			senderPubkey?: string;
			memo?: string;
		};

export type ManagerReceiveOperationDto = {
	id: string;
	mintUrl: string;
	unit: string;
	amount: string;
	inputProofs: unknown[];
	createdAt: number;
	updatedAt: number;
	state: ManagerReceiveOperationStateDto;
	error?: string;
	source?: ManagerReceiveOperationSourceDto;
	fee?: string;
	outputData?: unknown;
};

export type ManagerPreparedReceiveOperationDto =
	ManagerReceiveOperationDto & {
		state: "prepared";
		fee: string;
		outputData: unknown;
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
	fee_options?: unknown[];
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
	"send:prepared": {
		mintUrl: string;
		operationId: string;
		operation: ManagerSendOperationDto;
	};
	"send:pending": {
		mintUrl: string;
		operationId: string;
		operation: ManagerSendOperationDto;
		token: unknown;
	};
	"send:finalized": {
		mintUrl: string;
		operationId: string;
		operation: ManagerSendOperationDto;
	};
	"send:rolled-back": {
		mintUrl: string;
		operationId: string;
		operation: ManagerSendOperationDto;
	};
	"receive-op:prepared": {
		mintUrl: string;
		operationId: string;
		operation: ManagerReceiveOperationDto;
	};
	"receive-op:finalized": {
		mintUrl: string;
		operationId: string;
		operation: ManagerReceiveOperationDto;
	};
	"receive-op:rolled-back": {
		mintUrl: string;
		operationId: string;
		operation: ManagerReceiveOperationDto;
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

export type ManagerCreateMintQuoteParams = {
	mintUrl: string;
	method: ManagerMintMethod | string;
	amount: {
		amount: string;
		unit: string;
	};
};

export type ManagerListPendingMintQuotesParams = {
	method?: ManagerMintMethod | string;
};

export type ManagerSendPrepareParams = {
	mintUrl: string;
	amount: string;
	unit?: string;
	target?: unknown;
};

export type ManagerSendOperationIdParams = {
	operationId: string;
};

export type ManagerSendExecuteParams = ManagerSendOperationIdParams & {
	options?: {
		memo?: string;
	};
};

export type ManagerSendExecuteResultDto = {
	operation: ManagerSendOperationDto;
	token: unknown;
};

export type ManagerPrepareReceiveParams = {
	token: Token | string;
};

export type ManagerOperationIdParams = {
	operationId: string;
};

export type ManagerCancelOperationParams = ManagerOperationIdParams & {
	reason?: string;
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

export type ManagerOperationIdWithReasonParams = ManagerOperationIdParams & {
	reason?: string;
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
	managerWalletRestore: {
		params: ManagerRestoreMintParams;
		response: void;
	};
	managerHistoryGetPaginatedHistory: {
		params: ManagerHistoryPaginationParams;
		response: ManagerHistoryEntryDto[];
	};
	managerMintQuoteCreate: {
		params: ManagerCreateMintQuoteParams;
		response: ManagerMintQuoteDto;
	};
	managerMintQuoteListPending: {
		params: ManagerListPendingMintQuotesParams | undefined;
		response: ManagerMintQuoteDto[];
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
	managerSendPrepare: {
		params: ManagerSendPrepareParams;
		response: ManagerSendOperationDto;
	};
	managerSendExecute: {
		params: ManagerSendExecuteParams;
		response: ManagerSendExecuteResultDto;
	};
	managerSendGet: {
		params: ManagerSendOperationIdParams;
		response: ManagerSendOperationDto | null;
	};
	managerSendListPrepared: {
		params: undefined;
		response: ManagerSendOperationDto[];
	};
	managerSendListInFlight: {
		params: undefined;
		response: ManagerSendOperationDto[];
	};
	managerSendRefresh: {
		params: ManagerSendOperationIdParams;
		response: ManagerSendOperationDto;
	};
	managerSendCancel: {
		params: ManagerSendOperationIdParams;
		response: void;
	};
	managerSendReclaim: {
		params: ManagerSendOperationIdParams;
		response: void;
	};
	managerSendFinalize: {
		params: ManagerSendOperationIdParams;
		response: void;
	};
	managerReceivePrepare: {
		params: ManagerPrepareReceiveParams;
		response: ManagerPreparedReceiveOperationDto;
	};
	managerReceiveExecute: {
		params: ManagerOperationIdParams;
		response: ManagerReceiveOperationDto;
	};
	managerReceiveGet: {
		params: ManagerOperationIdParams;
		response: ManagerReceiveOperationDto | null;
	};
	managerReceiveRefresh: {
		params: ManagerOperationIdParams;
		response: ManagerReceiveOperationDto;
	};
	managerReceiveCancel: {
		params: ManagerCancelOperationParams;
		response: void;
	};
	managerReceiveListPrepared: {
		params: undefined;
		response: ManagerPreparedReceiveOperationDto[];
	};
	managerReceiveListInFlight: {
		params: undefined;
		response: ManagerReceiveOperationDto[];
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
