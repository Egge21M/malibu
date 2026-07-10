import * as React from "react";
import {
	getEncodedToken,
	type BalancesByMintAndUnit,
	type BalancesByUnit,
	type BalanceSnapshot,
	type HistoryEntry,
	type MeltQuote,
	type Mint,
	type MintQuote,
} from "@cashu/coco-core";
import {
	CocoCashuProvider,
	useBalances,
	useManager,
	useMeltOperation,
	useMintOperation,
	useMints,
	usePaginatedHistory,
	useReceiveOperation,
	useSendOperation,
} from "@cashu/coco-react";
import {
	Activity,
	ArrowDownLeft,
	ArrowRight,
	ArrowUpRight,
	AtSign,
	Check,
	CircleCheck,
	CircleDashed,
	Copy,
	Database,
	Download,
	History,
	Home,
	Landmark,
	Laptop,
	LockKeyhole,
	Moon,
	MoreHorizontal,
	Network,
	Plus,
	RefreshCw,
	ReceiptText,
	RotateCcw,
	Send,
	Settings,
	ShieldCheck,
	Sparkles,
	Sun,
	UserRound,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import {
	HashRouter,
	NavLink,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router";
import { toast } from "sonner";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Field as FieldRoot,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "@/components/ui/input-group";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { getRemoteCocoManager, walletClient } from "@/lib/wallet-client";
import type { ManagerEventName } from "@/lib/manager-rpc";
import type {
	NpcPaymentRequestDto,
	NpcSetUsernameResultDto,
	NpcStateDto,
} from "@/lib/wallet-rpc";
import type {
	BalanceSnapshotDto,
	MintBalanceDto,
	MintDto,
	WalletHistoryDto,
	WalletOperationDto,
	WalletQuoteDto,
	WalletSnapshot,
} from "@/lib/wallet-view";

type StatusState = {
	kind: "success" | "error" | "info";
	title: string;
	message?: string;
} | null;

type WalletViewContext = {
	snapshot: WalletSnapshot | null;
	status: StatusState;
	busy: string | null;
	trustedMints: MintDto[];
	totals: BalanceSnapshotDto[];
	operations: WalletOperationDto[];
	history: WalletHistoryDto[];
	npcState: NpcStateDto | null;
	npcUsername: string;
	setNpcUsername: (value: string) => void;
	lastNpcUsernameResult: NpcSetUsernameResultDto | null;
	mintUrl: string;
	setMintUrl: (value: string) => void;
	quoteMintUrl: string;
	setQuoteMintUrl: (value: string) => void;
	quoteAmount: string;
	setQuoteAmount: (value: string) => void;
	quoteUnit: string;
	setQuoteUnit: (value: string) => void;
	sendMintUrl: string;
	setSendMintUrl: (value: string) => void;
	sendAmount: string;
	setSendAmount: (value: string) => void;
	sendUnit: string;
	setSendUnit: (value: string) => void;
	sendMemo: string;
	setSendMemo: (value: string) => void;
	receiveToken: string;
	setReceiveToken: (value: string) => void;
	meltMintUrl: string;
	setMeltMintUrl: (value: string) => void;
	meltInvoice: string;
	setMeltInvoice: (value: string) => void;
	meltUnit: string;
	setMeltUnit: (value: string) => void;
	lastMintQuote: WalletQuoteDto | null;
	lastMintOperation: WalletOperationDto | null;
	preparedSend: WalletOperationDto | null;
	resultToken: string;
	preparedReceive: WalletOperationDto | null;
	preparedMelt: WalletOperationDto | null;
	loadSnapshot: () => Promise<void>;
	handleAddMint: (event: React.FormEvent<HTMLFormElement>) => void;
	handlePreviewMint: () => void;
	handleRestoreMint: () => void;
	handleCreateMintQuote: (event: React.FormEvent<HTMLFormElement>) => void;
	handleRefreshMintOperation: (operationId: string) => void;
	handlePrepareSend: (event: React.FormEvent<HTMLFormElement>) => void;
	handleExecuteSend: (operationId: string) => void;
	handleCancelSend: (operationId: string) => void;
	handlePrepareReceive: (event: React.FormEvent<HTMLFormElement>) => void;
	handleExecuteReceive: (operationId: string) => void;
	handleCancelReceive: (operationId: string) => void;
	handlePrepareMelt: (event: React.FormEvent<HTMLFormElement>) => void;
	handleExecuteMelt: (operationId: string) => void;
	handleCancelMelt: (operationId: string) => void;
	handleRefreshMeltOperation: (operationId: string) => void;
	handleOperationAction: (operation: WalletOperationDto) => void;
	handleSyncNpc: () => void;
	handlePreviewNpcUsername: (event: React.FormEvent<HTMLFormElement>) => void;
	handleBuyNpcUsername: () => void;
};

type RouteItem = {
	path: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
};

const WalletContext = React.createContext<WalletViewContext | null>(null);

const ZERO_TOTAL = {
	unit: "sat",
	spendable: "0",
	reserved: "0",
	total: "0",
};

const PRIMARY_ROUTES: RouteItem[] = [
	{ path: "/", label: "Overview", icon: Home },
	{ path: "/send", label: "Send", icon: ArrowUpRight },
	{ path: "/receive", label: "Receive", icon: ArrowDownLeft },
	{ path: "/activity", label: "Activity", icon: History },
	{ path: "/mints", label: "Mints", icon: Landmark },
	{ path: "/settings", label: "Settings", icon: Settings },
];

const OPERATION_REFRESH_EVENTS: ManagerEventName[] = [
	"mint-op:pending",
	"mint-op:executing",
	"mint-op:finalized",
	"mint-op:requeue",
	"send:prepared",
	"send:pending",
	"send:finalized",
	"send:rolled-back",
	"receive-op:prepared",
	"receive-op:finalized",
	"receive-op:rolled-back",
	"melt-op:prepared",
	"melt-op:pending",
	"melt-op:finalized",
	"melt-op:rolled-back",
];

function App() {
	const manager = React.useMemo(() => getRemoteCocoManager(), []);

	return (
		<CocoCashuProvider
			manager={manager}
			errorFallback={(error) => (
				<div className="min-h-svh bg-background p-6 text-foreground">
					<Alert variant="destructive">
						<AlertTitle>Wallet unavailable</AlertTitle>
						<AlertDescription>{getErrorMessage(error)}</AlertDescription>
					</Alert>
				</div>
			)}
		>
			<WalletWorkspace />
		</CocoCashuProvider>
	);
}

function WalletWorkspace() {
	const manager = useManager();
	const mintState = useMints();
	const { balances: walletBalances, refresh: refreshBalances } = useBalances();
	const {
		history: paginatedHistory,
		refresh: refreshHistory,
		isFetching: isHistoryFetching,
	} = usePaginatedHistory(24);
	const mintOperation = useMintOperation();
	const sendOperation = useSendOperation();
	const receiveOperation = useReceiveOperation();
	const meltOperation = useMeltOperation();
	const [status, setStatus] = React.useState<StatusState>(null);
	const [busy, setBusy] = React.useState<string | null>(null);
	const [dataDir, setDataDir] = React.useState("");
	const [operations, setOperations] = React.useState<WalletOperationDto[]>([]);
	const [npcState, setNpcState] = React.useState<NpcStateDto | null>(null);
	const [npcUsername, setNpcUsername] = React.useState("");
	const [lastNpcUsernameResult, setLastNpcUsernameResult] =
		React.useState<NpcSetUsernameResultDto | null>(null);
	const [mintUrl, setMintUrl] = React.useState("");
	const [quoteMintUrl, setQuoteMintUrl] = React.useState("");
	const [quoteAmount, setQuoteAmount] = React.useState("21");
	const [quoteUnit, setQuoteUnit] = React.useState("sat");
	const [sendMintUrl, setSendMintUrl] = React.useState("");
	const [sendAmount, setSendAmount] = React.useState("1");
	const [sendUnit, setSendUnit] = React.useState("sat");
	const [sendMemo, setSendMemo] = React.useState("");
	const [receiveToken, setReceiveToken] = React.useState("");
	const [meltMintUrl, setMeltMintUrl] = React.useState("");
	const [meltInvoice, setMeltInvoice] = React.useState("");
	const [meltUnit, setMeltUnit] = React.useState("sat");
	const [lastMintQuote, setLastMintQuote] =
		React.useState<WalletQuoteDto | null>(null);
	const [lastMintOperation, setLastMintOperation] =
		React.useState<WalletOperationDto | null>(null);
	const [preparedSend, setPreparedSend] =
		React.useState<WalletOperationDto | null>(null);
	const [resultToken, setResultToken] = React.useState("");
	const [preparedReceive, setPreparedReceive] =
		React.useState<WalletOperationDto | null>(null);
	const [preparedMelt, setPreparedMelt] =
		React.useState<WalletOperationDto | null>(null);
	const mints = React.useMemo(
		() => mintState.mints.map(toWalletMint),
		[mintState.mints],
	);
	const trustedMints = React.useMemo(
		() => mintState.trustedMints.map(toWalletMint),
		[mintState.trustedMints],
	);
	const balances = React.useMemo(
		() => toMintBalances(walletBalances.byMintAndUnit),
		[walletBalances.byMintAndUnit],
	);
	const totals = React.useMemo(
		() => toBalanceArray(walletBalances.totalByUnit),
		[walletBalances.totalByUnit],
	);
	const history = React.useMemo(
		() => paginatedHistory.map(toWalletHistory),
		[paginatedHistory],
	);
	const defaultMintUrl = trustedMints[0]?.mintUrl ?? "";
	const preparedSendView = React.useMemo(
		() => {
			const hookOperation = sendOperation.currentOperation
				? toWalletOperation("send", sendOperation.currentOperation)
				: null;

			return preparedSend ?? onlyPreparedOperation(hookOperation);
		},
		[preparedSend, sendOperation.currentOperation],
	);
	const preparedReceiveView = React.useMemo(
		() => {
			const hookOperation = receiveOperation.currentOperation
				? toWalletOperation("receive", receiveOperation.currentOperation)
				: null;

			return preparedReceive ?? onlyPreparedOperation(hookOperation);
		},
		[preparedReceive, receiveOperation.currentOperation],
	);
	const preparedMeltView = React.useMemo(
		() =>
			preparedMelt ??
			(meltOperation.currentOperation
				? toWalletOperation("melt", meltOperation.currentOperation)
				: null),
		[preparedMelt, meltOperation.currentOperation],
	);
	const walletSnapshot = React.useMemo<WalletSnapshot>(
		() => ({
			dataDir,
			totalByUnit: totals,
			balances,
			mints,
			pendingQuotes: lastMintQuote ? [lastMintQuote] : [],
			operations,
			history,
		}),
		[
			dataDir,
			totals,
			balances,
			mints,
			lastMintQuote,
			operations,
			history,
		],
	);

	const loadOperations = React.useCallback(async () => {
		const [
			pendingMintOperations,
			inFlightMintOperations,
			preparedSendOperations,
			inFlightSendOperations,
			preparedReceiveOperations,
			inFlightReceiveOperations,
			preparedMeltOperations,
			inFlightMeltOperations,
		] = await Promise.all([
			manager.ops.mint.listPending(),
			manager.ops.mint.listInFlight(),
			manager.ops.send.listPrepared(),
			manager.ops.send.listInFlight(),
			manager.ops.receive.listPrepared(),
			manager.ops.receive.listInFlight(),
			manager.ops.melt.listPrepared(),
			manager.ops.melt.listInFlight(),
		]);
		setOperations(
			uniqueOperations([
				...pendingMintOperations.map((operation) =>
					toWalletOperation("mint", operation),
				),
				...inFlightMintOperations.map((operation) =>
					toWalletOperation("mint", operation),
				),
				...preparedSendOperations.map((operation) =>
					toWalletOperation("send", operation),
				),
				...inFlightSendOperations.map((operation) =>
					toWalletOperation("send", operation),
				),
				...preparedReceiveOperations.map((operation) =>
					toWalletOperation("receive", operation),
				),
				...inFlightReceiveOperations.map((operation) =>
					toWalletOperation("receive", operation),
				),
				...preparedMeltOperations.map((operation) =>
					toWalletOperation("melt", operation),
				),
				...inFlightMeltOperations.map((operation) =>
					toWalletOperation("melt", operation),
				),
			]),
		);
	}, [manager]);

	const loadWalletState = React.useCallback(async () => {
		setBusy("refresh");
		try {
			await Promise.all([
				refreshBalances(),
				refreshHistory(),
				loadOperations(),
				walletClient.dataDir().then(setDataDir),
				walletClient.npc.getState().then((state) => {
					setNpcState(state);
					if (state.username) {
						setNpcUsername((current) => current || state.username || "");
					}
				}),
			]);
			setStatus(null);
		} catch (error) {
			setStatus({
				kind: "error",
				title: "Wallet unavailable",
				message: getErrorMessage(error),
			});
		} finally {
			setBusy(null);
		}
	}, [refreshBalances, refreshHistory, loadOperations]);

	React.useEffect(() => {
		void loadWalletState();
	}, [loadWalletState]);

	React.useEffect(() => {
		const reload = () => {
			void loadOperations().catch((error) => {
				setStatus({
					kind: "error",
					title: "Wallet unavailable",
					message: getErrorMessage(error),
				});
			});
		};
		const unsubscribers = OPERATION_REFRESH_EVENTS.map((event) =>
			manager.on(event, reload),
		);

		return () => {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	}, [manager, loadOperations]);

	React.useEffect(() => {
		if (!defaultMintUrl) {
			return;
		}

		setQuoteMintUrl((current) => current || defaultMintUrl);
		setSendMintUrl((current) => current || defaultMintUrl);
		setMeltMintUrl((current) => current || defaultMintUrl);
	}, [defaultMintUrl]);

	async function runAction<TData>(
		busyKey: string,
		action: () => Promise<TData>,
		successTitle: string,
		onData?: (data: TData) => void,
	) {
		setBusy(busyKey);
		try {
			const response = await action();
			onData?.(response);
			await Promise.all([
				refreshBalances(),
				refreshHistory(),
				loadOperations(),
				walletClient.npc.getState().then(setNpcState),
			]);
			setStatus({ kind: "success", title: successTitle });
		} catch (error) {
			setStatus({
				kind: "error",
				title: "Action failed",
				message: getErrorMessage(error),
			});
		} finally {
			setBusy(null);
		}
	}

	function handleSyncNpc() {
		void runAction(
			"syncNpc",
			() => walletClient.npc.sync(),
			"Lightning address synced",
			(state) => setNpcState(state),
		);
	}

	function handlePreviewNpcUsername(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"npcUsernamePreview",
			() => walletClient.npc.setUsername(npcUsername, false),
			"Username checked",
			(result) => {
				setLastNpcUsernameResult(result);
				setNpcState(result.state);
			},
		);
	}

	function handleBuyNpcUsername() {
		void runAction(
			"npcUsernameBuy",
			() => walletClient.npc.setUsername(npcUsername, true),
			"Username updated",
			(result) => {
				setLastNpcUsernameResult(result);
				setNpcState(result.state);
			},
		);
	}

	function handleAddMint(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"addMint",
			() => mintState.addNewMint(mintUrl, { trusted: true }),
			"Mint trusted",
		);
	}

	function handlePreviewMint() {
		void runAction(
			"previewMint",
			() => mintState.addNewMint(mintUrl, { trusted: false }),
			"Mint cached",
		);
	}

	function handleRestoreMint() {
		void runAction(
			"restoreMint",
			() => manager.wallet.restore(mintUrl, { units: [quoteUnit] }),
			"Restore started",
		);
	}

	function handleCreateMintQuote(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"mintQuote",
			async () => {
				const quote = await manager.quotes.mint.create({
					mintUrl: quoteMintUrl,
					method: "bolt11",
					amount: {
						amount: quoteAmount,
						unit: quoteUnit,
					},
				});
				const operation = await mintOperation.prepare({
					quote,
					amount: quoteAmount,
				});
				return { quote, operation };
			},
			"Lightning invoice ready",
			(data) => {
				setLastMintQuote(toWalletQuote(data.quote));
				setLastMintOperation(toWalletOperation("mint", data.operation));
			},
		);
	}

	function handleRefreshMintOperation(operationId: string) {
		void runAction(
			`mint:${operationId}`,
			() =>
				mintOperation.currentOperation?.id === operationId
					? mintOperation.refresh()
					: manager.ops.mint.refresh(operationId),
			"Lightning invoice checked",
			(data) => setLastMintOperation(toWalletOperation("mint", data)),
		);
	}

	function handlePrepareSend(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"prepareSend",
			() =>
				sendOperation.prepare({
					mintUrl: sendMintUrl,
					amount: {
						amount: sendAmount,
						unit: sendUnit,
					},
				}),
			"Send prepared",
			(data) => setPreparedSend(toWalletOperation("send", data)),
		);
	}

	function handleExecuteSend(operationId: string) {
		void runAction(
			"executeSend",
			() =>
				manager.ops.send.execute(operationId, {
					memo: sendMemo.trim() || undefined,
				}),
			"Token created",
			(data) => {
				setPreparedSend(null);
				setResultToken(encodeTokenValue(data.token));
			},
		);
	}

	function handleCancelSend(operationId: string) {
		void runAction(
			"cancelSend",
			() => manager.ops.send.cancel(operationId),
			"Send cancelled",
			() => setPreparedSend(null),
		);
	}

	function handlePrepareReceive(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"prepareReceive",
			() => receiveOperation.prepare({ token: receiveToken }),
			"Receive prepared",
			(data) => setPreparedReceive(toWalletOperation("receive", data)),
		);
	}

	function handleExecuteReceive(operationId: string) {
		void runAction(
			"executeReceive",
			() =>
				receiveOperation.currentOperation?.id === operationId
					? receiveOperation.execute()
					: manager.ops.receive.execute(operationId),
			"Token received",
			() => {
				setPreparedReceive(null);
				setReceiveToken("");
			},
		);
	}

	function handleCancelReceive(operationId: string) {
		void runAction(
			"cancelReceive",
			() => manager.ops.receive.cancel(operationId),
			"Receive cancelled",
			() => setPreparedReceive(null),
		);
	}

	function handlePrepareMelt(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"prepareMelt",
			async () => {
				const quote = await manager.quotes.melt.create({
					mintUrl: meltMintUrl,
					method: "bolt11",
					methodData: { invoice: meltInvoice },
					unit: meltUnit,
				});
				return meltOperation.prepare({ quote });
			},
			"Lightning payment prepared",
			(data) => setPreparedMelt(toWalletOperation("melt", data)),
		);
	}

	function handleExecuteMelt(operationId: string) {
		void runAction(
			"executeMelt",
			() =>
				meltOperation.currentOperation?.id === operationId
					? meltOperation.execute()
					: manager.ops.melt.execute(operationId),
			"Payment submitted",
			(data) => setPreparedMelt(toWalletOperation("melt", data)),
		);
	}

	function handleCancelMelt(operationId: string) {
		void runAction(
			"cancelMelt",
			() => manager.ops.melt.cancel(operationId),
			"Lightning payment cancelled",
			() => setPreparedMelt(null),
		);
	}

	function handleRefreshMeltOperation(operationId: string) {
		void runAction(
			`melt:${operationId}`,
			() =>
				meltOperation.currentOperation?.id === operationId
					? meltOperation.refresh()
					: manager.ops.melt.refresh(operationId),
			"Lightning payment refreshed",
			(data) => setPreparedMelt(toWalletOperation("melt", data)),
		);
	}

	function handleOperationAction(operation: WalletOperationDto) {
		if (operation.type === "mint") {
			handleRefreshMintOperation(operation.id);
			return;
		}

		if (operation.type === "send" && operation.state === "prepared") {
			handleExecuteSend(operation.id);
			return;
		}

		if (operation.type === "send" && operation.state === "pending") {
			void runAction(
				`send:${operation.id}`,
				() => manager.ops.send.reclaim(operation.id),
				"Send reclaimed",
			);
			return;
		}

		if (operation.type === "receive" && operation.state === "prepared") {
			handleExecuteReceive(operation.id);
			return;
		}

		if (operation.type === "melt" && operation.state === "prepared") {
			handleExecuteMelt(operation.id);
			return;
		}

		if (operation.type === "melt") {
			handleRefreshMeltOperation(operation.id);
		}
	}

	const displayedTotals = totals.length ? totals : [ZERO_TOTAL];
	const displayedBusy =
		busy ??
		(mintOperation.isLoading
			? "mintOperation"
			: sendOperation.isLoading
				? "sendOperation"
				: receiveOperation.isLoading
					? "receiveOperation"
					: meltOperation.isLoading
						? "meltOperation"
						: isHistoryFetching
							? "history"
						: null);
	const wallet = React.useMemo<WalletViewContext>(
		() => ({
			snapshot: walletSnapshot,
			status,
			busy: displayedBusy,
			trustedMints,
			totals: displayedTotals,
			operations,
			history,
			npcState,
			npcUsername,
			setNpcUsername,
			lastNpcUsernameResult,
			mintUrl,
			setMintUrl,
			quoteMintUrl,
			setQuoteMintUrl,
			quoteAmount,
			setQuoteAmount,
			quoteUnit,
			setQuoteUnit,
			sendMintUrl,
			setSendMintUrl,
			sendAmount,
			setSendAmount,
			sendUnit,
			setSendUnit,
			sendMemo,
			setSendMemo,
			receiveToken,
			setReceiveToken,
			meltMintUrl,
			setMeltMintUrl,
			meltInvoice,
			setMeltInvoice,
			meltUnit,
			setMeltUnit,
			lastMintQuote,
			lastMintOperation,
			preparedSend: preparedSendView,
			resultToken,
			preparedReceive: preparedReceiveView,
			preparedMelt: preparedMeltView,
			loadSnapshot: loadWalletState,
			handleAddMint,
			handlePreviewMint,
			handleRestoreMint,
			handleCreateMintQuote,
			handleRefreshMintOperation,
			handlePrepareSend,
			handleExecuteSend,
			handleCancelSend,
			handlePrepareReceive,
			handleExecuteReceive,
			handleCancelReceive,
			handlePrepareMelt,
			handleExecuteMelt,
			handleCancelMelt,
			handleRefreshMeltOperation,
			handleOperationAction,
			handleSyncNpc,
			handlePreviewNpcUsername,
			handleBuyNpcUsername,
		}),
		[
			walletSnapshot,
			status,
			displayedBusy,
			trustedMints,
			displayedTotals,
			operations,
			history,
			npcState,
			npcUsername,
			lastNpcUsernameResult,
			mintUrl,
			quoteMintUrl,
			quoteAmount,
			quoteUnit,
			sendMintUrl,
			sendAmount,
			sendUnit,
			sendMemo,
			receiveToken,
			meltMintUrl,
			meltInvoice,
			meltUnit,
			lastMintQuote,
			lastMintOperation,
			preparedSendView,
			resultToken,
			preparedReceiveView,
			preparedMeltView,
			loadWalletState,
		],
	);

	return (
		<WalletContext.Provider value={wallet}>
			<HashRouter>
				<WalletShell />
			</HashRouter>
		</WalletContext.Provider>
	);
}

