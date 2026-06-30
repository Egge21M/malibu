import * as React from "react";
import {
	Activity,
	Check,
	Copy,
	Database,
	Download,
	History,
	Home,
	Landmark,
	Plus,
	RefreshCw,
	RotateCcw,
	Send,
	Settings,
	ShieldCheck,
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
} from "react-router";

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
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { walletClient } from "@/lib/wallet-client";
import type {
	BalanceSnapshotDto,
	MintBalanceDto,
	MintDto,
	WalletActionResult,
	WalletHistoryDto,
	WalletOperationDto,
	WalletQuoteDto,
	WalletSnapshot,
} from "@/lib/wallet-rpc";

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
	{ path: "/mint", label: "Mint", icon: Download },
	{ path: "/send", label: "Send", icon: Send },
	{ path: "/receive", label: "Receive", icon: Check },
	{ path: "/melt", label: "Melt", icon: Zap },
	{ path: "/activity", label: "Activity", icon: History },
	{ path: "/settings", label: "Settings", icon: Settings },
];

function App() {
	const [snapshot, setSnapshot] = React.useState<WalletSnapshot | null>(null);
	const [status, setStatus] = React.useState<StatusState>(null);
	const [busy, setBusy] = React.useState<string | null>("snapshot");
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
	const trustedMints = React.useMemo(
		() => snapshot?.mints.filter((mint) => mint.trusted) ?? [],
		[snapshot],
	);
	const defaultMintUrl = trustedMints[0]?.mintUrl ?? "";

	const loadSnapshot = React.useCallback(async () => {
		setBusy("snapshot");
		try {
			const nextSnapshot = await walletClient.snapshot();
			setSnapshot(nextSnapshot);
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
	}, []);

	React.useEffect(() => {
		void loadSnapshot();
	}, [loadSnapshot]);

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
		action: () => Promise<WalletSnapshot | WalletActionResult<TData>>,
		successTitle: string,
		onData?: (data: TData) => void,
	) {
		setBusy(busyKey);
		try {
			const response = await action();
			if (isActionResult(response)) {
				setSnapshot(response.snapshot);
				onData?.(response.data);
			} else {
				setSnapshot(response);
				onData?.(undefined as TData);
			}
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

	function handleAddMint(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"addMint",
			() => walletClient.addMint({ mintUrl, trusted: true }),
			"Mint trusted",
		);
	}

	function handlePreviewMint() {
		void runAction(
			"previewMint",
			() => walletClient.addMint({ mintUrl, trusted: false }),
			"Mint cached",
		);
	}

	function handleRestoreMint() {
		void runAction(
			"restoreMint",
			() => walletClient.restoreMint({ mintUrl, units: [quoteUnit] }),
			"Restore started",
		);
	}

	function handleCreateMintQuote(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"mintQuote",
			() =>
				walletClient.createMintQuote({
					mintUrl: quoteMintUrl,
					amount: quoteAmount,
					unit: quoteUnit,
				}),
			"Mint quote ready",
			(data) => {
				setLastMintQuote(data.quote);
				setLastMintOperation(data.operation);
			},
		);
	}

	function handleRefreshMintOperation(operationId: string) {
		void runAction(
			`mint:${operationId}`,
			() => walletClient.refreshMintOperation({ operationId }),
			"Mint checked",
			(data) => setLastMintOperation(data),
		);
	}

	function handlePrepareSend(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"prepareSend",
			() =>
				walletClient.prepareSend({
					mintUrl: sendMintUrl,
					amount: sendAmount,
					unit: sendUnit,
				}),
			"Send prepared",
			(data) => setPreparedSend(data),
		);
	}

	function handleExecuteSend(operationId: string) {
		void runAction(
			"executeSend",
			() => walletClient.executeSend({ operationId, memo: sendMemo }),
			"Token created",
			(data) => {
				setPreparedSend(null);
				setResultToken(data.token);
			},
		);
	}

	function handleCancelSend(operationId: string) {
		void runAction(
			"cancelSend",
			() => walletClient.cancelSend({ operationId }),
			"Send cancelled",
			() => setPreparedSend(null),
		);
	}

	function handlePrepareReceive(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"prepareReceive",
			() => walletClient.prepareReceive({ token: receiveToken }),
			"Receive prepared",
			(data) => setPreparedReceive(data),
		);
	}

	function handleExecuteReceive(operationId: string) {
		void runAction(
			"executeReceive",
			() => walletClient.executeReceive({ operationId }),
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
			() => walletClient.cancelReceive({ operationId }),
			"Receive cancelled",
			() => setPreparedReceive(null),
		);
	}

	function handlePrepareMelt(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void runAction(
			"prepareMelt",
			() =>
				walletClient.prepareMelt({
					mintUrl: meltMintUrl,
					invoice: meltInvoice,
					unit: meltUnit,
				}),
			"Melt prepared",
			(data) => setPreparedMelt(data.operation),
		);
	}

	function handleExecuteMelt(operationId: string) {
		void runAction(
			"executeMelt",
			() => walletClient.executeMelt({ operationId }),
			"Payment submitted",
			(data) => setPreparedMelt(data),
		);
	}

	function handleCancelMelt(operationId: string) {
		void runAction(
			"cancelMelt",
			() => walletClient.cancelMelt({ operationId }),
			"Melt cancelled",
			() => setPreparedMelt(null),
		);
	}

	function handleRefreshMeltOperation(operationId: string) {
		void runAction(
			`melt:${operationId}`,
			() => walletClient.refreshMeltOperation({ operationId }),
			"Melt refreshed",
			(data) => setPreparedMelt(data),
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
				() => walletClient.reclaimSend({ operationId: operation.id }),
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

	const totals = snapshot?.totalByUnit.length ? snapshot.totalByUnit : [ZERO_TOTAL];
	const operations = snapshot?.operations ?? [];
	const history = snapshot?.history ?? [];
	const wallet = React.useMemo<WalletViewContext>(
		() => ({
			snapshot,
			status,
			busy,
			trustedMints,
			totals,
			operations,
			history,
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
			preparedSend,
			resultToken,
			preparedReceive,
			preparedMelt,
			loadSnapshot,
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
		}),
		[
			snapshot,
			status,
			busy,
			trustedMints,
			totals,
			operations,
			history,
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
			preparedSend,
			resultToken,
			preparedReceive,
			preparedMelt,
			loadSnapshot,
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
	useWheelScrollFallback();

	return (
		<div className="min-h-svh bg-background text-foreground">
			<header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center border bg-primary text-primary-foreground shadow-sm">
							<Wallet className="size-4" />
						</div>
						<div className="min-w-0">
							<h1 className="truncate text-base font-semibold tracking-wider uppercase">
								Malibu
							</h1>
							<p className="hidden truncate text-xs text-muted-foreground sm:block">
								Private Cashu wallet powered by Coco
							</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Badge variant={wallet.snapshot ? "default" : "secondary"}>
							{wallet.snapshot ? "connected" : "connecting"}
						</Badge>
						<Badge
							variant={wallet.trustedMints.length ? "default" : "secondary"}
							className="hidden sm:inline-flex"
						>
							{wallet.trustedMints.length} trusted mints
						</Badge>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							aria-label="Refresh wallet"
							disabled={wallet.busy !== null}
							onClick={() => void wallet.loadSnapshot()}
						>
							<RefreshCw
								className={wallet.busy === "snapshot" ? "animate-spin" : ""}
							/>
						</Button>
					</div>
				</div>
			</header>

			<div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 pb-24 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-7 lg:pb-7">
				<aside className="hidden lg:block">
					<DesktopNav />
				</aside>
				<main className="min-w-0 space-y-5">
					{wallet.status ? <StatusAlert status={wallet.status} /> : null}
					<Routes>
						<Route index element={<OverviewScreen />} />
						<Route path="mint" element={<MintScreen />} />
						<Route path="send" element={<SendScreen />} />
						<Route path="receive" element={<ReceiveScreen />} />
						<Route path="melt" element={<MeltScreen />} />
						<Route path="activity" element={<ActivityScreen />} />
						<Route path="settings" element={<SettingsScreen />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</main>
			</div>

			<MobileNav />
		</div>
	);
}

function DesktopNav() {
	const wallet = useWallet();

	return (
		<nav className="sticky top-24 space-y-4">
			<Card size="sm" className="bg-primary/5 ring-primary/15">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm text-primary">
						<Activity className="size-4" />
						Balance
					</CardTitle>
					<CardDescription>Spendable proofs</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{wallet.totals.map((total) => (
						<div
							key={total.unit}
							className="border-l-2 border-primary/50 pl-3"
						>
							<div className="flex min-w-0 items-baseline gap-2">
								<span className="truncate text-3xl font-semibold tabular-nums">
									{formatAmount(total.spendable)}
								</span>
								<span className="text-xs font-semibold uppercase text-primary">
									{total.unit}
								</span>
							</div>
							<div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
								<span>total {formatAmount(total.total)}</span>
								<span>reserved {formatAmount(total.reserved)}</span>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
			<div className="grid gap-1">
				{PRIMARY_ROUTES.map((route) => (
					<NavItem key={route.path} route={route} />
				))}
			</div>
		</nav>
	);
}

function MobileNav() {
	return (
		<nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-2 py-2 backdrop-blur lg:hidden">
			<div className="mx-auto grid max-w-lg grid-cols-7 gap-1">
				{PRIMARY_ROUTES.map((route) => (
					<NavItem key={route.path} route={route} compact />
				))}
			</div>
		</nav>
	);
}

function NavItem({
	route,
	compact = false,
}: {
	route: RouteItem;
	compact?: boolean;
}) {
	const Icon = route.icon;

	return (
		<NavLink
			to={route.path}
			end={route.path === "/"}
			title={route.label}
			aria-label={route.label}
			className={({ isActive }) =>
				cn(
					"flex min-w-0 items-center gap-2 border px-3 py-2 text-xs font-semibold tracking-wider uppercase transition-colors",
					compact && "h-12 justify-center px-1 py-1",
					isActive
						? "border-primary bg-primary text-primary-foreground"
						: "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
				)
			}
		>
			<Icon className="size-4 shrink-0" />
			<span className={compact ? "sr-only" : "truncate"}>{route.label}</span>
		</NavLink>
	);
}

function OverviewScreen() {
	const wallet = useWallet();
	const recentHistory = wallet.history.slice(0, 5);
	const activeOperations = wallet.operations.slice(0, 4);

	return (
		<div className="grid gap-5">
			<PageHeader
				icon={Home}
				title="Overview"
				description="Balance, active work, and recent wallet movement."
				action={
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={wallet.busy !== null}
						onClick={() => void wallet.loadSnapshot()}
					>
						<RefreshCw
							className={wallet.busy === "snapshot" ? "animate-spin" : ""}
						/>
						Refresh
					</Button>
				}
			/>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
				<Card className="bg-primary/5 ring-primary/15">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-primary">
							<Wallet className="size-5" />
							Wallet balance
						</CardTitle>
						<CardDescription>
							Spendable and reserved proofs by unit
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6 sm:grid-cols-2">
						{wallet.totals.map((total) => (
							<div
								key={total.unit}
								className="grid gap-4 border-l-2 border-primary/50 pl-4"
							>
								<div className="flex min-w-0 items-baseline gap-2">
									<span className="truncate text-5xl font-semibold tracking-normal tabular-nums">
										{formatAmount(total.spendable)}
									</span>
									<span className="text-xs font-semibold uppercase text-primary">
										{total.unit}
									</span>
								</div>
								<div className="grid gap-2 sm:grid-cols-2">
									<BalanceMetric
										label="total"
										value={formatAmount(total.total)}
									/>
									<BalanceMetric
										label="reserved"
										value={formatAmount(total.reserved)}
									/>
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick actions</CardTitle>
						<CardDescription>Jump into the common wallet flows.</CardDescription>
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-2">
						<ActionLink to="/mint" icon={Download} label="Mint" />
						<ActionLink to="/send" icon={Send} label="Send" />
						<ActionLink to="/receive" icon={Check} label="Receive" />
						<ActionLink to="/melt" icon={Zap} label="Melt" />
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{wallet.snapshot?.balances.length ? (
					wallet.snapshot.balances.map((balance) => (
						<BalanceEntryCard
							key={`${balance.mintUrl}:${balance.unit}`}
							balance={balance}
						/>
					))
				) : (
					<EmptyState label="No balance entries" />
				)}
			</div>

			<div className="grid gap-5 xl:grid-cols-2">
				<section className="min-w-0 space-y-3">
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
				<section className="min-w-0 space-y-3">
					<SectionTitle icon={History} title="Recent history" count={wallet.history.length} />
					<HistoryList history={recentHistory} />
				</section>
			</div>
		</div>
	);
}

function MintScreen() {
	const wallet = useWallet();

	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
			<section className="min-w-0 space-y-5">
				<PageHeader
					icon={Download}
					title="Mint ecash"
					description="Create a Lightning payment request and settle it into proofs."
				/>
				<Card>
					<CardHeader>
						<CardTitle>Mint quote</CardTitle>
						<CardDescription>
							Select a trusted mint, choose an amount, then check settlement.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<form
							className="grid gap-4 lg:grid-cols-[1fr_12rem_8rem_auto]"
							onSubmit={wallet.handleCreateMintQuote}
						>
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
							<div className="flex items-end">
								<Button type="submit" disabled={wallet.busy !== null} className="w-full">
									<Download />
									Quote
								</Button>
							</div>
						</form>

						<div className="grid gap-4 lg:grid-cols-2">
							{wallet.lastMintQuote ? (
								<OutputBlock
									title="Payment request"
									value={wallet.lastMintQuote.request}
									meta={`${wallet.lastMintQuote.amount ?? wallet.quoteAmount} ${
										wallet.lastMintQuote.unit
									}`}
								/>
							) : (
								<EmptyState label="No active mint quote" />
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
										<RefreshCw />
										Check settlement
									</Button>
								</OperationPreview>
							) : null}
						</div>
					</CardContent>
				</Card>
			</section>

			<MintManagementCard />
		</div>
	);
}

function SendScreen() {
	const wallet = useWallet();

	return (
		<div className="grid gap-5">
			<PageHeader
				icon={Send}
				title="Send"
				description="Prepare proofs, then create a Cashu token for the recipient."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Token send</CardTitle>
					<CardDescription>
						Prepared sends reserve proofs until the token is created or cancelled.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<form
						className="grid gap-4 lg:grid-cols-[1fr_10rem_7rem_1fr_auto]"
						onSubmit={wallet.handlePrepareSend}
					>
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
						<div className="flex items-end">
							<Button type="submit" disabled={wallet.busy !== null} className="w-full">
								<Send />
								Prepare
							</Button>
						</div>
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
										<Send />
										Create token
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={wallet.busy !== null}
										onClick={() => wallet.handleCancelSend(wallet.preparedSend!.id)}
									>
										<X />
										Cancel
									</Button>
								</div>
							</OperationPreview>
						) : (
							<EmptyState label="No prepared send" />
						)}
						{wallet.resultToken ? (
							<OutputBlock title="Cashu token" value={wallet.resultToken} />
						) : null}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function ReceiveScreen() {
	const wallet = useWallet();

	return (
		<div className="grid gap-5">
			<PageHeader
				icon={Check}
				title="Receive"
				description="Inspect an incoming Cashu token before accepting its proofs."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Incoming token</CardTitle>
					<CardDescription>
						Paste a token, prepare the receive, then accept it into the wallet.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<form
						className="grid gap-4 lg:grid-cols-[1fr_auto]"
						onSubmit={wallet.handlePrepareReceive}
					>
						<Field label="Token">
							<Textarea
								value={wallet.receiveToken}
								onChange={(event) => wallet.setReceiveToken(event.target.value)}
								className="min-h-40"
							/>
						</Field>
						<div className="flex items-end">
							<Button type="submit" disabled={wallet.busy !== null} className="w-full">
								<Check />
								Prepare
							</Button>
						</div>
					</form>

					{wallet.preparedReceive ? (
						<OperationPreview operation={wallet.preparedReceive}>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									disabled={wallet.busy !== null}
									onClick={() =>
										wallet.handleExecuteReceive(wallet.preparedReceive!.id)
									}
								>
									<Check />
									Accept
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={wallet.busy !== null}
									onClick={() =>
										wallet.handleCancelReceive(wallet.preparedReceive!.id)
									}
								>
									<X />
									Cancel
								</Button>
							</div>
						</OperationPreview>
					) : (
						<EmptyState label="No prepared receive" />
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function MeltScreen() {
	const wallet = useWallet();

	return (
		<div className="grid gap-5">
			<PageHeader
				icon={Zap}
				title="Melt"
				description="Pay a Lightning invoice with selected Cashu proofs."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Lightning payment</CardTitle>
					<CardDescription>
						Prepare the melt quote, submit payment, then refresh settlement.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<form
						className="grid gap-4 lg:grid-cols-[1fr_8rem_auto]"
						onSubmit={wallet.handlePrepareMelt}
					>
						<div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
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
						</div>
						<Field label="Unit">
							<Input
								value={wallet.meltUnit}
								onChange={(event) => wallet.setMeltUnit(event.target.value)}
							/>
						</Field>
						<div className="flex items-end">
							<Button type="submit" disabled={wallet.busy !== null} className="w-full">
								<Zap />
								Prepare
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
											onClick={() =>
												wallet.handleExecuteMelt(wallet.preparedMelt!.id)
											}
										>
											<Zap />
											Pay
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={wallet.busy !== null}
											onClick={() =>
												wallet.handleCancelMelt(wallet.preparedMelt!.id)
											}
										>
											<X />
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
										<RefreshCw />
										Refresh
									</Button>
								)}
							</div>
						</OperationPreview>
					) : (
						<EmptyState label="No prepared melt" />
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function ActivityScreen() {
	const wallet = useWallet();

	return (
		<div className="grid gap-5">
			<PageHeader
				icon={History}
				title="Activity"
				description="Active operations and settled wallet history."
			/>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<section className="min-w-0 space-y-3">
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

				<section className="min-w-0 space-y-3">
					<SectionTitle icon={History} title="History" count={wallet.history.length} />
					<HistoryList history={wallet.history} />
				</section>
			</div>
		</div>
	);
}

function SettingsScreen() {
	const wallet = useWallet();

	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
			<section className="min-w-0 space-y-5">
				<PageHeader
					icon={Settings}
					title="Settings"
					description="Trusted mints and local wallet storage."
				/>
				<MintManagementCard />
			</section>

			<Card size="sm">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						<Database className="size-4" />
						Storage
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="break-all text-xs leading-relaxed text-muted-foreground">
						{wallet.snapshot?.dataDir ?? "Waiting for wallet bridge"}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function MintManagementCard() {
	const wallet = useWallet();

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<ShieldCheck className="size-4" />
					Mints
				</CardTitle>
				<CardAction>
					<Badge variant={wallet.trustedMints.length ? "default" : "secondary"}>
						{wallet.trustedMints.length} trusted
					</Badge>
				</CardAction>
			</CardHeader>
			<CardContent className="space-y-4">
				<form className="space-y-3" onSubmit={wallet.handleAddMint}>
					<Field label="Mint URL">
						<Input
							value={wallet.mintUrl}
							onChange={(event) => wallet.setMintUrl(event.target.value)}
							placeholder="https://mint.example"
						/>
					</Field>
					<div className="grid grid-cols-2 gap-2">
						<Button type="submit" size="sm" disabled={wallet.busy !== null}>
							<Plus />
							Trust
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={wallet.busy !== null}
							onClick={wallet.handlePreviewMint}
						>
							<Landmark />
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
						<RotateCcw />
						Restore selected mint
					</Button>
				</form>

				<div className="space-y-3">
					{wallet.snapshot?.mints.length ? (
						wallet.snapshot.mints.map((mint) => (
							<div
								key={mint.mintUrl}
								className="grid gap-1 border-l-2 border-primary/70 pl-3"
							>
								<div className="flex min-w-0 items-center justify-between gap-2">
									<span className="truncate text-sm font-medium">{mint.name}</span>
									<Badge variant={mint.trusted ? "default" : "secondary"}>
										{mint.trusted ? "trusted" : "cached"}
									</Badge>
								</div>
								<span className="truncate text-xs text-muted-foreground">
									{mint.mintUrl}
								</span>
							</div>
						))
					) : (
						<EmptyState label="No mints" />
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function ActionLink({
	to,
	icon: Icon,
	label,
}: {
	to: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	return (
		<Button asChild variant="outline" className="h-20 flex-col gap-2">
			<NavLink to={to}>
				<Icon className="size-5" />
				{label}
			</NavLink>
		</Button>
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
		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Icon className="size-4" />
					<span className="text-xs font-semibold tracking-widest uppercase">
						Wallet
					</span>
				</div>
				<h2 className="mt-2 text-2xl font-semibold tracking-wider uppercase">
					{title}
				</h2>
				<p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
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
		<div className="flex items-center justify-between">
			<h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
				<Icon className="size-4" />
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
	children: React.ReactNode;
}) {
	const id = React.useId();

	return (
		<div className="grid min-w-0 gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			{React.isValidElement(children)
				? React.cloneElement(children, { id } as React.HTMLAttributes<HTMLElement>)
				: children}
		</div>
	);
}

function MintPicker({
	value,
	mints,
	onChange,
}: {
	value: string;
	mints: MintDto[];
	onChange: (value: string) => void;
}) {
	if (!mints.length) {
		return (
			<Input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="https://mint.example"
			/>
		);
	}

	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-full">
				<SelectValue placeholder="Select mint" />
			</SelectTrigger>
			<SelectContent>
				{mints.map((mint) => (
					<SelectItem key={mint.mintUrl} value={mint.mintUrl}>
						<span className="truncate">{mint.name}</span>
					</SelectItem>
				))}
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
		<div className="grid gap-3 border p-4">
			<div className="flex min-w-0 items-center justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<Badge>{operation.type}</Badge>
						<span className="truncate text-sm font-semibold">
							{operation.state}
						</span>
					</div>
					<p className="mt-1 truncate text-xs text-muted-foreground">
						{operation.id}
					</p>
				</div>
				<div className="text-right text-sm font-semibold tabular-nums">
					{operation.amount ? formatAmount(operation.amount) : "0"}{" "}
					{operation.unit}
				</div>
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
				<Detail label="fee" value={operation.fee ?? "0"} />
				<Detail label="input" value={operation.inputAmount ?? "0"} />
				<Detail label="swap" value={operation.needsSwap ? "yes" : "no"} />
			</div>
			{children}
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0 border-l pl-2">
			<div className="text-[0.625rem] font-semibold tracking-widest uppercase">
				{label}
			</div>
			<div className="truncate text-foreground">{value}</div>
		</div>
	);
}

function BalanceMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0 border border-primary/15 bg-background/70 px-3 py-2">
			<div className="text-[0.625rem] font-semibold tracking-widest text-muted-foreground uppercase">
				{label}
			</div>
			<div className="mt-1 truncate text-sm font-semibold tabular-nums">
				{value}
			</div>
		</div>
	);
}

function BalanceEntryCard({ balance }: { balance: MintBalanceDto }) {
	return (
		<Card size="sm" className="ring-primary/10">
			<CardContent className="min-w-0">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-baseline gap-2">
							<span className="text-2xl font-semibold tabular-nums">
								{formatAmount(balance.spendable)}
							</span>
							<span className="text-xs font-semibold uppercase text-primary">
								{balance.unit}
							</span>
						</div>
						<p className="mt-1 truncate text-xs text-muted-foreground">
							{balance.mintUrl}
						</p>
					</div>
					<div className="border bg-accent/70 px-2 py-1 text-[0.625rem] font-semibold tracking-widest text-accent-foreground uppercase">
						spendable
					</div>
				</div>
				<div className="mt-4 grid grid-cols-2 gap-2">
					<BalanceMetric
						label="reserved"
						value={formatAmount(balance.reserved)}
					/>
					<BalanceMetric label="total" value={formatAmount(balance.total)} />
				</div>
			</CardContent>
		</Card>
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
		<div className="grid gap-3 border p-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<div className="text-sm font-semibold tracking-wider uppercase">
						{title}
					</div>
					{meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
				</div>
				<CopyButton value={value} />
			</div>
			<Textarea value={value} readOnly className="min-h-28 font-mono text-xs" />
		</div>
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
		<div className="grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
			{operations.map((operation) => (
				<Card key={`${operation.type}:${operation.id}`} size="sm">
					<CardContent>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<Badge>{operation.type}</Badge>
									<span className="text-sm font-medium">{operation.state}</span>
									<span className="text-xs text-muted-foreground">
										{formatAmount(operation.amount ?? "0")} {operation.unit}
									</span>
								</div>
								<p className="mt-1 truncate text-xs text-muted-foreground">
									{operation.mintUrl}
								</p>
							</div>
							<div className="flex shrink-0 flex-wrap gap-2">
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
										{operation.state === "prepared" ? <Check /> : <RefreshCw />}
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
										<X />
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
										<X />
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
										<X />
										Cancel
									</Button>
								) : null}
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function HistoryList({ history }: { history: WalletHistoryDto[] }) {
	if (!history.length) {
		return <EmptyState label="No history" />;
	}

	return (
		<div className="grid max-h-[34rem] gap-3 overflow-y-auto pr-1">
			{history.map((entry) => (
				<Card key={entry.id} size="sm">
					<CardContent className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<Badge>{entry.type}</Badge>
								<span className="truncate text-sm font-medium">{entry.state}</span>
							</div>
							<p className="mt-1 truncate text-xs text-muted-foreground">
								{entry.mintUrl}
							</p>
						</div>
						<div className="shrink-0 text-right">
							<div className="text-sm font-semibold tabular-nums">
								{formatAmount(entry.amount)} {entry.unit}
							</div>
							<div className="text-xs text-muted-foreground">
								{formatDate(entry.updatedAt)}
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
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
			<Copy />
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
		<div className="border border-dashed p-4 text-sm text-muted-foreground">
			{label}
		</div>
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

function isActionResult<TData>(
	response: WalletSnapshot | WalletActionResult<TData>,
): response is WalletActionResult<TData> {
	return "snapshot" in response;
}

function formatAmount(value: string) {
	try {
		return BigInt(value).toLocaleString();
	} catch {
		return value;
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

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

export default App;
