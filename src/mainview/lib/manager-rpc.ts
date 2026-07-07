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

export type ManagerSendOperationEventName =
	| "send:prepared"
	| "send:pending"
	| "send:finalized"
	| "send:rolled-back";

export type ManagerEventName =
	| ManagerMintEventName
	| ManagerBalanceRefreshEventName
	| ManagerHistoryEventName
	| ManagerSendOperationEventName;

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
};

export type ManagerRpcBunMessages = {
	managerEventSubscribe: ManagerEventSubscriptionDto;
	managerEventUnsubscribe: ManagerEventSubscriptionDto;
};

export type ManagerRpcWebviewMessages = {
	managerEvent: ManagerEventDto;
};