function WalletShell() {
	const wallet = useWallet();
	const location = useLocation();
	const currentRoute = PRIMARY_ROUTES.find((route) =>
		route.path === "/"
			? location.pathname === "/"
			: location.pathname.startsWith(route.path),
	) ?? PRIMARY_ROUTES[0];
	const walletConnected =
		wallet.snapshot !== null && wallet.status?.kind !== "error";
	useWheelScrollFallback();

	React.useEffect(() => {
		if (!wallet.status) {
			return;
		}

		const options = {
			description: wallet.status.message,
			id: "wallet-status",
		};

		if (wallet.status.kind === "error") {
			toast.error(wallet.status.title, options);
			return;
		}

		if (wallet.status.kind === "success") {
			toast.success(wallet.status.title, options);
			return;
		}

		toast.info(wallet.status.title, options);
	}, [wallet.status]);

	React.useEffect(() => {
		window.scrollTo(0, 0);
	}, [location.pathname]);

	return (
		<TooltipProvider>
			<SidebarProvider
				defaultOpen
				style={
					{
						"--sidebar-width": "16.5rem",
					} as React.CSSProperties
				}
			>
				<AppSidebar />
				<SidebarInset className="min-h-svh overflow-hidden text-foreground">
					<header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
						<div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
							<div className="flex min-w-0 items-center gap-3">
								<SidebarTrigger aria-label="Toggle wallet navigation" />
								<div className="min-w-0">
									<p className="text-xs font-medium text-muted-foreground">Wallet</p>
									<h1 className="truncate text-lg font-semibold tracking-tight">
										{currentRoute.label}
									</h1>
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<Badge
									variant={walletConnected ? "secondary" : "outline"}
									className="hidden sm:inline-flex"
								>
									{walletConnected ? (
										<CircleCheck data-icon="inline-start" />
									) : (
										<CircleDashed data-icon="inline-start" />
									)}
									{walletConnected ? "Synced" : "Connecting"}
								</Badge>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Refresh wallet"
									disabled={wallet.busy !== null}
									onClick={() => void wallet.loadSnapshot()}
								>
									<RefreshCw
										className={cn(wallet.busy === "refresh" && "animate-spin")}
									/>
								</Button>
								<WalletMenu />
							</div>
						</div>
					</header>

					<div className="mx-auto w-full max-w-[90rem] px-4 pb-24 pt-2 sm:px-6 md:pb-8 lg:px-8 lg:pt-4">
						<main className="flex min-w-0 flex-col gap-6">
							{wallet.status?.kind === "error" ? (
								<StatusAlert status={wallet.status} />
							) : null}
							<Routes>
								<Route index element={<OverviewScreen />} />
								<Route path="mint" element={<Navigate to="/receive" replace />} />
								<Route path="mints" element={<MintsScreen />} />
								<Route path="send" element={<SendScreen />} />
								<Route path="receive" element={<ReceiveScreen />} />
								<Route path="melt" element={<Navigate to="/send" replace />} />
								<Route path="activity" element={<ActivityScreen />} />
								<Route path="settings" element={<SettingsScreen />} />
								<Route path="*" element={<Navigate to="/" replace />} />
							</Routes>
						</main>
					</div>
					<MobileActionDock />
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}

function WalletMenu() {
	const wallet = useWallet();
	const { theme, setTheme } = useTheme();
	const identity = wallet.npcState?.lightningAddress ?? "Private wallet";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon-lg" aria-label="Open wallet menu" />
				}
			>
				<Avatar>
					<AvatarFallback>M</AvatarFallback>
					<AvatarBadge />
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>
						<span className="block text-foreground">Malibu</span>
						<span className="block truncate font-normal">{identity}</span>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Appearance</DropdownMenuLabel>
					<DropdownMenuItem onClick={() => setTheme("light")}>
						<Sun />
						Light
						{theme === "light" ? <Check className="ml-auto" /> : null}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("dark")}>
						<Moon />
						Dark
						{theme === "dark" ? <Check className="ml-auto" /> : null}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("system")}>
						<Laptop />
						System
						{theme === "system" ? <Check className="ml-auto" /> : null}
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						render={<NavLink to="/settings" />}
					>
						<Settings />
						Wallet settings
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MobileActionDock() {
	const location = useLocation();

	return (
		<nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 gap-1 rounded-2xl border bg-background/90 p-1.5 shadow-xl backdrop-blur-xl md:hidden">
			{[
				{ path: "/", label: "Home", icon: Home },
				{ path: "/send", label: "Send", icon: ArrowUpRight },
				{ path: "/receive", label: "Receive", icon: ArrowDownLeft },
				{ path: "/activity", label: "Activity", icon: Activity },
			].map((item) => {
				const isActive =
					item.path === "/"
						? location.pathname === "/"
						: location.pathname.startsWith(item.path);

				return (
					<Button
						key={item.path}
						render={<NavLink to={item.path} end={item.path === "/"} />}
						nativeButton={false}
						variant={isActive ? "secondary" : "ghost"}
						className="h-auto flex-col gap-1 py-2 text-xs"
					>
						<item.icon />
						{item.label}
					</Button>
				);
			})}
		</nav>
	);
}

