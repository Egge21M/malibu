import type { Manager } from "@cashu/coco-core";
import type {
	ManagerAddMintParams,
	ManagerEventDto,
	ManagerMintDto,
	ManagerMintEventName,
	ManagerMintEventPayloads,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
} from "@/lib/manager-rpc";

type ManagerEventHandler<TEventName extends ManagerMintEventName> = (
	payload: ManagerMintEventPayloads[TEventName],
) => void | Promise<void>;

type RemoteManagerRpc = {
	request: {
		managerMintGetAllMints: () => Promise<ManagerMintDto[]>;
		managerMintAddMint: (
			params: ManagerAddMintParams,
		) => Promise<ManagerMintWithKeysetsDto>;
		managerMintTrustMint: (params: ManagerMintUrlParams) => Promise<void>;
		managerMintUntrustMint: (params: ManagerMintUrlParams) => Promise<void>;
		managerMintIsTrustedMint: (params: ManagerMintUrlParams) => Promise<boolean>;
	};
	addMessageListener: (
		message: "managerEvent",
		handler: (payload: ManagerEventDto) => void,
	) => void;
	removeMessageListener: (
		message: "managerEvent",
		handler: (payload: ManagerEventDto) => void,
	) => void;
};

class RemoteCocoManager {
	private readonly listeners = new Map<
		ManagerMintEventName,
		Set<ManagerEventHandler<ManagerMintEventName>>
	>();
	private listeningToRpc = false;

	readonly mint = unsupportedAwareObject("Remote Coco manager mint API", {
		getAllMints: () => this.rpc.request.managerMintGetAllMints(),
		addMint: (mintUrl: string, options?: { trusted?: boolean }) =>
			this.rpc.request.managerMintAddMint({ mintUrl, options }),
		trustMint: (mintUrl: string) =>
			this.rpc.request.managerMintTrustMint({ mintUrl }),
		untrustMint: (mintUrl: string) =>
			this.rpc.request.managerMintUntrustMint({ mintUrl }),
		isTrustedMint: (mintUrl: string) =>
			this.rpc.request.managerMintIsTrustedMint({ mintUrl }),
	});

	constructor(private readonly rpc: RemoteManagerRpc) {}

	on<TEventName extends ManagerMintEventName>(
		event: TEventName,
		handler: ManagerEventHandler<TEventName>,
	): () => void {
		this.ensureRpcEventListener();
		const listeners = this.listeners.get(event) ?? new Set();
		listeners.add(handler as ManagerEventHandler<ManagerMintEventName>);
		this.listeners.set(event, listeners);

		return () => this.off(event, handler);
	}

	off<TEventName extends ManagerMintEventName>(
		event: TEventName,
		handler: ManagerEventHandler<TEventName>,
	): void {
		const listeners = this.listeners.get(event);
		listeners?.delete(handler as ManagerEventHandler<ManagerMintEventName>);
		if (listeners?.size === 0) {
			this.listeners.delete(event);
		}
		this.stopRpcEventListenerIfIdle();
	}

	private ensureRpcEventListener(): void {
		if (this.listeningToRpc) {
			return;
		}

		this.rpc.addMessageListener("managerEvent", this.handleManagerEvent);
		this.listeningToRpc = true;
	}

	private stopRpcEventListenerIfIdle(): void {
		if (!this.listeningToRpc || this.listeners.size > 0) {
			return;
		}

		this.rpc.removeMessageListener("managerEvent", this.handleManagerEvent);
		this.listeningToRpc = false;
	}

	private readonly handleManagerEvent = (event: ManagerEventDto): void => {
		const listeners = this.listeners.get(event.event);
		if (!listeners) {
			return;
		}

		for (const listener of listeners) {
			void listener(event.payload);
		}
	};
}

export function createRemoteCocoManager(rpc: RemoteManagerRpc): Manager {
	return unsupportedAwareObject("Remote Coco manager", new RemoteCocoManager(rpc), {
		allowProperties: new Set(["mint", "on", "off"]),
	}) as unknown as Manager;
}

function unsupportedAwareObject<TTarget extends object>(
	label: string,
	target: TTarget,
	options?: { allowProperties?: Set<PropertyKey> },
): TTarget {
	return new Proxy(target, {
		get(currentTarget, property, receiver) {
			if (
				property in currentTarget ||
				typeof property === "symbol" ||
				options?.allowProperties?.has(property)
			) {
				return Reflect.get(currentTarget, property, receiver);
			}

			throw new Error(
				`${label} does not support "${String(property)}" yet. Add it to the manager RPC contract before using it in the renderer.`,
			);
		},
	});
}
