import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import {
	createManagerHistoryEventForwarder,
	createManagerMintEventForwarder,
	createManagerRpcRequestHandlers,
} from "./manager-rpc.ts";
import type { ManagerEventDto } from "../mainview/lib/manager-rpc.ts";
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
const managerMintEventForwarder = createManagerMintEventForwarder(
	() => walletService.getCocoManager(),
	(event) => walletRpc.send.managerEvent(event as ManagerEventDto),
);
const managerHistoryEventForwarder = createManagerHistoryEventForwarder(
	() => walletService.getCocoManager(),
	(event) => walletRpc.send.managerEvent(event as ManagerEventDto),
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
			managerHistoryGetPaginatedHistory: async (params) => {
				return managerRpcRequestHandlers.managerHistoryGetPaginatedHistory(
					params,
				);
			},
			snapshot: () => walletService.snapshot(),
			addMint: (params) => walletService.addMint(params),
			restoreMint: (params) => walletService.restoreMint(params),
			createMintQuote: (params) => walletService.createMintQuote(params),
			refreshMintOperation: (params) =>
				walletService.refreshMintOperation(params),
			prepareSend: (params) => walletService.prepareSend(params),
			executeSend: (params) => walletService.executeSend(params),
			cancelSend: (params) => walletService.cancelSend(params),
			reclaimSend: (params) => walletService.reclaimSend(params),
			prepareReceive: (params) => walletService.prepareReceive(params),
			executeReceive: (params) => walletService.executeReceive(params),
			cancelReceive: (params) => walletService.cancelReceive(params),
			prepareMelt: (params) => walletService.prepareMelt(params),
			executeMelt: (params) => walletService.executeMelt(params),
			cancelMelt: (params) => walletService.cancelMelt(params),
			refreshMeltOperation: (params) =>
				walletService.refreshMeltOperation(params),
		},
		messages: {
			managerMintEventSubscribe: (params) =>
				managerMintEventForwarder.subscribe(params),
			managerMintEventUnsubscribe: (params) =>
				managerMintEventForwarder.unsubscribe(params),
			managerHistoryEventSubscribe: (params) =>
				managerHistoryEventForwarder.subscribe(params),
			managerHistoryEventUnsubscribe: (params) =>
				managerHistoryEventForwarder.unsubscribe(params),
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