function AppSidebar() {
	const wallet = useWallet();
	const primaryTotal = wallet.totals[0] ?? ZERO_TOTAL;

	return (
		<Sidebar variant="inset" collapsible="icon">
			<SidebarHeader className="p-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={<NavLink to="/" />}
							size="lg"
							tooltip="Overview"
						>
							<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
								<Sparkles />
							</div>
							<div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
								<span className="truncate text-sm font-semibold tracking-tight">
									Malibu
								</span>
								<span className="truncate text-xs text-sidebar-foreground/70">
									Private digital cash
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className="px-1">
				<SidebarGroup>
					<SidebarGroupLabel>Workspace</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{PRIMARY_ROUTES.map((route) => (
								<SidebarRouteItem key={route.path} route={route} />
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarSeparator />
				<SidebarGroup className="group-data-[collapsible=icon]:hidden">
					<SidebarGroupLabel>Available balance</SidebarGroupLabel>
					<SidebarGroupContent className="px-2">
						<div className="rounded-xl bg-sidebar-accent p-4">
							<div className="flex items-baseline gap-2">
								<span className="truncate text-3xl font-semibold tracking-tight tabular-nums">
									{formatAmount(primaryTotal.spendable)}
								</span>
								<span className="text-xs font-semibold text-sidebar-primary uppercase">
									{primaryTotal.unit}
								</span>
							</div>
							<p className="mt-1 text-xs text-sidebar-foreground/65">
								{formatAmount(primaryTotal.reserved)} reserved
							</p>
							<div className="mt-4 grid grid-cols-2 gap-2">
								<Button
									render={<NavLink to="/send" />}
									nativeButton={false}
									size="sm"
								>
									<ArrowUpRight data-icon="inline-start" />
									Send
								</Button>
								<Button
									render={<NavLink to="/receive" />}
									nativeButton={false}
									variant="outline"
									size="sm"
								>
									<ArrowDownLeft data-icon="inline-start" />
									Receive
								</Button>
							</div>
						</div>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="p-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={<NavLink to="/settings" />}
							size="lg"
							tooltip="Wallet settings"
						>
							<Avatar size="sm">
								<AvatarFallback>M</AvatarFallback>
								<AvatarBadge />
							</Avatar>
							<div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
								<span className="truncate text-sm font-medium">
									{wallet.npcState?.lightningAddress ?? "Malibu wallet"}
								</span>
								<span className="truncate text-xs text-sidebar-foreground/65">
									{wallet.trustedMints.length} trusted mints
								</span>
							</div>
							<MoreHorizontal className="group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

function SidebarRouteItem({
	route,
}: {
	route: RouteItem;
}) {
	const Icon = route.icon;
	const location = useLocation();
	const isActive =
		route.path === "/"
			? location.pathname === "/"
			: location.pathname.startsWith(route.path);

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				render={<NavLink to={route.path} end={route.path === "/"} />}
				isActive={isActive}
				tooltip={route.label}
			>
				<Icon />
				<span>{route.label}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

function OverviewScreen() {
	const wallet = useWallet();
	const recentHistory = wallet.history.slice(0, 6);
	const activeOperations = wallet.operations.slice(0, 5);
	const preparedOperations = wallet.operations.filter(
		(operation) => operation.state === "prepared",
	);
	const pendingOperations = wallet.operations.filter(
		(operation) => operation.state === "pending",
	);
	const primaryTotal = wallet.totals[0] ?? ZERO_TOTAL;
	const otherTotals = wallet.totals.slice(1);
	const walletConnected = wallet.snapshot !== null && wallet.status?.kind !== "error";
	const usernameClaimed = wallet.npcState?.username !== null && wallet.npcState?.username !== undefined;
	const walletState = !walletConnected
		? {
				label: "Connecting",
				detail: "Waiting for the wallet service.",
				tone: "secondary" as const,
			}
		: wallet.trustedMints.length === 0
			? {
					label: "Setup needed",
					detail: "Add a trusted mint before moving funds.",
					tone: "destructive" as const,
				}
			: wallet.operations.length > 0
				? {
						label: "Attention",
						detail: `${wallet.operations.length} operation${
							wallet.operations.length === 1 ? "" : "s"
						} in progress.`,
						tone: "default" as const,
					}
				: {
						label: "Ready",
						detail: "Wallet is synced and ready to use.",
						tone: "default" as const,
					};

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.65fr)]">
				<Card className="min-w-0">
					<CardHeader>
						<CardTitle className="text-lg">Available balance</CardTitle>
						<CardDescription>{walletState.detail}</CardDescription>
						<CardAction className="flex items-center gap-2">
							<Badge variant={walletState.tone}>{walletState.label}</Badge>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Refresh wallet"
								disabled={wallet.busy !== null}
								onClick={() => void wallet.loadSnapshot()}
							>
								<RefreshCw
									className={cn(wallet.busy === "refresh" && "animate-spin")}
								/>
							</Button>
						</CardAction>
					</CardHeader>

					<CardContent>
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
						<div className="min-w-0">
							<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
								<span className="max-w-full truncate text-5xl font-semibold tracking-tight tabular-nums sm:text-7xl">
									{formatAmount(primaryTotal.spendable)}
								</span>
								<span className="text-sm font-semibold text-primary uppercase">
									{primaryTotal.unit}
								</span>
							</div>
							<div className="mt-6 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
								<InlineMetric
									label="Reserved"
									value={`${formatAmount(primaryTotal.reserved)} ${
										primaryTotal.unit
									}`}
								/>
								<InlineMetric
									label="Total"
									value={`${formatAmount(primaryTotal.total)} ${primaryTotal.unit}`}
								/>
							</div>
							{otherTotals.length ? (
								<div className="mt-5 flex flex-wrap gap-2">
									{otherTotals.map((total) => (
										<Badge
											key={total.unit}
											variant="outline"
											className="tabular-nums"
										>
											{formatAmount(total.spendable)} {total.unit}
										</Badge>
									))}
								</div>
							) : null}
						</div>

						<div className="grid content-start gap-3">
							<HomeStat
								label="Trusted mints"
								value={String(wallet.trustedMints.length)}
								detail={`${wallet.snapshot?.mints.length ?? 0} known`}
							/>
							<HomeStat
								label="Active work"
								value={String(wallet.operations.length)}
								detail={`${preparedOperations.length} prepared`}
							/>
							<HomeStat
								label="History"
								value={String(wallet.history.length)}
								detail="settled records"
							/>
						</div>
					</div>
					</CardContent>
					<CardFooter className="flex-wrap gap-2 bg-transparent">
						<Button
							render={<NavLink to="/send" />}
							nativeButton={false}
							size="lg"
						>
							<ArrowUpRight data-icon="inline-start" />
							Send money
						</Button>
						<Button
							render={<NavLink to="/receive" />}
							nativeButton={false}
							variant="secondary"
							size="lg"
						>
							<ArrowDownLeft data-icon="inline-start" />
							Receive
						</Button>
						<Button
							render={<NavLink to="/activity" />}
							nativeButton={false}
							variant="ghost"
							size="lg"
						>
							<Activity data-icon="inline-start" />
							Activity
						</Button>
					</CardFooter>
				</Card>

				<div className="grid gap-5">
					<LightningAddressCard />
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ShieldCheck />
								Readiness
							</CardTitle>
							<CardDescription>{walletState.detail}</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<ReadinessRow
								icon={Database}
								label="Wallet service"
								value={walletConnected ? "Connected" : "Connecting"}
								state={walletConnected ? "ok" : "muted"}
							/>
							<ReadinessRow
								icon={AtSign}
								label="Lightning address"
								value={usernameClaimed ? "Username" : "NPub"}
								state={wallet.npcState?.lightningAddress ? "ok" : "muted"}
							/>
							<ReadinessRow
								icon={Landmark}
								label="NPC mint"
								value={getNpcMintStatusLabel(wallet.npcState)}
								state={getNpcMintStatusState(wallet.npcState)}
							/>
							<ReadinessRow
								icon={Activity}
								label="Prepared operations"
								value={
									preparedOperations.length
										? `${preparedOperations.length} ready to run`
										: "Clear"
								}
								state={preparedOperations.length ? "warn" : "ok"}
							/>
							<ReadinessRow
								icon={RefreshCw}
								label="Pending settlement"
								value={pendingOperations.length ? String(pendingOperations.length) : "Clear"}
								state={pendingOperations.length ? "warn" : "ok"}
							/>
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
				<section className="flex min-w-0 flex-col gap-3">
					<SectionTitle
						icon={Landmark}
						title="Mint allocation"
						count={wallet.snapshot?.balances.length ?? 0}
					/>
					<MintAllocationList
						balances={wallet.snapshot?.balances ?? []}
						mints={wallet.snapshot?.mints ?? []}
					/>
				</section>

				<section className="flex min-w-0 flex-col gap-3">
					<SectionTitle
						icon={Activity}
						title="Active operations"
						count={wallet.operations.length}
					/>
					<OperationList
						operations={activeOperations}
						busy={wallet.busy}
						onAction={wallet.handleOperationAction}
						onCancelMelt={wallet.handleCancelMelt}
						onCancelSend={wallet.handleCancelSend}
						onCancelReceive={wallet.handleCancelReceive}
					/>
				</section>
			</div>

			<section className="flex min-w-0 flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<h3 className="flex items-center gap-2 text-base font-medium">
						<History />
						Recent movement
						<Badge variant="secondary">{wallet.history.length}</Badge>
					</h3>
					<Button
						render={<NavLink to="/activity" />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						<History data-icon="inline-start" />
						View all
					</Button>
				</div>
				<HistoryList history={recentHistory} />
			</section>
		</div>
	);
}

function MintsScreen() {
	const wallet = useWallet();

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				icon={Landmark}
				title="Mint network"
				description="Control where your ecash lives and how liquidity is distributed across trusted mint servers."
				action={
					<Badge variant={wallet.trustedMints.length ? "secondary" : "destructive"}>
						<ShieldCheck data-icon="inline-start" />
						{wallet.trustedMints.length} trusted
					</Badge>
				}
			/>
			<div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.7fr)_minmax(0,1.3fr)]">
				<MintManagementCard />
				<section className="flex min-w-0 flex-col gap-3">
					<SectionTitle
						icon={Activity}
						title="Liquidity distribution"
						count={wallet.snapshot?.balances.length ?? 0}
					/>
					<MintAllocationList
						balances={wallet.snapshot?.balances ?? []}
						mints={wallet.snapshot?.mints ?? []}
					/>
				</section>
			</div>
		</div>
	);
}

function SendScreen() {
	const wallet = useWallet();
	const total = wallet.totals[0] ?? ZERO_TOTAL;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				icon={ArrowUpRight}
				title="Send money"
				description="Create private ecash or pay a Lightning invoice from the same balance."
				action={
					<Badge variant="outline" className="tabular-nums">
						{formatAmount(total.spendable)} {total.unit} available
					</Badge>
				}
			/>
			<Card>
				<CardHeader>
					<CardTitle>Choose a payment rail</CardTitle>
					<CardDescription>
						Your wallet prepares every payment before proofs leave this device.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="ecash" className="gap-6">
						<TabsList variant="line" className="w-full justify-start sm:w-fit">
							<TabsTrigger value="ecash">
								<Wallet data-icon="inline-start" />
								Cashu token
							</TabsTrigger>
							<TabsTrigger value="lightning">
								<Zap data-icon="inline-start" />
								Lightning
							</TabsTrigger>
						</TabsList>
						<TabsContent value="ecash">
							<SendEcashPanel />
						</TabsContent>
						<TabsContent value="lightning">
							<SendLightningPanel />
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}

function SendEcashPanel() {
	const wallet = useWallet();

	return (
		<div className="flex flex-col gap-5">
			<Alert>
				<LockKeyhole />
				<AlertTitle>Private by default</AlertTitle>
				<AlertDescription>
					Reserve proofs and create a Cashu token for the recipient.
				</AlertDescription>
			</Alert>
			<form className="flex flex-col gap-4" onSubmit={wallet.handlePrepareSend}>
				<FieldGroup className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem_7rem_minmax(0,0.8fr)]">
					<Field label="Mint">
						<MintPicker
							value={wallet.sendMintUrl}
							mints={wallet.trustedMints}
							onChange={wallet.setSendMintUrl}
						/>
					</Field>
					<Field label="Amount">
						<Input
							inputMode="numeric"
							value={wallet.sendAmount}
							onChange={(event) => wallet.setSendAmount(event.target.value)}
						/>
					</Field>
					<Field label="Unit">
						<Input
							value={wallet.sendUnit}
							onChange={(event) => wallet.setSendUnit(event.target.value)}
						/>
					</Field>
					<Field label="Memo">
						<Input
							value={wallet.sendMemo}
							onChange={(event) => wallet.setSendMemo(event.target.value)}
						/>
					</Field>
				</FieldGroup>
				<Button
					type="submit"
					disabled={wallet.busy !== null}
					className="self-end"
				>
					Review transfer
					<ArrowRight data-icon="inline-end" />
				</Button>
			</form>

			<div className="grid gap-4 lg:grid-cols-2">
				{wallet.preparedSend ? (
					<OperationPreview operation={wallet.preparedSend}>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								size="sm"
								disabled={wallet.busy !== null}
								onClick={() => wallet.handleExecuteSend(wallet.preparedSend!.id)}
							>
								<Send data-icon="inline-start" />
								Create token
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={wallet.busy !== null}
								onClick={() => wallet.handleCancelSend(wallet.preparedSend!.id)}
							>
								<X data-icon="inline-start" />
								Cancel
							</Button>
						</div>
					</OperationPreview>
				) : (
					<EmptyState label="No prepared ecash send" />
				)}
				{wallet.resultToken ? (
					<OutputBlock title="Cashu token" value={wallet.resultToken} />
				) : null}
			</div>
		</div>
	);
}

