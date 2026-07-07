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
