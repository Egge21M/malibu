import type {
	ManagerRpcBunMessages,
	ManagerRpcRequests,
	ManagerRpcWebviewMessages,
} from "@/lib/manager-rpc";

export type WalletRpcSchema = {
	bun: {
		requests: ManagerRpcRequests & {
			dataDir: {
				params: undefined;
				response: string;
			};
		};
		messages: ManagerRpcBunMessages;
	};
	webview: {
		requests: {};
		messages: ManagerRpcWebviewMessages;
	};
};