function SendLightningPanel() {
	const wallet = useWallet();

	return (
		<div className="flex flex-col gap-5">
			<Alert>
				<Zap />
				<AlertTitle>Lightning payment</AlertTitle>
				<AlertDescription>
					Use wallet proofs to pay an external Lightning request.
				</AlertDescription>
			</Alert>
			<form className="flex flex-col gap-4" onSubmit={wallet.handlePrepareMelt}>
				<FieldGroup className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_8rem]">
					<Field label="Mint">
						<MintPicker
							value={wallet.meltMintUrl}
							mints={wallet.trustedMints}
							onChange={wallet.setMeltMintUrl}
						/>
					</Field>
					<Field label="Invoice">
						<Textarea
							value={wallet.meltInvoice}
							onChange={(event) => wallet.setMeltInvoice(event.target.value)}
							className="min-h-28"
						/>
					</Field>
					<Field label="Unit">
						<Input
							value={wallet.meltUnit}
							onChange={(event) => wallet.setMeltUnit(event.target.value)}
						/>
					</Field>
				</FieldGroup>
				<div className="flex justify-end">
					<Button type="submit" disabled={wallet.busy !== null}>
						Review payment
						<ArrowRight data-icon="inline-end" />
					</Button>
				</div>
			</form>

			{wallet.preparedMelt ? (
				<OperationPreview operation={wallet.preparedMelt}>
					<div className="flex flex-wrap gap-2">
						{wallet.preparedMelt.state === "prepared" ? (
							<>
								<Button
									type="button"
									size="sm"
									disabled={wallet.busy !== null}
									onClick={() => wallet.handleExecuteMelt(wallet.preparedMelt!.id)}
								>
									<Zap data-icon="inline-start" />
									Pay invoice
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={wallet.busy !== null}
									onClick={() => wallet.handleCancelMelt(wallet.preparedMelt!.id)}
								>
									<X data-icon="inline-start" />
									Cancel
								</Button>
							</>
						) : (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={wallet.busy !== null}
								onClick={() =>
									wallet.handleRefreshMeltOperation(wallet.preparedMelt!.id)
								}
							>
								<RefreshCw data-icon="inline-start" />
								Refresh
							</Button>
						)}
					</div>
				</OperationPreview>
			) : (
				<EmptyState label="No prepared Lightning payment" />
			)}
		</div>
	);
}

