import { Utils } from "electrobun/bun";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { CoreEvents, Manager } from "@cashu/coco-core";
import type {
	WalletNotificationEvent,
	WalletNotificationSettings,
} from "../mainview/lib/wallet-rpc.ts";

const NOTIFICATION_STATE_FILE = "notifications.json";
const NOTIFIED_EVENT_LIMIT = 300;

export const DEFAULT_NOTIFICATION_SETTINGS: WalletNotificationSettings = {
	enabled: true,
	silent: false,
	events: {
		mintSettled: true,
		tokenReceived: true,
		paymentCompleted: true,
		paymentFailed: true,
		tokenSpent: false,
	},
};

type NotificationState = {
	schemaVersion: 1;
	settings: WalletNotificationSettings;
	notifiedEventIds: string[];
};

type NotificationIntent = {
	event: WalletNotificationEvent;
	eventId: string;
	title: string;
	body?: string;
};

export class WalletNotificationService {
	private readonly statePath: string;
	private state: NotificationState;

	constructor(dataDir: string) {
		mkdirSync(dataDir, { recursive: true });
		this.statePath = join(dataDir, NOTIFICATION_STATE_FILE);
		this.state = this.loadState();
	}

	getSettings(): WalletNotificationSettings {
		return cloneSettings(this.state.settings);
	}

	saveSettings(settings: WalletNotificationSettings): WalletNotificationSettings {
		this.state = {
			...this.state,
			settings: normalizeSettings(settings),
		};
		this.persist();
		return this.getSettings();
	}

	showTestNotification(): void {
		this.showNotification({
			title: "Malibu notifications",
			body: "Desktop notifications are ready.",
			silent: this.state.settings.silent,
		});
	}

