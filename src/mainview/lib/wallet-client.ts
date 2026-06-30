import { Electroview } from "electrobun/view";
import type {
	AddMintParams,
	CreateMintQuoteParams,
	ExecuteSendParams,
	OperationIdParams,
	PrepareMeltParams,
	PrepareReceiveParams,
	PrepareSendParams,
	WalletNotificationSettings,
	WalletRpcSchema,
} from "@/lib/wallet-rpc";

type WalletRpc = ReturnType<typeof Electroview.defineRPC<WalletRpcSchema>>;

let rpc: WalletRpc | undefined;

function isElectrobunWebview() {
	return typeof window !== "undefined" && "__electrobun" in window;
}

function getRpc() {
	if (!isElectrobunWebview()) {
		throw new Error("Wallet bridge unavailable. Open the app through Electrobun.");
	}

	if (!rpc) {
		rpc = Electroview.defineRPC<WalletRpcSchema>({
			maxRequestTime: 120_000,
			handlers: {
				requests: {},
			},
		});
		new Electroview({ rpc });
	}

	return rpc;
}

export const walletClient = {
	snapshot: () => getRpc().request.snapshot(),
	addMint: (params: AddMintParams) => getRpc().request.addMint(params),
	restoreMint: (params: { mintUrl: string; units?: string[] }) =>
		getRpc().request.restoreMint(params),
	createMintQuote: (params: CreateMintQuoteParams) =>
		getRpc().request.createMintQuote(params),
	refreshMintOperation: (params: OperationIdParams) =>
		getRpc().request.refreshMintOperation(params),
	prepareSend: (params: PrepareSendParams) =>
		getRpc().request.prepareSend(params),
	executeSend: (params: ExecuteSendParams) =>
		getRpc().request.executeSend(params),
	cancelSend: (params: OperationIdParams) =>
		getRpc().request.cancelSend(params),
	reclaimSend: (params: OperationIdParams) =>
		getRpc().request.reclaimSend(params),
	prepareReceive: (params: PrepareReceiveParams) =>
		getRpc().request.prepareReceive(params),
	executeReceive: (params: OperationIdParams) =>
		getRpc().request.executeReceive(params),
	cancelReceive: (params: OperationIdParams) =>
		getRpc().request.cancelReceive(params),
	prepareMelt: (params: PrepareMeltParams) =>
		getRpc().request.prepareMelt(params),
	executeMelt: (params: OperationIdParams) =>
		getRpc().request.executeMelt(params),
	cancelMelt: (params: OperationIdParams) =>
		getRpc().request.cancelMelt(params),
	refreshMeltOperation: (params: OperationIdParams) =>
		getRpc().request.refreshMeltOperation(params),
	getNotificationSettings: () => getRpc().request.getNotificationSettings(),
	saveNotificationSettings: (params: WalletNotificationSettings) =>
		getRpc().request.saveNotificationSettings(params),
	testNotification: () => getRpc().request.testNotification(),
};