function ReceiveScreen() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				icon={ArrowDownLeft}
				title="Receive money"
				description="Redeem a private Cashu token or create a Lightning invoice for incoming funds."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Choose how to receive</CardTitle>
					<CardDescription>
						Incoming funds are verified before they join your spendable balance.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="ecash" className="gap-6">
						<TabsList variant="line" className="w-full justify-start sm:w-fit">
							<TabsTrigger value="ecash">
								<Wallet data-icon="inline-start" />
								Cashu token
							</TabsTrigger>
							<TabsTrigger value="lightning">
								<Download data-icon="inline-start" />
								Lightning
							</TabsTrigger>
						</TabsList>
						<TabsContent value="ecash">
							<ReceiveEcashPanel />
						</TabsContent>
						<TabsContent value="lightning">
							<ReceiveLightningPanel />
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}

function ReceiveEcashPanel() {
	const wallet = useWallet();

	return (
		<div className="flex flex-col gap-5">
			<Alert>
				<ShieldCheck />
				<AlertTitle>Verify before redeeming</AlertTitle>
				<AlertDescription>
					Inspect a Cashu token before accepting its proofs.
				</AlertDescription>
			</Alert>
			<form className="flex flex-col gap-4" onSubmit={wallet.handlePrepareReceive}>
				<FieldGroup>
					<Field label="Token">
						<Textarea
							value={wallet.receiveToken}
							onChange={(event) => wallet.setReceiveToken(event.target.value)}
							className="min-h-40"
						/>
					</Field>
				</FieldGroup>
				<Button
					type="submit"
					disabled={wallet.busy !== null}
					className="self-end"
				>
					Review token
					<ArrowRight data-icon="inline-end" />
				</Button>
			</form>

			{wallet.preparedReceive ? (
				<OperationPreview operation={wallet.preparedReceive}>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							disabled={wallet.busy !== null}
							onClick={() => wallet.handleExecuteReceive(wallet.preparedReceive!.id)}
						>
							<Check data-icon="inline-start" />
							Accept
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={wallet.busy !== null}
							onClick={() => wallet.handleCancelReceive(wallet.preparedReceive!.id)}
						>
							<X data-icon="inline-start" />
							Cancel
						</Button>
					</div>
				</OperationPreview>
			) : (
				<EmptyState label="No prepared ecash receive" />
			)}
		</div>
	);
}

function ReceiveLightningPanel() {
	const wallet = useWallet();

	return (
		<div className="flex flex-col gap-5">
			<Alert>
				<Zap />
				<AlertTitle>Invoice your way</AlertTitle>
				<AlertDescription>
					Create a payment request and settle it into ecash proofs.
				</AlertDescription>
			</Alert>
			<form className="flex flex-col gap-4" onSubmit={wallet.handleCreateMintQuote}>
				<FieldGroup className="grid gap-4 lg:grid-cols-[1fr_12rem_8rem]">
					<Field label="Mint">
						<MintPicker
							value={wallet.quoteMintUrl}
							mints={wallet.trustedMints}
							onChange={wallet.setQuoteMintUrl}
						/>
					</Field>
					<Field label="Amount">
						<Input
							inputMode="numeric"
							value={wallet.quoteAmount}
							onChange={(event) => wallet.setQuoteAmount(event.target.value)}
						/>
					</Field>
					<Field label="Unit">
						<Input
							value={wallet.quoteUnit}
							onChange={(event) => wallet.setQuoteUnit(event.target.value)}
						/>
					</Field>
				</FieldGroup>
				<Button
					type="submit"
					disabled={wallet.busy !== null}
					className="self-end"
				>
					<Download data-icon="inline-start" />
					Create invoice
				</Button>
			</form>

			<div className="grid gap-4 lg:grid-cols-2">
				{wallet.lastMintQuote ? (
					<OutputBlock
						title="Lightning invoice"
						value={wallet.lastMintQuote.request}
						meta={`${wallet.lastMintQuote.amount ?? wallet.quoteAmount} ${
							wallet.lastMintQuote.unit
						}`}
					/>
				) : (
					<EmptyState label="No active Lightning invoice" />
				)}
				{wallet.lastMintOperation ? (
					<OperationPreview operation={wallet.lastMintOperation}>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={wallet.busy !== null}
							onClick={() =>
								wallet.handleRefreshMintOperation(wallet.lastMintOperation!.id)
							}
						>
							<RefreshCw data-icon="inline-start" />
							Check settlement
						</Button>
					</OperationPreview>
				) : null}
			</div>
		</div>
	);
}

function ActivityScreen() {
	const wallet = useWallet();

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				icon={History}
				title="Wallet activity"
				description="Track transfers that still need attention and review completed movement across every mint."
				action={
					<Badge variant={wallet.operations.length ? "default" : "secondary"}>
						<Activity data-icon="inline-start" />
						{wallet.operations.length
							? `${wallet.operations.length} active`
							: "All clear"}
					</Badge>
				}
			/>
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<section className="flex min-w-0 flex-col gap-3">
					<SectionTitle
						icon={Activity}
						title="Operations"
						count={wallet.operations.length}
					/>
					<OperationList
						operations={wallet.operations}
						busy={wallet.busy}
						onAction={wallet.handleOperationAction}
						onCancelMelt={wallet.handleCancelMelt}
						onCancelSend={wallet.handleCancelSend}
						onCancelReceive={wallet.handleCancelReceive}
					/>
				</section>

				<section className="flex min-w-0 flex-col gap-3">
					<SectionTitle
						icon={History}
						title="Completed"
						count={wallet.history.length}
					/>
					<HistoryList history={wallet.history} />
				</section>
			</div>
		</div>
	);
}