	bindToManager(manager: Manager): () => void {
		const unsubscribers = [
			manager.on("mint-op:finalized", (payload) =>
				this.handleIntent(createMintSettledIntent(payload)),
			),
			manager.on("receive-op:finalized", (payload) =>
				this.handleIntent(createTokenReceivedIntent(payload)),
			),
			manager.on("melt-op:finalized", (payload) =>
				this.handleIntent(createPaymentCompletedIntent(payload)),
			),
			manager.on("melt-op:rolled-back", (payload) =>
				this.handleIntent(createPaymentFailedIntent(payload)),
			),
			manager.on("send:finalized", (payload) =>
				this.handleIntent(createTokenSpentIntent(payload)),
			),
		];

		return () => {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	}

	private handleIntent(intent: NotificationIntent): void {
		if (!this.state.settings.enabled || !this.state.settings.events[intent.event]) {
			return;
		}

		if (this.state.notifiedEventIds.includes(intent.eventId)) {
			return;
		}

		this.showNotification({
			title: intent.title,
			body: intent.body,
			silent: this.state.settings.silent,
		});
		this.markNotified(intent.eventId);
	}

	private markNotified(eventId: string): void {
		this.state = {
			...this.state,
			notifiedEventIds: [
				eventId,
				...this.state.notifiedEventIds.filter((id) => id !== eventId),
			].slice(0, NOTIFIED_EVENT_LIMIT),
		};
		this.persist();
	}

	private showNotification(options: {
		title: string;
		body?: string;
		silent?: boolean;
	}): void {
		try {
			Utils.showNotification(options);
		} catch (error) {
			console.warn("Failed to show Malibu notification.", error);
		}
	}

	private loadState(): NotificationState {
		if (!existsSync(this.statePath)) {
			return createDefaultState();
		}

		try {
			const parsed = JSON.parse(readFileSync(this.statePath, "utf8"));
			return normalizeState(parsed);
		} catch {
			return createDefaultState();
		}
	}

	private persist(): void {
		writeFileSync(this.statePath, `${JSON.stringify(this.state, null, "\t")}\n`);
	}
}

function createMintSettledIntent(
	payload: CoreEvents["mint-op:finalized"],
): NotificationIntent {
	return {
		event: "mintSettled",
		eventId: `mint-op:finalized:${payload.operationId}`,
		title: "Mint settled",
		body: `${formatOperationAmount(payload.operation)} added to your wallet.`,
	};
}

function createTokenReceivedIntent(
	payload: CoreEvents["receive-op:finalized"],
): NotificationIntent {
	return {
		event: "tokenReceived",
		eventId: `receive-op:finalized:${payload.operationId}`,
		title: "Token received",
		body: `${formatOperationAmount(payload.operation)} accepted into your wallet.`,
	};
}

function createPaymentCompletedIntent(
	payload: CoreEvents["melt-op:finalized"],
): NotificationIntent {
	return {
		event: "paymentCompleted",
		eventId: `melt-op:finalized:${payload.operationId}`,
		title: "Payment complete",
		body: `${formatOperationAmount(payload.operation)} paid successfully.`,
	};
}

function createPaymentFailedIntent(
	payload: CoreEvents["melt-op:rolled-back"],
): NotificationIntent {
	const operation = payload.operation as unknown as Record<string, unknown>;
	const error = typeof operation["error"] === "string" ? operation["error"] : undefined;

	return {
		event: "paymentFailed",
		eventId: `melt-op:rolled-back:${payload.operationId}`,
		title: "Payment failed",
		body: error ?? "Reserved proofs were released back to your wallet.",
	};
}

function createTokenSpentIntent(
	payload: CoreEvents["send:finalized"],
): NotificationIntent {
	return {
		event: "tokenSpent",
		eventId: `send:finalized:${payload.operationId}`,
		title: "Token spent",
		body: `${formatOperationAmount(payload.operation)} was claimed by the recipient.`,
	};
}

function formatOperationAmount(operation: unknown): string {
	const record = operation as Record<string, unknown>;
	const amount = serializeAmount(record["amount"]);
	const unit = typeof record["unit"] === "string" ? record["unit"] : "sat";
	return `${amount} ${unit}`;
}

function serializeAmount(input: unknown): string {
	if (input === null || input === undefined) {
		return "0";
	}

	if (typeof input === "string") {
		return input;
	}

	if (typeof input === "number" || typeof input === "bigint") {
		return input.toString();
	}

	if (typeof input === "object" && "toString" in input) {
		return String(input.toString());
	}

	return String(input);
}

function createDefaultState(): NotificationState {
	return {
		schemaVersion: 1,
		settings: cloneSettings(DEFAULT_NOTIFICATION_SETTINGS),
		notifiedEventIds: [],
	};
}

function normalizeState(input: unknown): NotificationState {
	if (!input || typeof input !== "object") {
		return createDefaultState();
	}

	const record = input as Record<string, unknown>;
	const rawIds = Array.isArray(record["notifiedEventIds"])
		? record["notifiedEventIds"]
		: [];

	return {
		schemaVersion: 1,
		settings: normalizeSettings(record["settings"]),
		notifiedEventIds: rawIds
			.filter((id): id is string => typeof id === "string")
			.slice(0, NOTIFIED_EVENT_LIMIT),
	};
}

function normalizeSettings(input: unknown): WalletNotificationSettings {
	const record =
		input && typeof input === "object" ? (input as Record<string, unknown>) : {};
	const events =
		record["events"] && typeof record["events"] === "object"
			? (record["events"] as Record<string, unknown>)
			: {};

	return {
		enabled:
			typeof record["enabled"] === "boolean"
				? record["enabled"]
				: DEFAULT_NOTIFICATION_SETTINGS.enabled,
		silent:
			typeof record["silent"] === "boolean"
				? record["silent"]
				: DEFAULT_NOTIFICATION_SETTINGS.silent,
		events: {
			mintSettled: eventSetting(events, "mintSettled"),
			tokenReceived: eventSetting(events, "tokenReceived"),
			paymentCompleted: eventSetting(events, "paymentCompleted"),
			paymentFailed: eventSetting(events, "paymentFailed"),
			tokenSpent: eventSetting(events, "tokenSpent"),
		},
	};
}

function eventSetting(
	events: Record<string, unknown>,
	event: WalletNotificationEvent,
) {
	return typeof events[event] === "boolean"
		? events[event]
		: DEFAULT_NOTIFICATION_SETTINGS.events[event];
}

function cloneSettings(
	settings: WalletNotificationSettings,
): WalletNotificationSettings {
	return {
		enabled: settings.enabled,
		silent: settings.silent,
		events: { ...settings.events },
	};
}
