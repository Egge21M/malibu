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

export type ManagerHistoryType = "mint" | "melt" | "send" | "receive";

export type ManagerHistoryEventName = "history:updated";

export type ManagerEventName = ManagerMintEventName | ManagerHistoryEventName;

export type ManagerMintWithKeysetsDto = {
	mint: ManagerMintDto;
	keysets: ManagerKeysetDto[];
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

export type ManagerHistoryEventPayloads = {
	"history:updated": {
		mintUrl: string;
		entry: ManagerHistoryEntryDto;
	};
};

export type ManagerEventPayloads = {
	"mint:added": ManagerMintWithKeysetsDto;
	"mint:updated": ManagerMintWithKeysetsDto;
	"mint:trusted": { mintUrl: string };
	"mint:untrusted": { mintUrl: string };
} & ManagerHistoryEventPayloads;

export type ManagerMintEventSubscriptionDto = {
	event: ManagerMintEventName;
};

export type ManagerHistoryEventSubscriptionDto = {
	event: ManagerHistoryEventName;
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
	managerHistoryGetPaginatedHistory: {
		params: ManagerHistoryPaginationParams;
		response: ManagerHistoryEntryDto[];
	};
};

export type ManagerRpcBunMessages = {
	managerMintEventSubscribe: ManagerMintEventSubscriptionDto;
	managerMintEventUnsubscribe: ManagerMintEventSubscriptionDto;
	managerHistoryEventSubscribe: ManagerHistoryEventSubscriptionDto;
	managerHistoryEventUnsubscribe: ManagerHistoryEventSubscriptionDto;
};

export type ManagerRpcWebviewMessages = {
	managerEvent: ManagerEventDto;
};
