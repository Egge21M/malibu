import type { Manager } from "@cashu/coco-core";
import type {
	ManagerAddMintParams,
	ManagerBalanceScopeDto,
	ManagerBalanceSnapshotDto,
	ManagerBalancesByMintAndUnitDto,
	ManagerBalancesByMintDto,
	ManagerBalancesByUnitDto,
	ManagerCancelOperationParams,
	ManagerCreateMintQuoteParams,
	ManagerCreateMeltQuoteParams,
	ManagerEventDto,
	ManagerEventName,
	ManagerEventPayloads,
	ManagerHistoryEntryDto,
	ManagerHistoryPaginationParams,
	ManagerKeysetDto,
	ManagerListPendingMintQuotesParams,
	ManagerListPendingMeltQuotesParams,
	ManagerMeltOperationDto,
	ManagerMeltQuoteDto,
	ManagerMintDto,
	ManagerEventSubscriptionDto,
	ManagerMintQuoteDto,
	ManagerMintOperationDto,
	ManagerMintOperationIdParams,
	ManagerMintOperationListByQuoteParams,
	ManagerMintOperationPrepareParams,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
	ManagerOperationIdParams,
	ManagerPendingMintCheckResultDto,
	ManagerPrepareReceiveParams,
	ManagerPreparedReceiveOperationDto,
	ManagerProofDto,
	ManagerReceiveOperationDto,
	ManagerRestoreMintParams,
	ManagerSendExecuteParams,
	ManagerSendExecuteResultDto,
	ManagerSendOperationDto,
	ManagerSendOperationIdParams,
	ManagerSendPrepareParams,
	ManagerOperationIdWithReasonParams,
	ManagerPrepareMeltParams,
	ManagerQuoteIdentityDto,
} from "../mainview/lib/manager-rpc.ts";

type ManagerSendPrepareInput = Parameters<Manager["ops"]["send"]["prepare"]>[0];

type ManagerMintLike = {
	mintUrl: string;
	name?: string;
	mintInfo?: unknown;
	trusted: boolean;
	createdAt: number;
	updatedAt: number;
};

type ManagerKeysetLike = {
	mintUrl: string;
	id: string;
	unit: string;
	keypairs?: Record<string, string>;
	active: boolean;
	feePpk?: number;
	updatedAt: number;
};

type ManagerMintApiLike = {
	getAllMints: () => Promise<ManagerMintLike[]>;
	addMint: (
		mintUrl: string,
		options?: { trusted?: boolean },
	) => Promise<{
		mint: ManagerMintLike;
		keysets: ManagerKeysetLike[];
	}>;
	trustMint: (mintUrl: string) => Promise<void>;
	untrustMint: (mintUrl: string) => Promise<void>;
	isTrustedMint: (mintUrl: string) => Promise<boolean>;
};

type ManagerBalanceSnapshotLike = {
	spendable: unknown;
	reserved: unknown;
	total: unknown;
	unit: string;
};

type ManagerBalancesByMintLike = Record<string, ManagerBalanceSnapshotLike>;

type ManagerBalancesByMintAndUnitLike = Record<
	string,
	Record<string, ManagerBalanceSnapshotLike>
>;

type ManagerBalancesByUnitLike = Record<string, ManagerBalanceSnapshotLike>;

