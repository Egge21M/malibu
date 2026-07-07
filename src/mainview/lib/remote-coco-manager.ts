import { toAmount, type HistoryEntry, type Manager } from "@cashu/coco-core";
import type {
	ManagerAddMintParams,
	ManagerEventDto,
	ManagerEventName,
	ManagerEventPayloads,
	ManagerHistoryEntryDto,
	ManagerHistoryEventName,
	ManagerHistoryEventSubscriptionDto,
	ManagerHistoryPaginationParams,
	ManagerMintDto,
	ManagerMintEventSubscriptionDto,
	ManagerMintUrlParams,
	ManagerMintWithKeysetsDto,
} from "@/lib/manager-rpc";

type RemoteManagerEventPayloads = Omit<
	ManagerEventPayloads,
	"history:updated"
> & {
	"history:updated": {
		mintUrl: string;
		entry: HistoryEntry;
	};
};

type ManagerEventHandler<TEventName extends ManagerEventName> = (
	payload: RemoteManagerEventPayloads[TEventName],
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
		managerHistoryGetPaginatedHistory: (
			params: ManagerHistoryPaginationParams,
		) => Promise<ManagerHistoryEntryDto[]>;
	};
	send: {
		managerMintEventSubscribe: (
			payload: ManagerMintEventSubscriptionDto,
		) => void;
		managerMintEventUnsubscribe: (
			payload: ManagerMintEventSubscriptionDto,
		) => void;
		managerHistoryEventSubscribe: (
			payload: ManagerHistoryEventSubscriptionDto,
		) => void;
		managerHistoryEventUnsubscribe: (
			payload: ManagerHistoryEventSubscriptionDto,
		) => void;
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
		ManagerEventName,
		Set<ManagerEventHandler<ManagerEventName>>
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

	readonly history = unsupportedAwareObject("Remote Coco manager history API", {
		getPaginatedHistory: async (offset?: number, limit?: number) => {
			const entries =
				await this.rpc.request.managerHistoryGetPaginatedHistory({
					offset,
					limit,
				});
			return entries.map(rehydrateHistoryEntry);
		},
	});

	constructor(private readonly rpc: RemoteManagerRpc) {}

	on<TEventName extends ManagerEventName>(
		event: TEventName,
		handler: ManagerEventHandler<TEventName>,
	): () => void {
		this.ensureRpcEventListener();
		const listeners = this.listeners.get(event) ?? new Set();
		const shouldSubscribe = listeners.size === 0;
		listeners.add(handler as ManagerEventHandler<ManagerEventName>);
		this.listeners.set(event, listeners);
		if (shouldSubscribe) {
			this.subscribeToRpcEvent(event);
		}

		return () => this.off(event, handler);
	}

	off<TEventName extends ManagerEventName>(
		event: TEventName,
		handler: ManagerEventHandler<TEventName>,
	): void {
		const listeners = this.listeners.get(event);
		const hadHandler = listeners?.has(
			handler as ManagerEventHandler<ManagerEventName>,
		);
		listeners?.delete(handler as ManagerEventHandler<ManagerEventName>);
		if (listeners?.size === 0) {
			this.listeners.delete(event);
			if (hadHandler) {
				this.unsubscribeFromRpcEvent(event);
			}
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

		const payload = rehydrateManagerEventPayload(event);
		for (const listener of listeners) {
			void listener(payload);
		}
	};

	private subscribeToRpcEvent(event: ManagerEventName): void {
		if (isHistoryEventName(event)) {
			this.rpc.send.managerHistoryEventSubscribe({ event });
			return;
		}

		this.rpc.send.managerMintEventSubscribe({ event });
	}

	private unsubscribeFromRpcEvent(event: ManagerEventName): void {
		if (isHistoryEventName(event)) {
			this.rpc.send.managerHistoryEventUnsubscribe({ event });
			return;
		}

		this.rpc.send.managerMintEventUnsubscribe({ event });
	}
}

export function createRemoteCocoManager(rpc: RemoteManagerRpc): Manager {
	return unsupportedAwareObject("Remote Coco manager", new RemoteCocoManager(rpc), {
		allowProperties: new Set(["mint", "history", "on", "off"]),
	}) as unknown as Manager;
}

function isHistoryEventName(
	event: ManagerEventName,
): event is ManagerHistoryEventName {
	return event === "history:updated";
}

function rehydrateManagerEventPayload(
	event: ManagerEventDto,
): RemoteManagerEventPayloads[ManagerEventName] {
	if (event.event === "history:updated") {
		const payload = event.payload as ManagerEventPayloads["history:updated"];
		return {
			mintUrl: payload.mintUrl,
			entry: rehydrateHistoryEntry(payload.entry),
		};
	}

	return event.payload as unknown as RemoteManagerEventPayloads[ManagerEventName];
}

function rehydrateHistoryEntry(entry: ManagerHistoryEntryDto): HistoryEntry {
	return {
		...entry,
		amount: toAmount(entry.amount),
	} as HistoryEntry;
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
