import type {
	ManagerRpcBunMessages,
	ManagerRpcRequests,
	ManagerRpcWebviewMessages,
} from "@/lib/manager-rpc";

export type NpcPluginStatusDto = {
	isInitialized: boolean;
	isReady: boolean;
	accountCount: number;
	runningAccountIds: string[];
	syncingAccountIds: string[];
	websocketConnectedAccountIds: string[];
};

export type NpcAccountStatusDto = {
	id: string;
	isReady: boolean;
	isRunning: boolean;
	isSyncing: boolean;
	isWebSocketConnected: boolean;
	isShutdown: boolean;
};

export type NpcUserDto = {
	pubkey: string;
	name: string | null;
	mintUrl: string;
	lockQuote: boolean;
};

export type NpcStateDto = {
	enabled: boolean;
	accountId: string;
	baseUrl: string;
	publicKey: string;
	lightningAddress: string | null;
	username: string | null;
	user: NpcUserDto | null;
	status: NpcPluginStatusDto;
	account: NpcAccountStatusDto | null;
	error?: string;
};

export type NpcPaymentRequestDto = {
	encoded: string;
	amount?: string;
	unit?: string;
	description?: string;
	mints?: string[];
};

export type NpcSetUsernameParams = {
	username: string;
	attemptPayment?: boolean;
};

export type NpcSetUsernameResultDto =
	| {
			success: true;
			state: NpcStateDto;
		}
	| {
			success: false;
			paymentRequest: NpcPaymentRequestDto;
			state: NpcStateDto;
		};

export type WalletRpcSchema = {
	bun: {
		requests: ManagerRpcRequests & {
			dataDir: {
				params: undefined;
				response: string;
			};
			npcGetState: {
				params: undefined;
				response: NpcStateDto;
			};
			npcSync: {
				params: undefined;
				response: NpcStateDto;
			};
			npcSetUsername: {
				params: NpcSetUsernameParams;
				response: NpcSetUsernameResultDto;
			};
		};
		messages: ManagerRpcBunMessages;
	};
	webview: {
		requests: {};
		messages: ManagerRpcWebviewMessages;
	};
};
