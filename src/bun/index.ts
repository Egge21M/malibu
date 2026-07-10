import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import {
	createManagerEventForwarder,
	createManagerRpcRequestHandlers,
} from "./manager-rpc.ts";
import { CashuWalletService } from "./wallet-service.ts";
import type { WalletRpcSchema } from "../mainview/lib/wallet-rpc.ts";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();
const walletService = new CashuWalletService();
const managerRpcRequestHandlers = createManagerRpcRequestHandlers(() =>
	walletService.getCocoManager(),
);
const managerEventForwarder = createManagerEventForwarder(
	() => walletService.getCocoManager(),
	(event) => walletRpc.send.managerEvent(event),
);

const walletRpc = BrowserView.defineRPC<WalletRpcSchema>({
	maxRequestTime: 120_000,
	handlers: {
		requests: {
			managerMintGetAllMints: async () => {
				return managerRpcRequestHandlers.managerMintGetAllMints();
			},
			managerMintAddMint: async (params) => {
				return managerRpcRequestHandlers.managerMintAddMint(params);
			},
			managerMintTrustMint: async (params) => {
				return managerRpcRequestHandlers.managerMintTrustMint(params);
			},
			managerMintUntrustMint: async (params) => {
				return managerRpcRequestHandlers.managerMintUntrustMint(params);
			},
			managerMintIsTrustedMint: async (params) => {
				return managerRpcRequestHandlers.managerMintIsTrustedMint(params);
			},
			managerWalletBalancesByMint: async (params) => {
				return managerRpcRequestHandlers.managerWalletBalancesByMint(params);
			},
			managerWalletBalancesByMintAndUnit: async (params) => {
				return managerRpcRequestHandlers.managerWalletBalancesByMintAndUnit(
					params,
				);
			},
			managerWalletBalancesByUnit: async (params) => {
				return managerRpcRequestHandlers.managerWalletBalancesByUnit(params);
			},
			managerWalletBalancesTotal: async (params) => {
				return managerRpcRequestHandlers.managerWalletBalancesTotal(params);
			},
			managerWalletBalancesTotalByUnit: async (params) => {
				return managerRpcRequestHandlers.managerWalletBalancesTotalByUnit(
					params,
				);
			},
			managerWalletRestore: async (params) => {
				return managerRpcRequestHandlers.managerWalletRestore(params);
			},
			managerHistoryGetPaginatedHistory: async (params) => {
				return managerRpcRequestHandlers.managerHistoryGetPaginatedHistory(
					params,
				);
			},
			managerMintQuoteCreate: async (params) => {
				return managerRpcRequestHandlers.managerMintQuoteCreate(params);
			},
			managerMintQuoteListPending: async (params) => {
				return managerRpcRequestHandlers.managerMintQuoteListPending(params);
			},
			managerMintOpsPrepare: async (params) => {
				return managerRpcRequestHandlers.managerMintOpsPrepare(params);
			},
			managerMintOpsRefresh: async (params) => {
				return managerRpcRequestHandlers.managerMintOpsRefresh(params);
			},
			managerMintOpsExecute: async (params) => {
				return managerRpcRequestHandlers.managerMintOpsExecute(params);
			},
			managerMintOpsCheckPayment: async (params) => {
				return managerRpcRequestHandlers.managerMintOpsCheckPayment(params);
			},
			managerMintOpsFinalize: async (params) => {
				return managerRpcRequestHandlers.managerMintOpsFinalize(params);
			},
			managerMintOpsGet: async (params) => {
				return managerRpcRequestHandlers.managerMintOpsGet(params);
			},
			managerMintOpsListByQuote: async (params) => {
				return managerRpcRequestHandlers.managerMintOpsListByQuote(params);
			},
			managerMintOpsListPending: async () => {
				return managerRpcRequestHandlers.managerMintOpsListPending();
			},
			managerMintOpsListInFlight: async () => {
				return managerRpcRequestHandlers.managerMintOpsListInFlight();
			},
			managerSendPrepare: async (params) => {
				return managerRpcRequestHandlers.managerSendPrepare(params);
			},
			managerSendExecute: async (params) => {
				return managerRpcRequestHandlers.managerSendExecute(params);
			},
			managerSendGet: async (params) => {
				return managerRpcRequestHandlers.managerSendGet(params);
			},
			managerSendListPrepared: async () => {
				return managerRpcRequestHandlers.managerSendListPrepared();
			},
			managerSendListInFlight: async () => {
				return managerRpcRequestHandlers.managerSendListInFlight();
			},
			managerSendRefresh: async (params) => {
				return managerRpcRequestHandlers.managerSendRefresh(params);
			},
			managerSendCancel: async (params) => {
				return managerRpcRequestHandlers.managerSendCancel(params);
			},
			managerSendReclaim: async (params) => {
				return managerRpcRequestHandlers.managerSendReclaim(params);
			},
			managerSendFinalize: async (params) => {
				return managerRpcRequestHandlers.managerSendFinalize(params);
			},
			managerReceivePrepare: async (params) => {
				return managerRpcRequestHandlers.managerReceivePrepare(params);
			},
			managerReceiveExecute: async (params) => {
				return managerRpcRequestHandlers.managerReceiveExecute(params);
			},
			managerReceiveGet: async (params) => {
				return managerRpcRequestHandlers.managerReceiveGet(params);
			},
			managerReceiveRefresh: async (params) => {
				return managerRpcRequestHandlers.managerReceiveRefresh(params);
			},
			managerReceiveCancel: async (params) => {
				return managerRpcRequestHandlers.managerReceiveCancel(params);
			},
			managerReceiveListPrepared: async () => {
				return managerRpcRequestHandlers.managerReceiveListPrepared();
			},
			managerReceiveListInFlight: async () => {
				return managerRpcRequestHandlers.managerReceiveListInFlight();
			},
			managerMeltQuoteCreate: async (params) => {
				return managerRpcRequestHandlers.managerMeltQuoteCreate(params);
			},
			managerMeltQuoteGet: async (params) => {
				return managerRpcRequestHandlers.managerMeltQuoteGet(params);
			},
			managerMeltQuoteListPending: async (params) => {
				return managerRpcRequestHandlers.managerMeltQuoteListPending(params);
			},
			managerMeltQuoteRefresh: async (params) => {
				return managerRpcRequestHandlers.managerMeltQuoteRefresh(params);
			},
			managerMeltPrepare: async (params) => {
				return managerRpcRequestHandlers.managerMeltPrepare(params);
			},
			managerMeltExecute: async (params) => {
				return managerRpcRequestHandlers.managerMeltExecute(params);
			},
			managerMeltGet: async (params) => {
				return managerRpcRequestHandlers.managerMeltGet(params);
			},
			managerMeltGetByQuote: async (params) => {
				return managerRpcRequestHandlers.managerMeltGetByQuote(params);
			},
			managerMeltListByQuote: async (params) => {
				return managerRpcRequestHandlers.managerMeltListByQuote(params);
			},
			managerMeltListPrepared: async () => {
				return managerRpcRequestHandlers.managerMeltListPrepared();
			},
			managerMeltListInFlight: async () => {
				return managerRpcRequestHandlers.managerMeltListInFlight();
			},
			managerMeltRefresh: async (params) => {
				return managerRpcRequestHandlers.managerMeltRefresh(params);
			},
			managerMeltCancel: async (params) => {
				return managerRpcRequestHandlers.managerMeltCancel(params);
			},
			managerMeltReclaim: async (params) => {
				return managerRpcRequestHandlers.managerMeltReclaim(params);
			},
			managerMeltFinalize: async (params) => {
				return managerRpcRequestHandlers.managerMeltFinalize(params);
			},
			dataDir: () => walletService.getDataDir(),
			npcGetState: () => walletService.getNpcState(),
			npcSync: () => walletService.syncNpcAccount(),
			npcSetUsername: (params) =>
				walletService.setNpcUsername(
					params.username,
					params.attemptPayment ?? false,
				),
		},
		messages: {
			managerEventSubscribe: (params) =>
				managerEventForwarder.subscribe(params),
			managerEventUnsubscribe: (params) =>
				managerEventForwarder.unsubscribe(params),
		},
	},
});

const mainWindow = new BrowserWindow({
	title: "Malibu Cashu Wallet",
	url,
	rpc: walletRpc,
	frame: {
		width: 1180,
		height: 780,
		x: 200,
		y: 120,
	},
});

void mainWindow;

console.log("Malibu Cashu wallet started.");