type ManagerWalletBalancesApiLike = {
	byMint: (scope?: ManagerBalanceScopeDto) => Promise<ManagerBalancesByMintLike>;
	byMintAndUnit: (
		scope?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByMintAndUnitLike>;
	byUnit: (scope?: ManagerBalanceScopeDto) => Promise<ManagerBalancesByUnitLike>;
	total: (scope?: ManagerBalanceScopeDto) => Promise<ManagerBalanceSnapshotLike>;
	totalByUnit: (
		scope?: ManagerBalanceScopeDto,
	) => Promise<ManagerBalancesByUnitLike>;
};

type ManagerHistoryEntryLike = Omit<ManagerHistoryEntryDto, "amount"> & {
	amount: unknown;
};

type ManagerHistoryApiLike = {
	getPaginatedHistory: (
		offset?: number,
		limit?: number,
	) => Promise<ManagerHistoryEntryLike[]>;
};

type ManagerMintOperationLike = {
	id: string;
	mintUrl: string;
	method?: string;
	state: string;
	amount?: unknown;
	unit?: string;
	quoteId?: string;
	request?: string;
	expiry?: number | null;
	error?: string;
	createdAt: number;
	updatedAt: number;
};

type ManagerMintQuoteLike = {
	mintUrl: string;
	method: string;
	quoteId: string;
	request: string;
	unit: string;
	expiry: number | null;
	createdAt: number;
	updatedAt: number;
	amount?: unknown;
	state?: string;
};

type ManagerPendingMintCheckResultLike = {
	observedRemoteState?: unknown;
	observedRemoteStateAt: number;
	quoteSnapshot?: object;
	category: string;
	terminalFailure?: {
		reason: string;
		code?: string;
		retryable?: boolean;
		observedAt: number;
	};
};

type ManagerMintOpsApiLike = {
	prepare: (
		input: ManagerMintOperationPrepareParams,
	) => Promise<ManagerMintOperationLike>;
	refresh: (operationId: string) => Promise<ManagerMintOperationLike>;
	execute: (operationId: string) => Promise<ManagerMintOperationLike>;
	checkPayment: (
		operationId: string,
	) => Promise<ManagerPendingMintCheckResultLike>;
	finalize: (operationId: string) => Promise<ManagerMintOperationLike>;
	get: (operationId: string) => Promise<ManagerMintOperationLike | null>;
	listByQuote: (
		params: ManagerMintOperationListByQuoteParams,
	) => Promise<ManagerMintOperationLike[]>;
	listPending: () => Promise<ManagerMintOperationLike[]>;
	listInFlight: () => Promise<ManagerMintOperationLike[]>;
};

type ManagerSendOperationLike = Omit<
	ManagerSendOperationDto,
	"amount" | "fee" | "inputAmount"
> & {
	amount: unknown;
	fee?: unknown;
	inputAmount?: unknown;
};

type ManagerSendApiLike = {
	prepare: (input: ManagerSendPrepareInput) => Promise<ManagerSendOperationLike>;
	execute: (
		operationId: string,
		options?: { memo?: string },
	) => Promise<{
		operation: ManagerSendOperationLike;
		token: unknown;
	}>;
	get: (operationId: string) => Promise<ManagerSendOperationLike | null>;
	listPrepared: () => Promise<ManagerSendOperationLike[]>;
	listInFlight: () => Promise<ManagerSendOperationLike[]>;
	refresh: (operationId: string) => Promise<ManagerSendOperationLike>;
	cancel: (operationId: string) => Promise<void>;
	reclaim: (operationId: string) => Promise<void>;
	finalize: (operationId: string) => Promise<void>;
};

type ManagerReceiveOperationLike = Omit<
	ManagerReceiveOperationDto,
	"amount" | "fee" | "state"
> & {
	amount: unknown;
	fee?: unknown;
	state: string;
};

type ManagerPreparedReceiveOperationLike =
	ManagerReceiveOperationLike & {
		state: "prepared";
		fee: unknown;
		outputData: unknown;
	};

type ManagerReceiveOpsApiLike = {
	prepare: (
		params: ManagerPrepareReceiveParams,
	) => Promise<ManagerPreparedReceiveOperationLike>;
	execute: (operationId: string) => Promise<ManagerReceiveOperationLike>;
	get: (operationId: string) => Promise<ManagerReceiveOperationLike | null>;
	refresh: (operationId: string) => Promise<ManagerReceiveOperationLike>;
	cancel: (operationId: string, reason?: string) => Promise<void>;
	listPrepared: () => Promise<ManagerPreparedReceiveOperationLike[]>;
	listInFlight: () => Promise<ManagerReceiveOperationLike[]>;
};

type ManagerMeltQuoteLike = {
	mintUrl: string;
	method: string;
	quoteId: string;
	request: string;
	unit: string;
	expiry: number;
	state: string;
	createdAt: number;
	updatedAt: number;
	amount: unknown;
	fee_reserve?: unknown;
	fee_options?: unknown[];
};

type ManagerMeltOperationLike = {
	id: string;
	mintUrl: string;
	method: string;
	methodData: Record<string, unknown>;
	unit: string;
	state: string;
	createdAt: number;
	updatedAt: number;
	amount?: unknown;
	fee_reserve?: unknown;
	swap_fee?: unknown;
	inputAmount?: unknown;
	changeAmount?: unknown;
	effectiveFee?: unknown;
};

type ManagerMeltQuoteApiLike = {
	create: (params: any) => Promise<ManagerMeltQuoteLike>;
	get: (params: any) => Promise<ManagerMeltQuoteLike | null>;
	listPending: (
		params?: any,
	) => Promise<ManagerMeltQuoteLike[]>;
	refresh: (params: any) => Promise<ManagerMeltQuoteLike>;
};

type ManagerMintQuoteApiLike = {
	create: (params: any) => Promise<ManagerMintQuoteLike>;
	listPending: (
		params?: any,
	) => Promise<ManagerMintQuoteLike[]>;
};

type ManagerMeltOpsApiLike = {
	prepare: (params: any) => Promise<ManagerMeltOperationLike>;
	execute: (operationId: any) => Promise<ManagerMeltOperationLike>;
	get: (operationId: any) => Promise<ManagerMeltOperationLike | null>;
	getByQuote: (
		params: any,
	) => Promise<ManagerMeltOperationLike | null>;
	listByQuote: (
		params: any,
	) => Promise<ManagerMeltOperationLike[]>;
	listPrepared: () => Promise<ManagerMeltOperationLike[]>;
	listInFlight: () => Promise<ManagerMeltOperationLike[]>;
	refresh: (operationId: any) => Promise<ManagerMeltOperationLike>;
	cancel: (operationId: any, reason?: any) => Promise<void>;
	reclaim: (operationId: any, reason?: any) => Promise<void>;
	finalize: (operationId: any) => Promise<void>;
};

export type ManagerRpcManagerLike = {
	mint: ManagerMintApiLike;
	wallet: {
		balances: ManagerWalletBalancesApiLike;
		restore: (mintUrl: string, options?: { units?: string[] }) => Promise<void>;
	};
	history: ManagerHistoryApiLike;
	quotes: {
		mint?: ManagerMintQuoteApiLike;
		melt: ManagerMeltQuoteApiLike;
	};
	ops: {
		mint: ManagerMintOpsApiLike;
		send: ManagerSendApiLike;
		receive: ManagerReceiveOpsApiLike;
		melt: ManagerMeltOpsApiLike;
	};
	on: <TEventName extends ManagerEventName>(
		event: TEventName,
		handler: (payload: unknown) => void,
	) => () => void;
};

type ManagerRpcRequestHandlers = {
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
	managerWalletRestore: (params: ManagerRestoreMintParams) => Promise<void>;
	managerHistoryGetPaginatedHistory: (
		params: ManagerHistoryPaginationParams,
	) => Promise<ManagerHistoryEntryDto[]>;
	managerMintQuoteCreate: (
		params: ManagerCreateMintQuoteParams,
	) => Promise<ManagerMintQuoteDto>;
	managerMintQuoteListPending: (
		params?: ManagerListPendingMintQuotesParams,
	) => Promise<ManagerMintQuoteDto[]>;
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

export function createManagerRpcRequestHandlers(
	getManager: () => Promise<ManagerRpcManagerLike>,
): ManagerRpcRequestHandlers {
	return {
		managerMintGetAllMints: async () => {
			const manager = await getManager();
			const mints = await manager.mint.getAllMints();
			return mints.map(serializeManagerMint);
		},
		managerMintAddMint: async ({ mintUrl, options }) => {
			const manager = await getManager();
			return serializeMintWithKeysets(
				await manager.mint.addMint(mintUrl, options),
			);
		},
		managerMintTrustMint: async ({ mintUrl }) => {
			const manager = await getManager();
			await manager.mint.trustMint(mintUrl);
		},
		managerMintUntrustMint: async ({ mintUrl }) => {
			const manager = await getManager();
			await manager.mint.untrustMint(mintUrl);
		},
		managerMintIsTrustedMint: async ({ mintUrl }) => {
			const manager = await getManager();
			return manager.mint.isTrustedMint(mintUrl);
		},
		managerWalletBalancesByMint: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByMint(
				await manager.wallet.balances.byMint(scope),
			);
		},
		managerWalletBalancesByMintAndUnit: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByMintAndUnit(
				await manager.wallet.balances.byMintAndUnit(scope),
			);
		},
		managerWalletBalancesByUnit: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByUnit(
				await manager.wallet.balances.byUnit(scope),
			);
		},
		managerWalletBalancesTotal: async (scope) => {
			const manager = await getManager();
			return serializeBalanceSnapshot(
				await manager.wallet.balances.total(scope),
			);
		},
		managerWalletBalancesTotalByUnit: async (scope) => {
			const manager = await getManager();
			return serializeBalancesByUnit(
				await manager.wallet.balances.totalByUnit(scope),
			);
		},
		managerWalletRestore: async ({ mintUrl, options }) => {
			const manager = await getManager();
			await manager.wallet.restore(mintUrl, options);
		},
		managerHistoryGetPaginatedHistory: async ({ offset, limit }) => {
			const manager = await getManager();
			const entries = await manager.history.getPaginatedHistory(offset, limit);
			return entries.map(serializeHistoryEntry);
		},
		managerMintQuoteCreate: async (params) => {
			const manager = await getManager();
			if (!manager.quotes.mint) {
				throw new Error("Manager mint quote API is not available.");
			}
			return serializeMintQuote(await manager.quotes.mint.create(params));
		},
		managerMintQuoteListPending: async (params) => {
			const manager = await getManager();
			if (!manager.quotes.mint) {
				throw new Error("Manager mint quote API is not available.");
			}
			const quotes = await manager.quotes.mint.listPending(params);
			return quotes.map(serializeMintQuote);
		},
		managerMintOpsPrepare: async (params) => {
			const manager = await getManager();
			return serializeMintOperation(await manager.ops.mint.prepare(params));
		},
		managerMintOpsRefresh: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMintOperation(
				await manager.ops.mint.refresh(operationId),
			);
		},
		managerMintOpsExecute: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMintOperation(
				await manager.ops.mint.execute(operationId),
			);
		},
		managerMintOpsCheckPayment: async ({ operationId }) => {
			const manager = await getManager();
			return serializePendingMintCheckResult(
				await manager.ops.mint.checkPayment(operationId),
			);
		},
		managerMintOpsFinalize: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMintOperation(
				await manager.ops.mint.finalize(operationId),
			);
		},
		managerMintOpsGet: async ({ operationId }) => {
			const manager = await getManager();
			const operation = await manager.ops.mint.get(operationId);
			return operation ? serializeMintOperation(operation) : null;
		},
		managerMintOpsListByQuote: async (params) => {
			const manager = await getManager();
			return (await manager.ops.mint.listByQuote(params)).map(
				serializeMintOperation,
			);
		},
		managerMintOpsListPending: async () => {
			const manager = await getManager();
			return (await manager.ops.mint.listPending()).map(serializeMintOperation);
		},
		managerMintOpsListInFlight: async () => {
			const manager = await getManager();
			return (await manager.ops.mint.listInFlight()).map(
				serializeMintOperation,
			);
		},
		managerSendPrepare: async (params) => {
			const manager = await getManager();
			return serializeSendOperation(
				await manager.ops.send.prepare({
					mintUrl: params.mintUrl,
					amount: params.amount,
					unit: params.unit,
					target: params.target as ManagerSendPrepareInput["target"],
				}),
			);
		},
		managerSendExecute: async ({ operationId, options }) => {
			const manager = await getManager();
			const result = await manager.ops.send.execute(operationId, options);
			return {
				operation: serializeSendOperation(result.operation),
				token: result.token,
			};
		},
		managerSendGet: async ({ operationId }) => {
			const manager = await getManager();
			const operation = await manager.ops.send.get(operationId);
			return operation ? serializeSendOperation(operation) : null;
		},
		managerSendListPrepared: async () => {
			const manager = await getManager();
			const operations = await manager.ops.send.listPrepared();
			return operations.map(serializeSendOperation);
		},
		managerSendListInFlight: async () => {
			const manager = await getManager();
			const operations = await manager.ops.send.listInFlight();
			return operations.map(serializeSendOperation);
		},
		managerSendRefresh: async ({ operationId }) => {
			const manager = await getManager();
			return serializeSendOperation(await manager.ops.send.refresh(operationId));
		},
		managerSendCancel: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.send.cancel(operationId);
		},
		managerSendReclaim: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.send.reclaim(operationId);
		},
		managerSendFinalize: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.send.finalize(operationId);
		},
		managerReceivePrepare: async (params) => {
			const manager = await getManager();
			return serializePreparedReceiveOperation(
				await manager.ops.receive.prepare(params),
			);
		},
		managerReceiveExecute: async ({ operationId }) => {
			const manager = await getManager();
			return serializeReceiveOperation(
				await manager.ops.receive.execute(operationId),
			);
		},
		managerReceiveGet: async ({ operationId }) => {
			const manager = await getManager();
			const operation = await manager.ops.receive.get(operationId);
			return operation ? serializeReceiveOperation(operation) : null;
		},
		managerReceiveRefresh: async ({ operationId }) => {
			const manager = await getManager();
			return serializeReceiveOperation(
				await manager.ops.receive.refresh(operationId),
			);
		},
		managerReceiveCancel: async ({ operationId, reason }) => {
			const manager = await getManager();
			await manager.ops.receive.cancel(operationId, reason);
		},
		managerReceiveListPrepared: async () => {
			const manager = await getManager();
			return (await manager.ops.receive.listPrepared()).map(
				serializePreparedReceiveOperation,
			);
		},
		managerReceiveListInFlight: async () => {
			const manager = await getManager();
			return (await manager.ops.receive.listInFlight()).map(
				serializeReceiveOperation,
			);
		},
		managerMeltQuoteCreate: async (params) => {
			const manager = await getManager();
			return serializeMeltQuote(await manager.quotes.melt.create(params));
		},
		managerMeltQuoteGet: async (params) => {
			const manager = await getManager();
			const quote = await manager.quotes.melt.get(params);
			return quote ? serializeMeltQuote(quote) : null;
		},
		managerMeltQuoteListPending: async (params) => {
			const manager = await getManager();
			const quotes = await manager.quotes.melt.listPending(params);
			return quotes.map(serializeMeltQuote);
		},
		managerMeltQuoteRefresh: async (params) => {
			const manager = await getManager();
			return serializeMeltQuote(await manager.quotes.melt.refresh(params));
		},
		managerMeltPrepare: async (params) => {
			const manager = await getManager();
			return serializeMeltOperation(await manager.ops.melt.prepare(params));
		},
		managerMeltExecute: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMeltOperation(await manager.ops.melt.execute(operationId));
		},
		managerMeltGet: async ({ operationId }) => {
			const manager = await getManager();
			const operation = await manager.ops.melt.get(operationId);
			return operation ? serializeMeltOperation(operation) : null;
		},
		managerMeltGetByQuote: async (params) => {
			const manager = await getManager();
			const operation = await manager.ops.melt.getByQuote(params);
			return operation ? serializeMeltOperation(operation) : null;
		},
		managerMeltListByQuote: async (params) => {
			const manager = await getManager();
			const operations = await manager.ops.melt.listByQuote(params);
			return operations.map(serializeMeltOperation);
		},
		managerMeltListPrepared: async () => {
			const manager = await getManager();
			const operations = await manager.ops.melt.listPrepared();
			return operations.map(serializeMeltOperation);
		},
		managerMeltListInFlight: async () => {
			const manager = await getManager();
			const operations = await manager.ops.melt.listInFlight();
			return operations.map(serializeMeltOperation);
		},
		managerMeltRefresh: async ({ operationId }) => {
			const manager = await getManager();
			return serializeMeltOperation(await manager.ops.melt.refresh(operationId));
		},
		managerMeltCancel: async ({ operationId, reason }) => {
			const manager = await getManager();
			await manager.ops.melt.cancel(operationId, reason);
		},
		managerMeltReclaim: async ({ operationId, reason }) => {
			const manager = await getManager();
			await manager.ops.melt.reclaim(operationId, reason);
		},
		managerMeltFinalize: async ({ operationId }) => {
			const manager = await getManager();
			await manager.ops.melt.finalize(operationId);
		},
	};
}

