import { Electroview } from "electrobun/view";
import type { WalletRpcSchema } from "@/lib/wallet-rpc";
import { createRemoteCocoManager } from "@/lib/remote-coco-manager";

type WalletRpc = ReturnType<typeof Electroview.defineRPC<WalletRpcSchema>>;

let rpc: WalletRpc | undefined;
let remoteCocoManager: ReturnType<typeof createRemoteCocoManager> | undefined;

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
	dataDir: () => getRpc().request.dataDir(),
	npc: {
		getState: () => getRpc().request.npcGetState(),
		sync: () => getRpc().request.npcSync(),
		setUsername: (username: string, attemptPayment = false) =>
			getRpc().request.npcSetUsername({ username, attemptPayment }),
	},
};

export function getRemoteCocoManager() {
	remoteCocoManager ??= createRemoteCocoManager(getRpc());
	return remoteCocoManager;
}