function SettingsScreen() {
	const wallet = useWallet();

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				icon={Settings}
				title="Wallet settings"
				description="Manage your public Lightning identity, appearance, and local wallet storage."
			/>
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
				<NpcUsernameCard />
				<div className="flex flex-col gap-6">
					<AppearanceCard />
					<Card size="sm">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Database />
								Local storage
							</CardTitle>
							<CardDescription>
								Wallet proofs and metadata stay on this device.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">
								{wallet.snapshot?.dataDir ?? "Waiting for wallet bridge"}
							</p>
						</CardContent>
						{wallet.snapshot?.dataDir ? (
							<CardFooter>
								<CopyButton value={wallet.snapshot.dataDir} compact />
							</CardFooter>
						) : null}
					</Card>
				</div>
			</div>
		</div>
	);
}

function AppearanceCard() {
	const { theme, setTheme } = useTheme();
	const themes = [
		{ label: "Light", value: "light" },
		{ label: "Dark", value: "dark" },
		{ label: "Follow system", value: "system" },
	];

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Sun />
					Appearance
				</CardTitle>
				<CardDescription>Choose how Malibu looks on this device.</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<Field label="Theme">
						{(id) => (
							<Select
								items={themes}
								value={theme}
								onValueChange={(value) =>
									setTheme(value as "light" | "dark" | "system")
								}
							>
								<SelectTrigger id={id} className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{themes.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						)}
					</Field>
				</FieldGroup>
			</CardContent>
		</Card>
	);
}

function LightningAddressCard() {
	const wallet = useWallet();
	const address = wallet.npcState?.lightningAddress;
	const addressLabel = address ?? "Loading address";
	const syncBusy = wallet.busy === "syncNpc";
	const usernameClaimed = wallet.npcState?.username !== null && wallet.npcState?.username !== undefined;
	const canSyncNpc = wallet.npcState?.canSync ?? false;
	const mintStatusDetail = getNpcMintStatusDetail(wallet.npcState);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AtSign />
					Lightning address
				</CardTitle>
				<CardDescription>{getNpcHost(wallet.npcState)}</CardDescription>
				<CardAction>
					<Badge variant={address && canSyncNpc ? "default" : "secondary"}>
						{canSyncNpc ? (usernameClaimed ? "username" : "npub") : "waiting"}
					</Badge>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Item variant="muted">
					<ItemMedia variant="icon">
						<AtSign />
					</ItemMedia>
					<ItemContent>
						<ItemTitle className="text-base">{addressLabel}</ItemTitle>
						<ItemDescription className="truncate font-mono text-xs">
							{wallet.npcState?.publicKey ?? "Waiting for NPC identity"}
						</ItemDescription>
					</ItemContent>
				</Item>
				{wallet.npcState?.error ? (
					<Alert variant="destructive">
						<AlertTitle>NPC unavailable</AlertTitle>
						<AlertDescription>{wallet.npcState.error}</AlertDescription>
					</Alert>
				) : null}
				{wallet.npcState && wallet.npcState.mintStatus !== "ready" && !wallet.npcState.error ? (
					<Alert>
						<AlertTitle>{getNpcMintStatusLabel(wallet.npcState)}</AlertTitle>
						<AlertDescription>{mintStatusDetail}</AlertDescription>
					</Alert>
				) : null}
			</CardContent>
			<CardFooter className="flex-wrap gap-2">
				{address ? <CopyButton value={address} /> : null}
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={wallet.busy !== null || !canSyncNpc}
						onClick={wallet.handleSyncNpc}
					>
						<RefreshCw
							data-icon="inline-start"
							className={cn(syncBusy && "animate-spin")}
						/>
						Sync
					</Button>
					<Button
						render={<NavLink to="/settings" />}
						nativeButton={false}
						variant={usernameClaimed ? "ghost" : "default"}
						size="sm"
					>
						<UserRound data-icon="inline-start" />
						{usernameClaimed ? "Manage" : "Claim username"}
					</Button>
			</CardFooter>
		</Card>
	);
}

function NpcUsernameCard() {
	const wallet = useWallet();
	const paymentRequest = wallet.lastNpcUsernameResult?.success === false
		? wallet.lastNpcUsernameResult.paymentRequest
		: null;
	const usernameClaimed = wallet.npcState?.username !== null && wallet.npcState?.username !== undefined;
	const canSyncNpc = wallet.npcState?.canSync ?? false;

	return (
		<Card size="sm" className="self-start">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UserRound />
					Public Lightning identity
				</CardTitle>
				<CardDescription>
					{wallet.npcState?.lightningAddress ?? getNpcHost(wallet.npcState)}
				</CardDescription>
				<CardAction>
					<Badge variant={usernameClaimed && canSyncNpc ? "default" : "secondary"}>
						{usernameClaimed ? "claimed" : canSyncNpc ? "npub fallback" : "waiting"}
					</Badge>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<form className="flex flex-col gap-3" onSubmit={wallet.handlePreviewNpcUsername}>
					<FieldGroup className="gap-3">
						<Field label="Username">
							{(id) => (
								<InputGroup>
									<InputGroupAddon>
										<InputGroupText>@</InputGroupText>
									</InputGroupAddon>
									<InputGroupInput
										id={id}
										value={wallet.npcUsername}
										onChange={(event) => wallet.setNpcUsername(event.target.value)}
										placeholder="alice"
										autoCapitalize="none"
										autoCorrect="off"
									/>
								</InputGroup>
							)}
						</Field>
					</FieldGroup>
					<div className="flex flex-wrap gap-2">
						<Button type="submit" size="sm" disabled={wallet.busy !== null}>
							<ReceiptText data-icon="inline-start" />
							Check price
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={wallet.busy !== null || !wallet.npcUsername.trim()}
							onClick={wallet.handleBuyNpcUsername}
						>
							<Zap data-icon="inline-start" />
							Buy username
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={wallet.busy !== null || !canSyncNpc}
							onClick={wallet.handleSyncNpc}
						>
							<RefreshCw data-icon="inline-start" />
							Sync
						</Button>
					</div>
				</form>

				{paymentRequest ? (
					<div className="flex flex-col gap-3">
						<Alert>
							<Zap />
							<AlertTitle>Payment required</AlertTitle>
							<AlertDescription>
								{formatPaymentRequestAmount(paymentRequest)}
							</AlertDescription>
							<Button
								type="button"
								size="sm"
								className="mt-2 w-fit"
								disabled={wallet.busy !== null}
								onClick={wallet.handleBuyNpcUsername}
							>
								<Zap data-icon="inline-start" />
								Pay
							</Button>
						</Alert>
						{paymentRequest.encoded ? (
							<OutputBlock title="Payment request" value={paymentRequest.encoded} />
						) : null}
					</div>
				) : null}

				{wallet.npcState?.error ? (
					<Alert variant="destructive">
						<AlertTitle>NPC unavailable</AlertTitle>
						<AlertDescription>{wallet.npcState.error}</AlertDescription>
					</Alert>
				) : null}
			</CardContent>
		</Card>
	);
}

function MintManagementCard() {
	const wallet = useWallet();

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldCheck />
					Mint access
				</CardTitle>
				<CardDescription>
					Add a mint only when you trust the operator that backs its ecash.
				</CardDescription>
				<CardAction>
					<Badge variant={wallet.trustedMints.length ? "default" : "secondary"}>
						{wallet.trustedMints.length} trusted
					</Badge>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<form className="flex flex-col gap-3" onSubmit={wallet.handleAddMint}>
					<FieldGroup className="gap-3">
						<Field label="Mint URL">
							{(id) => (
								<InputGroup>
									<InputGroupAddon>
										<Network />
									</InputGroupAddon>
									<InputGroupInput
										id={id}
										value={wallet.mintUrl}
										onChange={(event) => wallet.setMintUrl(event.target.value)}
										placeholder="https://mint.example"
									/>
								</InputGroup>
							)}
						</Field>
					</FieldGroup>
					<div className="grid grid-cols-2 gap-2">
						<Button type="submit" size="sm" disabled={wallet.busy !== null}>
							<Plus data-icon="inline-start" />
							Trust
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={wallet.busy !== null}
							onClick={wallet.handlePreviewMint}
						>
							<Landmark data-icon="inline-start" />
							Preview
						</Button>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="w-full justify-start px-0"
						disabled={wallet.busy !== null}
						onClick={wallet.handleRestoreMint}
					>
						<RotateCcw data-icon="inline-start" />
						Restore selected mint
					</Button>
				</form>

				<ItemGroup>
					{wallet.snapshot?.mints.length ? (
						wallet.snapshot.mints.map((mint) => (
							<Item key={mint.mintUrl} variant="muted" size="sm">
								<ItemMedia variant="icon">
									<Landmark />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>{mint.name}</ItemTitle>
									<ItemDescription className="truncate">
										{mint.mintUrl}
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Badge variant={mint.trusted ? "default" : "secondary"}>
										{mint.trusted ? "Trusted" : "Cached"}
									</Badge>
								</ItemActions>
							</Item>
						))
					) : (
						<EmptyState label="No mints" />
					)}
				</ItemGroup>
			</CardContent>
		</Card>
	);
}

function PageHeader({
	icon: Icon,
	title,
	description,
	action,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<Badge variant="outline">
					<Icon data-icon="inline-start" />
					Private wallet
				</Badge>
				<h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
					{title}
				</h2>
				<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
					{description}
				</p>
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	);
}

function InlineMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<div className="text-xs font-medium text-muted-foreground">
				{label}
			</div>
			<div className="mt-1 truncate font-medium text-foreground tabular-nums">
				{value}
			</div>
		</div>
	);
}

function HomeStat({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<Item variant="muted" size="sm">
			<ItemContent>
				<ItemDescription>{label}</ItemDescription>
				<ItemTitle className="text-xl tabular-nums">{value}</ItemTitle>
			</ItemContent>
			<ItemActions>
				<span className="text-xs text-muted-foreground">{detail}</span>
			</ItemActions>
		</Item>
	);
}