export function createManagerEventForwarder(
	getManager: () => Promise<ManagerRpcManagerLike>,
	emit: (event: ManagerEventDto) => void,
) {
	const subscriptionCounts = new Map<ManagerEventName, number>();
	const offHandlers = new Map<ManagerEventName, () => void>();
	const pendingSubscriptions = new Map<ManagerEventName, Promise<void>>();

	return {
		subscribe: ({ event }: ManagerEventSubscriptionDto) => {
			subscriptionCounts.set(event, (subscriptionCounts.get(event) ?? 0) + 1);
			if (offHandlers.has(event) || pendingSubscriptions.has(event)) {
				return;
			}

			const pending = getManager()
				.then((manager) => {
					if ((subscriptionCounts.get(event) ?? 0) === 0) {
						return;
					}
					const off = manager.on(event, (payload) => {
						emit(serializeManagerEvent(event, payload));
					});
					offHandlers.set(event, off);
				})
				.finally(() => {
					pendingSubscriptions.delete(event);
				});
			pendingSubscriptions.set(event, pending);
			void pending;
		},
		unsubscribe: ({ event }: ManagerEventSubscriptionDto) => {
			const currentCount = subscriptionCounts.get(event) ?? 0;
			if (currentCount <= 1) {
				subscriptionCounts.delete(event);
				const off = offHandlers.get(event);
				if (off) {
					off();
					offHandlers.delete(event);
				}
				return;
			}

			subscriptionCounts.set(event, currentCount - 1);
		},
		dispose: () => {
			subscriptionCounts.clear();
			for (const off of offHandlers.values()) {
				off();
			}
			offHandlers.clear();
			pendingSubscriptions.clear();
		},
	};
}

