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

export type ManagerEventName =
	| ManagerMintEventName
	| ManagerBalanceRefreshEventName;

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
};

export type ManagerRpcBunMessages = {
	managerEventSubscribe: ManagerEventSubscriptionDto;
	managerEventUnsubscribe: ManagerEventSubscriptionDto;
};

export type ManagerRpcWebviewMessages = {
	managerEvent: ManagerEventDto;
};