function ReadinessRow({
	icon: Icon,
	label,
	value,
	state,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	state: "ok" | "warn" | "muted";
}) {
	return (
		<Item size="sm">
			<ItemMedia
				variant="icon"
				className={cn(
					state === "ok" && "text-primary",
					state === "warn" && "text-destructive",
					state === "muted" && "text-muted-foreground",
				)}
			>
				<Icon />
			</ItemMedia>
			<ItemContent>
				<ItemTitle>{label}</ItemTitle>
			</ItemContent>
			<ItemActions>
				<Badge variant={state === "warn" ? "destructive" : "secondary"}>
					{value}
				</Badge>
			</ItemActions>
		</Item>
	);
}

function MintAllocationList({
	balances,
	mints,
}: {
	balances: MintBalanceDto[];
	mints: MintDto[];
}) {
	if (!balances.length) {
		return <EmptyState label="No mint balances" />;
	}

	const spendableByUnit = balances.reduce<Map<string, bigint>>(
		(totals, balance) =>
			totals.set(
				balance.unit,
				(totals.get(balance.unit) ?? 0n) + toAmountBigInt(balance.spendable),
			),
		new Map(),
	);

	return (
		<ItemGroup>
			{balances.map((balance) => {
				const mint = mints.find((entry) => entry.mintUrl === balance.mintUrl);
				const percent = getBalancePercent(
					balance.spendable,
					String(spendableByUnit.get(balance.unit) ?? 0n),
				);

				return (
					<Item key={`${balance.mintUrl}:${balance.unit}`} variant="outline">
						<ItemMedia variant="icon">
							<Landmark />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>
								{mint?.name ?? "Unknown mint"}
								<Badge variant={mint?.trusted ? "secondary" : "outline"}>
									{mint?.trusted ? "Trusted" : "Cached"}
								</Badge>
							</ItemTitle>
							<ItemDescription className="truncate">
								{balance.mintUrl}
							</ItemDescription>
						</ItemContent>
						<ItemActions className="basis-full sm:basis-auto sm:min-w-48">
							<div className="w-full min-w-0">
								<div className="flex items-baseline justify-between gap-3">
									<span className="truncate font-semibold tabular-nums">
										{formatAmount(balance.spendable)} {balance.unit}
									</span>
									<span className="text-xs text-muted-foreground">{percent}%</span>
								</div>
								<Progress value={percent} className="mt-2" />
								<p className="mt-1 text-xs text-muted-foreground">
									{formatAmount(balance.reserved)} reserved
								</p>
							</div>
						</ItemActions>
					</Item>
				);
			})}
		</ItemGroup>
	);
}

function SectionTitle({
	icon: Icon,
	title,
	count,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	count: number;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<h3 className="flex items-center gap-2 text-base font-medium">
				<Icon />
				{title}
			</h3>
			<Badge variant="secondary">{count}</Badge>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode | ((id: string) => React.ReactNode);
}) {
	const id = React.useId();

	return (
		<FieldRoot className="min-w-0">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			{typeof children === "function"
				? children(id)
				: React.isValidElement(children)
				? React.cloneElement(children, { id } as React.HTMLAttributes<HTMLElement>)
				: children}
		</FieldRoot>
	);
}

