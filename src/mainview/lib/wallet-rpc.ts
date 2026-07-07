import type {
	ManagerRpcBunMessages,
	ManagerRpcRequests,
	ManagerRpcWebviewMessages,
} from "@/lib/manager-rpc";

export type BalanceSnapshotDto = {
	spendable: string;
	reserved: string;
	total: string;
	unit: string;
};

export type MintDto = {
	mintUrl: string;
	name: string;
	trusted: boolean;
	createdAt: number;
	updatedAt: number;
};

export type MintBalanceDto = {
	mintUrl: string;
	unit: string;
	spendable: string;
	reserved: string;
	total: string;
};

export type WalletQuoteDto = {
	quoteId: string;
	method: string;
	mintUrl: string;
	request: string;
	unit: string;
	amount?: string;
	state?: string;
	expiry?: number | null;
	feeReserve?: string;
	createdAt: number;
	updatedAt: number;
};

export type WalletOperationType = "mint" | "send" | "receive" | "melt";

export type WalletOperationDto = {
	id: string;
	type: WalletOperationType;
	state: string;
	mintUrl: string;
	unit: string;
	amount?: string;
	fee?: string;
	inputAmount?: string;
	needsSwap?: boolean;
	quoteId?: string;
	request?: string;
	token?: string;
	error?: string;
	createdAt: number;
	updatedAt: number;
};

export type WalletHistoryDto = {
	id: string;
	type: WalletOperationType;
	source: "operation" | "legacy";
	state: string;
	mintUrl: string;
	unit: string;
	amount: string;
	operationId?: string;
	quoteId?: string;
	error?: string;
	createdAt: number;
	updatedAt: number;
};

export type WalletSnapshot = {
	dataDir: string;
	totalByUnit: BalanceSnapshotDto[];
	balances: MintBalanceDto[];
	mints: MintDto[];
	pendingQuotes: WalletQuoteDto[];
	operations: WalletOperationDto[];
	history: WalletHistoryDto[];
};

export type WalletActionResult<TData = undefined> = {
	data: TData;
	snapshot: WalletSnapshot;
};

export type AddMintParams = {
	mintUrl: string;
	trusted: boolean;
};

export type CreateMintQuoteParams = {
	mintUrl: string;
	amount: string;
	unit: string;
};

export type OperationIdParams = {
	operationId: string;
};

export type PrepareSendParams = {
	mintUrl: string;
	amount: string;
	unit: string;
};

export type ExecuteSendParams = {
	operationId: string;
	memo?: string;
};

export type PrepareReceiveParams = {
	token: string;
};

export type PrepareMeltParams = {
	mintUrl: string;
	invoice: string;
	unit: string;
};

export type WalletRpcSchema = {
	bun: {
		requests: ManagerRpcRequests & {
			snapshot: {
				params: undefined;
				response: WalletSnapshot;
			};
			addMint: {
				params: AddMintParams;
				response: WalletSnapshot;
			};
			restoreMint: {
				params: { mintUrl: string; units?: string[] };
				response: WalletSnapshot;
			};
			createMintQuote: {
				params: CreateMintQuoteParams;
				response: WalletActionResult<{
					quote: WalletQuoteDto;
					operation: WalletOperationDto;
				}>;
			};
			refreshMintOperation: {
				params: OperationIdParams;
				response: WalletActionResult<WalletOperationDto>;
			};
			prepareSend: {
				params: PrepareSendParams;
				response: WalletActionResult<WalletOperationDto>;
			};
			executeSend: {
				params: ExecuteSendParams;
				response: WalletActionResult<{
					operation: WalletOperationDto;
					token: string;
				}>;
			};
			cancelSend: {
				params: OperationIdParams;
				response: WalletSnapshot;
			};
			reclaimSend: {
				params: OperationIdParams;
				response: WalletSnapshot;
			};
			prepareReceive: {
				params: PrepareReceiveParams;
				response: WalletActionResult<WalletOperationDto>;
			};
			executeReceive: {
				params: OperationIdParams;
				response: WalletActionResult<WalletOperationDto>;
			};
			cancelReceive: {
				params: OperationIdParams;
				response: WalletSnapshot;
			};
			prepareMelt: {
				params: PrepareMeltParams;
				response: WalletActionResult<{
					quote: WalletQuoteDto;
					operation: WalletOperationDto;
				}>;
			};
			executeMelt: {
				params: OperationIdParams;
				response: WalletActionResult<WalletOperationDto>;
			};
			cancelMelt: {
				params: OperationIdParams;
				response: WalletSnapshot;
			};
			refreshMeltOperation: {
				params: OperationIdParams;
				response: WalletActionResult<WalletOperationDto>;
			};
		};
		messages: ManagerRpcBunMessages;
	};
	webview: {
		requests: {};
		messages: ManagerRpcWebviewMessages;
	};
};
