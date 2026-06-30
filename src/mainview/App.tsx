import * as React from "react";
import {
	Activity,
	Check,
	Copy,
	Database,
	Download,
	History,
	Landmark,
	Plus,
	RefreshCw,
	RotateCcw,
	Send,
	ShieldCheck,
	Wallet,
	X,
	Zap,
} from "lucide-react";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectContent,
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
import { walletClient } from "@/lib/wallet-client";
import type {
	MintDto,
	WalletActionResult,
	WalletOperationDto,
	WalletQuoteDto,
	WalletSnapshot,
} from "@/lib/wallet-rpc";

type StatusState = {
	kind: "success" | "error" | "info";
	title: string;
	message?: string;
} | null;

const ZERO_TOTAL = {
	unit: "sat",
	spendable: "0",
	reserved: "0",
	total: "0",
};

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

	function handleOperationAction(operation: WalletOperationDto) {
		if (operation.type === "mint") {
			void runAction(
				`mint:${operation.id}`,
				() => walletClient.refreshMintOperation({ operationId: operation.id }),
				"Mint checked",
				(data) => setLastMintOperation(data),
			);
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
			void runAction(
				`melt:${operation.id}`,
				() => walletClient.refreshMeltOperation({ operationId: operation.id }),
				"Melt refreshed",
				(data) => setPreparedMelt(data),
			);
		}
	}

	const totals = snapshot?.totalByUnit.length ? snapshot.totalByUnit : [ZERO_TOTAL];
	const operations = snapshot?.operations ?? [];
	const history = snapshot?.history ?? [];

	return (
		<div className="min-h-svh bg-background text-foreground">
			<header className="flex min-h-16 flex-col gap-3 border-b bg-background/95 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center border bg-primary text-primary-foreground">
						<Wallet className="size-4" />
					</div>
					<div className="min-w-0">
						<h1 className="truncate text-lg font-semibold tracking-wide">
							Malibu Cashu Wallet
						</h1>
						<p className="truncate text-xs text-muted-foreground">
							Coco core on Bun, React renderer
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={trustedMints.length ? "default" : "secondary"}>
						{trustedMints.length} trusted
					</Badge>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={busy !== null}
						onClick={() => void loadSnapshot()}
					>
						<RefreshCw className={busy === "snapshot" ? "animate-spin" : ""} />
						Refresh
					</Button>
				</div>
			</header>

			<main className="grid min-h-[calc(100svh-4rem)] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
				<aside className="border-b lg:border-r lg:border-b-0">
					<section className="space-y-4 border-b p-5">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h2 className="text-sm font-semibold tracking-wider uppercase">
									Balance
								</h2>
								<p className="text-xs text-muted-foreground">
									Spendable and reserved proofs
								</p>
							</div>
							<Activity className="size-4 text-muted-foreground" />
						</div>
						<div className="space-y-3">
							{totals.map((total) => (
								<div key={total.unit} className="border-l-2 border-emerald-500 pl-3">
									<div className="flex items-baseline gap-2">
										<span className="text-3xl font-semibold tabular-nums">
											{formatAmount(total.spendable)}
										</span>
										<span className="text-xs font-semibold uppercase text-muted-foreground">
											{total.unit}
										</span>
									</div>
									<div className="mt-1 flex gap-3 text-xs text-muted-foreground">
										<span>total {formatAmount(total.total)}</span>
										<span>reserved {formatAmount(total.reserved)}</span>
									</div>
								</div>
							))}
						</div>
					</section>

					<section className="space-y-4 border-b p-5">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold tracking-wider uppercase">
								Mints
							</h2>
							<ShieldCheck className="size-4 text-muted-foreground" />
						</div>
						<form className="space-y-3" onSubmit={handleAddMint}>
							<Field label="Mint URL">
								<Input
									value={mintUrl}
									onChange={(event) => setMintUrl(event.target.value)}
									placeholder="https://mint.example"
								/>
							</Field>
							<div className="grid grid-cols-2 gap-2">
								<Button type="submit" size="sm" disabled={busy !== null}>
									<Plus />
									Trust
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={busy !== null}
									onClick={handlePreviewMint}
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
								disabled={busy !== null}
								onClick={handleRestoreMint}
							>
								<RotateCcw />
								Restore selected mint
							</Button>
						</form>

						<div className="space-y-2">
							{snapshot?.mints.length ? (
								snapshot.mints.map((mint) => (
									<div
										key={mint.mintUrl}
										className="grid gap-1 border-t py-3 first:border-t-0 first:pt-0"
									>
										<div className="flex min-w-0 items-center justify-between gap-2">
											<span className="truncate text-sm font-medium">
												{mint.name}
											</span>
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
					</section>

					<section className="space-y-3 p-5">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold tracking-wider uppercase">
								Storage
							</h2>
							<Database className="size-4 text-muted-foreground" />
						</div>
						<p className="break-all text-xs leading-relaxed text-muted-foreground">
							{snapshot?.dataDir ?? "Waiting for wallet bridge"}
						</p>
					</section>
				</aside>

				<section className="min-w-0 p-5">
					<div className="mx-auto flex max-w-6xl flex-col gap-5">
						{status ? <StatusAlert status={status} /> : null}

						<div className="grid gap-3 border-b pb-5 sm:grid-cols-2 xl:grid-cols-3">
							{snapshot?.balances.length ? (
								snapshot.balances.map((balance) => (
									<div
										key={`${balance.mintUrl}:${balance.unit}`}
										className="min-w-0 border-l pl-3"
									>
										<div className="flex items-baseline gap-2">
											<span className="text-xl font-semibold tabular-nums">
												{formatAmount(balance.spendable)}
											</span>
											<span className="text-xs font-semibold uppercase text-muted-foreground">
												{balance.unit}
											</span>
										</div>
										<p className="truncate text-xs text-muted-foreground">
											{balance.mintUrl}
										</p>
									</div>
								))
							) : (
								<EmptyState label="No balance entries" />
							)}
						</div>

						<Tabs defaultValue="mint" className="gap-5">
							<TabsList variant="line" className="w-full justify-start overflow-x-auto">
								<TabsTrigger value="mint">
									<Download />
									Mint
								</TabsTrigger>
								<TabsTrigger value="send">
									<Send />
									Send
								</TabsTrigger>
								<TabsTrigger value="receive">
									<Check />
									Receive
								</TabsTrigger>
								<TabsTrigger value="melt">
									<Zap />
									Melt
								</TabsTrigger>
							</TabsList>

							<TabsContent value="mint">
								<form className="grid gap-4 lg:grid-cols-[1fr_12rem_8rem_auto]" onSubmit={handleCreateMintQuote}>
									<Field label="Mint">
										<MintPicker
											value={quoteMintUrl}
											mints={trustedMints}
											onChange={setQuoteMintUrl}
										/>
									</Field>
									<Field label="Amount">
										<Input
											inputMode="numeric"
											value={quoteAmount}
											onChange={(event) => setQuoteAmount(event.target.value)}
										/>
									</Field>
									<Field label="Unit">
										<Input
											value={quoteUnit}
											onChange={(event) => setQuoteUnit(event.target.value)}
										/>
									</Field>
									<div className="flex items-end">
										<Button type="submit" disabled={busy !== null} className="w-full">
											<Download />
											Quote
										</Button>
									</div>
								</form>

								<div className="mt-5 grid gap-4 lg:grid-cols-2">
									{lastMintQuote ? (
										<OutputBlock
											title="Payment request"
											value={lastMintQuote.request}
											meta={`${lastMintQuote.amount ?? quoteAmount} ${lastMintQuote.unit}`}
										/>
									) : (
										<EmptyState label="No active mint quote" />
									)}
									{lastMintOperation ? (
										<OperationPreview operation={lastMintOperation}>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={busy !== null}
												onClick={() =>
													void runAction(
														"refreshMintOperation",
														() =>
															walletClient.refreshMintOperation({
																operationId: lastMintOperation.id,
															}),
														"Mint checked",
														(data) => setLastMintOperation(data),
													)
												}
											>
												<RefreshCw />
												Check settlement
											</Button>
										</OperationPreview>
									) : null}
								</div>
							</TabsContent>

							<TabsContent value="send">
								<form className="grid gap-4 lg:grid-cols-[1fr_10rem_7rem_1fr_auto]" onSubmit={handlePrepareSend}>
									<Field label="Mint">
										<MintPicker
											value={sendMintUrl}
											mints={trustedMints}
											onChange={setSendMintUrl}
										/>
									</Field>
									<Field label="Amount">
										<Input
											inputMode="numeric"
											value={sendAmount}
											onChange={(event) => setSendAmount(event.target.value)}
										/>
									</Field>
									<Field label="Unit">
										<Input
											value={sendUnit}
											onChange={(event) => setSendUnit(event.target.value)}
										/>
									</Field>
									<Field label="Memo">
										<Input
											value={sendMemo}
											onChange={(event) => setSendMemo(event.target.value)}
										/>
									</Field>
									<div className="flex items-end">
										<Button type="submit" disabled={busy !== null} className="w-full">
											<Send />
											Prepare
										</Button>
									</div>
								</form>

								<div className="mt-5 grid gap-4 lg:grid-cols-2">
									{preparedSend ? (
										<OperationPreview operation={preparedSend}>
											<div className="flex gap-2">
												<Button
													type="button"
													size="sm"
													disabled={busy !== null}
													onClick={() => handleExecuteSend(preparedSend.id)}
												>
													<Send />
													Create token
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={busy !== null}
													onClick={() => handleCancelSend(preparedSend.id)}
												>
													<X />
													Cancel
												</Button>
											</div>
										</OperationPreview>
									) : (
										<EmptyState label="No prepared send" />
									)}
									{resultToken ? (
										<OutputBlock title="Cashu token" value={resultToken} />
									) : null}
								</div>
							</TabsContent>

							<TabsContent value="receive">
								<form className="grid gap-4 lg:grid-cols-[1fr_auto]" onSubmit={handlePrepareReceive}>
									<Field label="Token">
										<Textarea
											value={receiveToken}
											onChange={(event) => setReceiveToken(event.target.value)}
											className="min-h-28"
										/>
									</Field>
									<div className="flex items-end">
										<Button type="submit" disabled={busy !== null} className="w-full">
											<Check />
											Prepare
										</Button>
									</div>
								</form>

								<div className="mt-5">
									{preparedReceive ? (
										<OperationPreview operation={preparedReceive}>
											<div className="flex gap-2">
												<Button
													type="button"
													size="sm"
													disabled={busy !== null}
													onClick={() => handleExecuteReceive(preparedReceive.id)}
												>
													<Check />
													Accept
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={busy !== null}
													onClick={() => handleCancelReceive(preparedReceive.id)}
												>
													<X />
													Cancel
												</Button>
											</div>
										</OperationPreview>
									) : (
										<EmptyState label="No prepared receive" />
									)}
								</div>
							</TabsContent>

							<TabsContent value="melt">
								<form className="grid gap-4 lg:grid-cols-[1fr_8rem_auto]" onSubmit={handlePrepareMelt}>
									<div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
										<Field label="Mint">
											<MintPicker
												value={meltMintUrl}
												mints={trustedMints}
												onChange={setMeltMintUrl}
											/>
										</Field>
										<Field label="Invoice">
											<Textarea
												value={meltInvoice}
												onChange={(event) => setMeltInvoice(event.target.value)}
												className="min-h-20"
											/>
										</Field>
									</div>
									<Field label="Unit">
										<Input
											value={meltUnit}
											onChange={(event) => setMeltUnit(event.target.value)}
										/>
									</Field>
									<div className="flex items-end">
										<Button type="submit" disabled={busy !== null} className="w-full">
											<Zap />
											Prepare
										</Button>
									</div>
								</form>

								<div className="mt-5">
									{preparedMelt ? (
										<OperationPreview operation={preparedMelt}>
											<div className="flex flex-wrap gap-2">
												{preparedMelt.state === "prepared" ? (
													<>
														<Button
															type="button"
															size="sm"
															disabled={busy !== null}
															onClick={() => handleExecuteMelt(preparedMelt.id)}
														>
															<Zap />
															Pay
														</Button>
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={busy !== null}
															onClick={() => handleCancelMelt(preparedMelt.id)}
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
														disabled={busy !== null}
														onClick={() =>
															void runAction(
																"refreshMeltOperation",
																() =>
																	walletClient.refreshMeltOperation({
																		operationId: preparedMelt.id,
																	}),
																"Melt refreshed",
																(data) => setPreparedMelt(data),
															)
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
								</div>
							</TabsContent>
						</Tabs>

						<Separator />

						<div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
							<section className="min-w-0 space-y-3">
								<div className="flex items-center justify-between">
									<h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
										<Activity className="size-4" />
										Operations
									</h2>
									<Badge variant="secondary">{operations.length}</Badge>
								</div>
								<OperationList
									operations={operations}
									busy={busy}
									onAction={handleOperationAction}
									onCancelMelt={handleCancelMelt}
									onCancelSend={handleCancelSend}
									onCancelReceive={handleCancelReceive}
								/>
							</section>

							<section className="min-w-0 space-y-3">
								<div className="flex items-center justify-between">
									<h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
										<History className="size-4" />
										History
									</h2>
									<Badge variant="secondary">{history.length}</Badge>
								</div>
								<div className="max-h-[28rem] overflow-y-auto border">
									{history.length ? (
										history.map((entry) => (
											<div key={entry.id} className="border-b p-3 last:border-b-0">
												<div className="flex items-center justify-between gap-3">
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<Badge>{entry.type}</Badge>
															<span className="truncate text-sm font-medium">
																{entry.state}
															</span>
														</div>
														<p className="mt-1 truncate text-xs text-muted-foreground">
															{entry.mintUrl}
														</p>
													</div>
													<div className="text-right">
														<div className="text-sm font-semibold tabular-nums">
															{formatAmount(entry.amount)} {entry.unit}
														</div>
														<div className="text-xs text-muted-foreground">
															{formatDate(entry.updatedAt)}
														</div>
													</div>
												</div>
											</div>
										))
									) : (
										<EmptyState label="No history" />
									)}
								</div>
							</section>
						</div>
					</div>
				</section>
			</main>
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
		<div className="max-h-[28rem] overflow-y-auto border">
			{operations.map((operation) => (
				<div key={`${operation.type}:${operation.id}`} className="border-b p-3 last:border-b-0">
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
				</div>
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