function MintPicker({
	value,
	mints,
	onChange,
	id,
}: {
	value: string;
	mints: MintDto[];
	onChange: (value: string) => void;
	id?: string;
}) {
	if (!mints.length) {
		return (
			<Input
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="https://mint.example"
			/>
		);
	}

	const items = [
		{ label: "Select mint", value: null },
		...mints.map((mint) => ({ label: mint.name, value: mint.mintUrl })),
	];

	return (
		<Select
			items={items}
			value={value || null}
			onValueChange={(nextValue: string | null) => {
				if (typeof nextValue === "string") {
					onChange(nextValue);
				}
			}}
		>
			<SelectTrigger id={id} className="w-full">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{items.map((item) => (
						<SelectItem key={item.value ?? "placeholder"} value={item.value}>
							<span className="truncate">{item.label}</span>
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function OperationPreview({
	operation,
	children,
}: {
	operation: WalletOperationDto;
	children: React.ReactNode;
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{getOperationTypeLabel(operation.type)}
					<Badge variant="secondary">{operation.state}</Badge>
				</CardTitle>
				<CardDescription className="truncate">{operation.id}</CardDescription>
				<CardAction className="font-semibold tabular-nums">
					{operation.amount ? formatAmount(operation.amount) : "0"} {operation.unit}
				</CardAction>
			</CardHeader>
			<CardContent className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
				<Detail label="fee" value={operation.fee ?? "0"} />
				<Detail label="input" value={operation.inputAmount ?? "0"} />
				<Detail label="swap" value={operation.needsSwap ? "yes" : "no"} />
			</CardContent>
			<CardFooter className="gap-2">{children}</CardFooter>
		</Card>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<div className="text-xs text-muted-foreground">
				{label}
			</div>
			<div className="mt-1 truncate font-medium text-foreground">{value}</div>
		</div>
	);
}

function OutputBlock({
	title,
	value,
	meta,
}: {
	title: string;
	value: string;
	meta?: string;
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{meta ? <CardDescription>{meta}</CardDescription> : null}
				<CardAction>
					<CopyButton value={value} />
				</CardAction>
			</CardHeader>
			<CardContent>
				<InputGroup>
					<InputGroupTextarea
						value={value}
						readOnly
						className="min-h-28 font-mono text-xs"
					/>
				</InputGroup>
			</CardContent>
		</Card>
	);
}

function OperationList({
	operations,
	busy,
	onAction,
	onCancelMelt,
	onCancelSend,
	onCancelReceive,
}: {
	operations: WalletOperationDto[];
	busy: string | null;
	onAction: (operation: WalletOperationDto) => void;
	onCancelMelt: (operationId: string) => void;
	onCancelSend: (operationId: string) => void;
	onCancelReceive: (operationId: string) => void;
}) {
	if (!operations.length) {
		return <EmptyState label="No active operations" />;
	}

	return (
		<ScrollArea className="max-h-[34rem]">
			<ItemGroup className="pr-3">
			{operations.map((operation) => (
				<Item key={`${operation.type}:${operation.id}`} variant="outline" size="sm">
					<ItemMedia variant="icon">
						<Activity />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>
							{getOperationTypeLabel(operation.type)}
							<Badge variant="secondary">{operation.state}</Badge>
						</ItemTitle>
						<ItemDescription className="truncate">{operation.mintUrl}</ItemDescription>
					</ItemContent>
					<ItemContent className="flex-none text-right">
						<ItemTitle className="tabular-nums">
							{formatAmount(operation.amount ?? "0")} {operation.unit}
						</ItemTitle>
					</ItemContent>
					<ItemActions className="basis-full justify-end sm:basis-auto">
								{operation.token ? <CopyButton value={operation.token} compact /> : null}
								{operation.state === "prepared" ||
								operation.state === "pending" ||
								operation.type === "mint" ||
								operation.type === "melt" ? (
									<Button
										type="button"
										size="xs"
										variant="outline"
										disabled={busy !== null}
										onClick={() => onAction(operation)}
									>
										{operation.state === "prepared" ? (
											<Check data-icon="inline-start" />
										) : (
											<RefreshCw data-icon="inline-start" />
										)}
										{operation.state === "prepared" ? "Run" : "Refresh"}
									</Button>
								) : null}
								{operation.type === "send" && operation.state === "prepared" ? (
									<Button
										type="button"
										size="xs"
										variant="ghost"
										disabled={busy !== null}
										onClick={() => onCancelSend(operation.id)}
									>
										<X data-icon="inline-start" />
										Cancel
									</Button>
								) : null}
								{operation.type === "receive" && operation.state === "prepared" ? (
									<Button
										type="button"
										size="xs"
										variant="ghost"
										disabled={busy !== null}
										onClick={() => onCancelReceive(operation.id)}
									>
										<X data-icon="inline-start" />
										Cancel
									</Button>
								) : null}
								{operation.type === "melt" && operation.state === "prepared" ? (
									<Button
										type="button"
										size="xs"
										variant="ghost"
										disabled={busy !== null}
										onClick={() => onCancelMelt(operation.id)}
									>
										<X data-icon="inline-start" />
									Cancel
								</Button>
							) : null}
					</ItemActions>
				</Item>
			))}
			</ItemGroup>
		</ScrollArea>
	);
}

function HistoryList({ history }: { history: WalletHistoryDto[] }) {
	if (!history.length) {
		return <EmptyState label="No history" />;
	}

	return (
		<ScrollArea className="max-h-[34rem]">
			<ItemGroup className="pr-3">
			{history.map((entry) => (
				<Item key={entry.id} variant="outline" size="sm">
					<ItemMedia variant="icon">
						{entry.type === "receive" || entry.type === "mint" ? (
							<ArrowDownLeft />
						) : (
							<ArrowUpRight />
						)}
					</ItemMedia>
					<ItemContent>
						<ItemTitle>
							{getOperationTypeLabel(entry.type)}
							<Badge variant="secondary">{entry.state}</Badge>
						</ItemTitle>
						<ItemDescription className="truncate">{entry.mintUrl}</ItemDescription>
					</ItemContent>
					<ItemContent className="flex-none text-right">
						<ItemTitle className="ml-auto tabular-nums">
							{entry.type === "receive" || entry.type === "mint" ? "+" : "−"}
							{formatAmount(entry.amount)} {entry.unit}
						</ItemTitle>
						<ItemDescription>{formatDate(entry.updatedAt)}</ItemDescription>
					</ItemContent>
				</Item>
			))}
			</ItemGroup>
		</ScrollArea>
	);
}

function CopyButton({
	value,
	compact = false,
}: {
	value: string;
	compact?: boolean;
}) {
	const [copied, setCopied] = React.useState(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	}

	return (
		<Button
			type="button"
			size={compact ? "xs" : "sm"}
			variant="outline"
			onClick={() => void handleCopy()}
		>
			<Copy data-icon="inline-start" />
			{copied ? "Copied" : "Copy"}
		</Button>
	);
}

function StatusAlert({ status }: { status: NonNullable<StatusState> }) {
	return (
		<Alert variant={status.kind === "error" ? "destructive" : "default"}>
			<AlertTitle>{status.title}</AlertTitle>
			{status.message ? (
				<AlertDescription>{status.message}</AlertDescription>
			) : null}
		</Alert>
	);
}

function EmptyState({ label }: { label: string }) {
	return (
		<Empty className="min-h-32 border p-4">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Sparkles />
				</EmptyMedia>
				<EmptyTitle>{label}</EmptyTitle>
				<EmptyDescription>
					This area will update automatically when wallet activity appears.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function useWallet() {
	const wallet = React.useContext(WalletContext);
	if (!wallet) {
		throw new Error("useWallet must be used within WalletContext");
	}

	return wallet;
}

function useWheelScrollFallback() {
	React.useEffect(() => {
		function handleWheel(event: WheelEvent) {
			if (
				event.defaultPrevented ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				!(event.target instanceof Element)
			) {
				return;
			}

			const delta = getWheelDelta(event);
			if (delta.x === 0 && delta.y === 0) {
				return;
			}

			const scroller = findWheelScroller(event.target, delta);
			if (!scroller) {
				return;
			}

			event.preventDefault();
			scroller.scrollBy({
				left: delta.x,
				top: delta.y,
				behavior: "auto",
			});
		}

		window.addEventListener("wheel", handleWheel, {
			capture: true,
			passive: false,
		});

		return () => {
			window.removeEventListener("wheel", handleWheel, { capture: true });
		};
	}, []);
}

function getWheelDelta(event: WheelEvent) {
	const scale =
		event.deltaMode === WheelEvent.DOM_DELTA_LINE
			? 16
			: event.deltaMode === WheelEvent.DOM_DELTA_PAGE
				? window.innerHeight
				: 1;

	return {
		x: event.deltaX * scale,
		y: event.deltaY * scale,
	};
}

function findWheelScroller(target: Element, delta: { x: number; y: number }) {
	const documentScroller = document.scrollingElement;
	let element: Element | null = target;

	while (element) {
		if (
			element instanceof HTMLElement &&
			isScrollableElement(element) &&
			canScrollByDelta(element, delta)
		) {
			return element;
		}

		element = element.parentElement;
	}

	if (
		documentScroller instanceof HTMLElement &&
		canScrollByDelta(documentScroller, delta)
	) {
		return documentScroller;
	}

	return null;
}

function isScrollableElement(element: HTMLElement) {
	const style = window.getComputedStyle(element);
	const canScrollY =
		/(auto|scroll|overlay)/.test(style.overflowY) &&
		element.scrollHeight > element.clientHeight;
	const canScrollX =
		/(auto|scroll|overlay)/.test(style.overflowX) &&
		element.scrollWidth > element.clientWidth;

	return canScrollY || canScrollX;
}

function canScrollByDelta(element: HTMLElement, delta: { x: number; y: number }) {
	const canScrollY =
		delta.y < 0
			? element.scrollTop > 0
			: delta.y > 0
				? element.scrollTop + element.clientHeight < element.scrollHeight - 1
				: false;
	const canScrollX =
		delta.x < 0
			? element.scrollLeft > 0
			: delta.x > 0
				? element.scrollLeft + element.clientWidth < element.scrollWidth - 1
				: false;

	return canScrollY || canScrollX;
}

function toWalletMint(mint: Mint): MintDto {
	return {
		mintUrl: mint.mintUrl,
		name: mint.name || mint.mintUrl,
		trusted: mint.trusted,
		createdAt: mint.createdAt,
		updatedAt: mint.updatedAt,
	};
}

function toBalanceArray(balances: BalancesByUnit): BalanceSnapshotDto[] {
	return Object.values(balances).map(toBalanceSnapshot);
}

function toBalanceSnapshot(balance: BalanceSnapshot): BalanceSnapshotDto {
	return {
		spendable: amountToString(balance.spendable),
		reserved: amountToString(balance.reserved),
		total: amountToString(balance.total),
		unit: balance.unit,
	};
}

function toMintBalances(balances: BalancesByMintAndUnit): MintBalanceDto[] {
	return Object.entries(balances).flatMap(([mintUrl, unitBalances]) =>
		Object.values(unitBalances).map((balance) => ({
			mintUrl,
			...toBalanceSnapshot(balance),
		})),
	);
}

function toWalletQuote(quote: MintQuote | MeltQuote): WalletQuoteDto {
	const record = quote as unknown as Record<string, unknown>;

	return {
		quoteId: String(record["quoteId"]),
		method: String(record["method"]),
		mintUrl: String(record["mintUrl"]),
		request: String(record["request"]),
		unit: String(record["unit"]),
		amount: optionalAmountToString(record["amount"]),
		state: record["state"] === undefined ? undefined : String(record["state"]),
		expiry:
			typeof record["expiry"] === "number" ? record["expiry"] : null,
		feeReserve: optionalAmountToString(record["fee_reserve"]),
		createdAt: Number(record["createdAt"]),
		updatedAt: Number(record["updatedAt"]),
	};
}

function toWalletOperation(
	type: WalletOperationDto["type"],
	operation: unknown,
): WalletOperationDto {
	const record = operation as Record<string, unknown>;

	return {
		id: String(record["id"]),
		type,
		state: String(record["state"]),
		mintUrl: String(record["mintUrl"]),
		unit: String(record["unit"] ?? "sat"),
		amount: optionalAmountToString(record["amount"]),
		fee:
			optionalAmountToString(record["fee"]) ??
			optionalAmountToString(record["fee_reserve"]) ??
			optionalAmountToString(record["swap_fee"]),
		inputAmount: optionalAmountToString(record["inputAmount"]),
		needsSwap:
			typeof record["needsSwap"] === "boolean"
				? record["needsSwap"]
				: undefined,
		quoteId:
			typeof record["quoteId"] === "string" ? record["quoteId"] : undefined,
		request:
			typeof record["request"] === "string" ? record["request"] : undefined,
		token:
			record["token"] === undefined
				? undefined
				: encodeTokenValue(record["token"]),
		error: typeof record["error"] === "string" ? record["error"] : undefined,
		createdAt: Number(record["createdAt"]),
		updatedAt: Number(record["updatedAt"]),
	};
}

function toWalletHistory(entry: HistoryEntry): WalletHistoryDto {
	const record = entry as unknown as Record<string, unknown>;

	return {
		id: entry.id,
		type: entry.type,
		source: entry.source,
		state: String(record["state"]),
		mintUrl: entry.mintUrl,
		unit: entry.unit,
		amount: amountToString(record["amount"]),
		operationId:
			typeof record["operationId"] === "string"
				? record["operationId"]
				: undefined,
		quoteId: typeof record["quoteId"] === "string" ? record["quoteId"] : undefined,
		error: typeof record["error"] === "string" ? record["error"] : undefined,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
	};
}

function uniqueOperations(operations: WalletOperationDto[]) {
	const byId = new Map<string, WalletOperationDto>();
	for (const operation of operations) {
		byId.set(`${operation.type}:${operation.id}`, operation);
	}

	return [...byId.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

function onlyPreparedOperation(operation: WalletOperationDto | null) {
	return operation?.state === "prepared" ? operation : null;
}

function optionalAmountToString(value: unknown): string | undefined {
	if (value === null || value === undefined) {
		return undefined;
	}

	return amountToString(value);
}

function amountToString(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" || typeof value === "bigint") {
		return value.toString();
	}
	if (value && typeof value === "object" && "toString" in value) {
		return String(value.toString());
	}

	return String(value ?? "0");
}

function encodeTokenValue(token: unknown): string {
	if (typeof token === "string") {
		return token;
	}

	try {
		return getEncodedToken(token as Parameters<typeof getEncodedToken>[0]);
	} catch {
		return JSON.stringify(token);
	}
}

function getOperationTypeLabel(type: WalletOperationDto["type"]) {
	if (type === "mint") {
		return "receive lightning";
	}

	if (type === "melt") {
		return "send lightning";
	}

	if (type === "send") {
		return "send ecash";
	}

	return "receive ecash";
}

function formatAmount(value: string) {
	try {
		return BigInt(value).toLocaleString();
	} catch {
		return value;
	}
}

function toAmountBigInt(value: string) {
	try {
		return BigInt(value);
	} catch {
		return 0n;
	}
}

function getBalancePercent(spendable: string, total: string) {
	try {
		const spendableValue = BigInt(spendable);
		const totalValue = BigInt(total);
		if (totalValue <= 0n) {
			return 0;
		}

		const percent = Number((spendableValue * 100n) / totalValue);
		return Math.min(100, Math.max(0, percent));
	} catch {
		return 0;
	}
}

function formatDate(value: number) {
	return new Date(value).toLocaleString(undefined, {
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getNpcHost(state: NpcStateDto | null) {
	if (!state) {
		return "NPC account loading";
	}

	try {
		return new URL(state.baseUrl).host;
	} catch {
		return state.baseUrl;
	}
}

function getNpcMintStatusLabel(state: NpcStateDto | null) {
	if (!state) {
		return "Loading";
	}

	if (state.mintStatus === "ready") {
		return "Aligned";
	}

	if (state.mintStatus === "waiting-for-mint") {
		return "Waiting for mint";
	}

	return "Needs attention";
}

function getNpcMintStatusState(
	state: NpcStateDto | null,
): "ok" | "warn" | "muted" {
	if (!state) {
		return "muted";
	}

	if (state.mintStatus === "ready") {
		return "ok";
	}

	if (state.mintStatus === "blocked") {
		return "warn";
	}

	return "muted";
}

function getNpcMintStatusDetail(state: NpcStateDto | null) {
	if (!state) {
		return "NPC account loading";
	}

	if (state.mintStatusDetail) {
		return state.mintStatusDetail;
	}

	if (state.receiveMintUrl) {
		return state.receiveMintUrl;
	}

	return "Add a trusted mint before NPC imports payments.";
}

function formatPaymentRequestAmount(paymentRequest: NpcPaymentRequestDto) {
	const amount = paymentRequest.amount;
	const unit = paymentRequest.unit;

	if (amount && unit) {
		return `${formatAmount(amount)} ${unit}`;
	}

	return paymentRequest.description ?? "Payment quote returned";
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

export default App;