function serializeManagerEvent<TEventName extends ManagerEventName>(
	event: TEventName,
	payload: unknown,
): ManagerEventDto<TEventName> {
	if (event === "mint:added" || event === "mint:updated") {
		return {
			event,
			payload: serializeMintWithKeysets(
				payload as ManagerEventPayloads["mint:added"],
			),
		} as ManagerEventDto<TEventName>;
	}

	if (event === "proofs:saved") {
		const savedPayload = payload as ManagerEventPayloads["proofs:saved"];
		return {
			event,
			payload: {
				...savedPayload,
				proofs: savedPayload.proofs.map(serializeProof),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "proofs:reserved") {
		const reservedPayload = payload as ManagerEventPayloads["proofs:reserved"];
		return {
			event,
			payload: {
				...reservedPayload,
				amount: serializeUnitAmount(reservedPayload.amount),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "history:updated") {
		const historyPayload = payload as {
			mintUrl: string;
			entry: ManagerHistoryEntryLike;
		};
		return {
			event,
			payload: {
				mintUrl: historyPayload.mintUrl,
				entry: serializeHistoryEntry(historyPayload.entry),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (
		event === "mint-op:pending" ||
		event === "mint-op:executing" ||
		event === "mint-op:finalized" ||
		event === "mint-op:requeue"
	) {
		const operationPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerMintOperationLike;
		};
		return {
			event,
			payload: {
				mintUrl: operationPayload.mintUrl,
				operationId: operationPayload.operationId,
				operation: serializeMintOperation(operationPayload.operation),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (
		event === "send:prepared" ||
		event === "send:finalized" ||
		event === "send:rolled-back"
	) {
		const sendPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerSendOperationLike;
		};
		return {
			event,
			payload: {
				mintUrl: sendPayload.mintUrl,
				operationId: sendPayload.operationId,
				operation: serializeSendOperation(sendPayload.operation),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "send:pending") {
		const sendPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerSendOperationLike;
			token: unknown;
		};
		return {
			event,
			payload: {
				mintUrl: sendPayload.mintUrl,
				operationId: sendPayload.operationId,
				operation: serializeSendOperation(sendPayload.operation),
				token: sendPayload.token,
			},
		} as ManagerEventDto<TEventName>;
	}

	if (
		event === "receive-op:prepared" ||
		event === "receive-op:finalized" ||
		event === "receive-op:rolled-back"
	) {
		const receivePayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerReceiveOperationLike;
		};
		return {
			event,
			payload: {
				mintUrl: receivePayload.mintUrl,
				operationId: receivePayload.operationId,
				operation: serializeReceiveOperation(receivePayload.operation),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (
		event === "melt-op:prepared" ||
		event === "melt-op:pending" ||
		event === "melt-op:finalized" ||
		event === "melt-op:rolled-back"
	) {
		const operationPayload = payload as {
			mintUrl: string;
			operationId: string;
			operation: ManagerMeltOperationLike;
		};
		return {
			event,
			payload: {
				...operationPayload,
				operation: serializeMeltOperation(operationPayload.operation),
			},
		} as ManagerEventDto<TEventName>;
	}

	if (event === "melt-quote:updated") {
		const quotePayload = payload as {
			mintUrl: string;
			method: string;
			quoteId: string;
			quote: ManagerMeltQuoteLike;
		};
		return {
			event,
			payload: {
				...quotePayload,
				quote: serializeMeltQuote(quotePayload.quote),
			},
		} as ManagerEventDto<TEventName>;
	}

	return {
		event,
		payload: payload as ManagerEventPayloads[TEventName],
	} as ManagerEventDto<TEventName>;
}

function serializeMintWithKeysets(input: {
	mint: ManagerMintLike;
	keysets: ManagerKeysetLike[];
}): ManagerMintWithKeysetsDto {
	return {
		mint: serializeManagerMint(input.mint),
		keysets: input.keysets.map(serializeManagerKeyset),
	};
}

function serializeBalancesByMint(
	balances: ManagerBalancesByMintLike,
): ManagerBalancesByMintDto {
	return Object.fromEntries(
		Object.entries(balances).map(([mintUrl, balance]) => [
			mintUrl,
			serializeBalanceSnapshot(balance),
		]),
	);
}

function serializeBalancesByMintAndUnit(
	balances: ManagerBalancesByMintAndUnitLike,
): ManagerBalancesByMintAndUnitDto {
	return Object.fromEntries(
		Object.entries(balances).map(([mintUrl, unitBalances]) => [
			mintUrl,
			Object.fromEntries(
				Object.entries(unitBalances).map(([unit, balance]) => [
					unit,
					serializeBalanceSnapshot(balance),
				]),
			),
		]),
	);
}

function serializeBalancesByUnit(
	balances: ManagerBalancesByUnitLike,
): ManagerBalancesByUnitDto {
	return Object.fromEntries(
		Object.entries(balances).map(([unit, balance]) => [
			unit,
			serializeBalanceSnapshot(balance),
		]),
	);
}

function serializeBalanceSnapshot(
	balance: ManagerBalanceSnapshotLike,
): ManagerBalanceSnapshotDto {
	return {
		spendable: serializeAmount(balance.spendable),
		reserved: serializeAmount(balance.reserved),
		total: serializeAmount(balance.total),
		unit: balance.unit,
	};
}

function serializeManagerMint(mint: ManagerMintLike): ManagerMintDto {
	return {
		mintUrl: mint.mintUrl,
		name: mint.name || mint.mintUrl,
		mintInfo: mint.mintInfo ?? null,
		trusted: mint.trusted,
		createdAt: mint.createdAt,
		updatedAt: mint.updatedAt,
	};
}

function serializeManagerKeyset(keyset: ManagerKeysetLike): ManagerKeysetDto {
	return {
		mintUrl: keyset.mintUrl,
		id: keyset.id,
		unit: keyset.unit,
		keypairs: keyset.keypairs ?? {},
		active: keyset.active,
		feePpk: keyset.feePpk ?? 0,
		updatedAt: keyset.updatedAt,
	};
}

function serializeProof(proof: ManagerProofDto): ManagerProofDto {
	return {
		...proof,
		amount: serializeAmount(proof.amount),
	};
}

function serializeUnitAmount(input: {
	amount: unknown;
	unit: string;
}): { amount: string; unit: string } {
	return {
		...input,
		amount: serializeAmount(input.amount),
	};
}

function serializeHistoryEntry(entry: ManagerHistoryEntryLike): ManagerHistoryEntryDto {
	return {
		id: entry.id,
		type: entry.type,
		source: entry.source,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
		mintUrl: entry.mintUrl,
		unit: entry.unit,
		state: String(entry.state),
		amount: serializeAmount(entry.amount),
		metadata: entry.metadata,
		error: entry.error,
		operationId: entry.operationId,
		legacyHistoryId: entry.legacyHistoryId,
		paymentRequest: entry.paymentRequest,
		quoteId: entry.quoteId,
		remoteState: entry.remoteState,
		token: entry.token,
	};
}

function serializeMintOperation(
	operation: ManagerMintOperationLike,
): ManagerMintOperationDto {
	return serializeAmountFields(operation) as ManagerMintOperationDto;
}

function serializePendingMintCheckResult(
	result: ManagerPendingMintCheckResultLike,
): ManagerPendingMintCheckResultDto {
	return serializeAmountFields(result) as ManagerPendingMintCheckResultDto;
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

function serializeAmountFields(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(serializeAmountFields);
	}

	if (!input || typeof input !== "object") {
		return input;
	}

	return Object.fromEntries(
		Object.entries(input).map(([key, value]) => {
			if (AMOUNT_FIELD_NAMES.has(key) && value !== undefined && value !== null) {
				return [key, serializeAmountFieldValue(value)];
			}

			return [key, serializeAmountFields(value)];
		}),
	);
}

function serializeAmountFieldValue(value: unknown): unknown {
	if (isUnitAmountRecord(value)) {
		return serializeAmountFields(value);
	}

	return serializeAmount(value);
}

function isUnitAmountRecord(value: unknown): value is { amount: unknown; unit: unknown } {
	return (
		!!value &&
		typeof value === "object" &&
		"amount" in value &&
		"unit" in value
	);
}

function serializeSendOperation(
	operation: ManagerSendOperationLike,
): ManagerSendOperationDto {
	return omitUndefined({
		id: operation.id,
		mintUrl: operation.mintUrl,
		amount: serializeAmount(operation.amount),
		unit: operation.unit,
		method: operation.method,
		methodData: operation.methodData,
		state: operation.state,
		createdAt: operation.createdAt,
		updatedAt: operation.updatedAt,
		error: operation.error,
		needsSwap: operation.needsSwap,
		fee: serializeOptionalAmount(operation.fee),
		inputAmount: serializeOptionalAmount(operation.inputAmount),
		inputProofSecrets: operation.inputProofSecrets,
		outputData: operation.outputData,
		token: operation.token,
	});
}

function serializeOptionalAmount(input: unknown): string | undefined {
	if (input === null || input === undefined) {
		return undefined;
	}

	return serializeAmount(input);
}

function serializeReceiveOperation(
	operation: ManagerReceiveOperationLike,
): ManagerReceiveOperationDto {
	return {
		id: operation.id,
		mintUrl: operation.mintUrl,
		unit: operation.unit,
		amount: serializeAmount(operation.amount),
		inputProofs: operation.inputProofs,
		createdAt: operation.createdAt,
		updatedAt: operation.updatedAt,
		state: operation.state as ManagerReceiveOperationDto["state"],
		error: operation.error,
		source: operation.source,
		fee:
			operation.fee === undefined ? undefined : serializeAmount(operation.fee),
		outputData: operation.outputData,
	};
}

function serializePreparedReceiveOperation(
	operation: ManagerPreparedReceiveOperationLike,
): ManagerPreparedReceiveOperationDto {
	return serializeReceiveOperation(operation) as ManagerPreparedReceiveOperationDto;
}

function serializeMintQuote(quote: ManagerMintQuoteLike): ManagerMintQuoteDto {
	return {
		...(quote as Record<string, unknown>),
		mintUrl: quote.mintUrl,
		method: quote.method,
		quoteId: quote.quoteId,
		request: quote.request,
		amount:
			quote.amount === undefined ? undefined : serializeAmount(quote.amount),
		unit: quote.unit,
		expiry: quote.expiry,
		state: quote.state === undefined ? undefined : String(quote.state),
		createdAt: quote.createdAt,
		updatedAt: quote.updatedAt,
	};
}

function serializeMeltQuote(quote: ManagerMeltQuoteLike): ManagerMeltQuoteDto {
	const serialized = {
		...(quote as Record<string, unknown>),
		mintUrl: quote.mintUrl,
		method: quote.method,
		quoteId: quote.quoteId,
		request: quote.request,
		amount: serializeAmount(quote.amount),
		unit: quote.unit,
		expiry: quote.expiry,
		state: String(quote.state),
		createdAt: quote.createdAt,
		updatedAt: quote.updatedAt,
	} as ManagerMeltQuoteDto;

	if (quote.fee_reserve !== undefined) {
		serialized.fee_reserve = serializeAmount(quote.fee_reserve);
	}
	if (Array.isArray(quote.fee_options)) {
		serialized.fee_options = serializeMeltFeeOptions(quote.fee_options);
	}

	return serialized;
}

function serializeMeltOperation(
	operation: ManagerMeltOperationLike,
): ManagerMeltOperationDto {
	const serialized = {
		...(operation as Record<string, unknown>),
		id: operation.id,
		mintUrl: operation.mintUrl,
		method: operation.method,
		methodData: serializeMeltMethodData(operation.methodData),
		unit: operation.unit,
		state: String(operation.state),
		createdAt: operation.createdAt,
		updatedAt: operation.updatedAt,
	} as ManagerMeltOperationDto;

	copySerializedAmount(operation, serialized, "amount");
	copySerializedAmount(operation, serialized, "fee_reserve");
	copySerializedAmount(operation, serialized, "swap_fee");
	copySerializedAmount(operation, serialized, "inputAmount");
	copySerializedAmount(operation, serialized, "changeAmount");
	copySerializedAmount(operation, serialized, "effectiveFee");

	return serialized;
}

function serializeMeltMethodData(
	methodData: Record<string, unknown>,
): Record<string, unknown> {
	if (methodData.amountSats === undefined || methodData.amountSats === null) {
		return methodData;
	}

	return {
		...methodData,
		amountSats: serializeAmount(methodData.amountSats),
	};
}

function serializeMeltFeeOptions(feeOptions: unknown[]): unknown[] {
	return feeOptions.map((feeOption) => {
		if (!feeOption || typeof feeOption !== "object") {
			return feeOption;
		}

		const feeOptionRecord = feeOption as Record<string, unknown>;
		if (
			feeOptionRecord.fee_reserve === undefined ||
			feeOptionRecord.fee_reserve === null
		) {
			return feeOption;
		}

		return {
			...feeOptionRecord,
			fee_reserve: serializeAmount(feeOptionRecord.fee_reserve),
		};
	});
}

function copySerializedAmount(
	source: Record<string, unknown>,
	target: Record<string, unknown>,
	field: string,
): void {
	if (source[field] !== undefined) {
		target[field] = serializeAmount(source[field]);
	}
}

function serializeAmount(input: unknown): string {
	if (typeof input === "bigint") {
		return input.toString();
	}
	if (typeof input === "number") {
		return String(input);
	}
	if (typeof input === "string") {
		return input;
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

	throw new Error("Cannot serialize manager amount value.");
}

function omitUndefined<TRecord extends Record<string, unknown>>(
	record: TRecord,
): TRecord {
	return Object.fromEntries(
		Object.entries(record).filter(([, value]) => value !== undefined),
	) as TRecord;
}
