import { createHash, randomBytes } from "node:crypto";
import { isRecord } from "../sharedTypes.js";

export const MASUMI_NETWORKS = ["Preprod", "Mainnet"] as const;

export type MasumiNetwork = typeof MASUMI_NETWORKS[number];

export type MasumiNetworkInput = MasumiNetwork | "preprod" | "mainnet" | "preproduction" | "Preproduction";

export const MASUMI_USDM_UNITS = Object.freeze({
  Preprod: "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d",
  Mainnet: "c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad0014df105553444d"
}) satisfies Record<MasumiNetwork, string>;

export const MASUMI_CENT_RAW_UNITS = 10000n;
export const MASUMI_DEFAULT_PAY_BY_MS = 16 * 60 * 60 * 1000;
export const MASUMI_DEFAULT_SUBMIT_RESULT_MS = 17 * 60 * 60 * 1000;

export type MasumiAmountInput = number | string | bigint;
export type MasumiDateInput = Date | string | number;

export type MasumiRequestedFundInput = {
  amount: MasumiAmountInput;
  unit: string;
};

export type MasumiAmount = {
  amount: string;
  unit: string;
};

export type MasumiCreatePaymentInput = {
  taskId: string;
  costCents?: MasumiAmountInput;
  credits?: MasumiAmountInput;
  totalCostUsd?: number | string;
  totalCost?: number | string;
  amountRawUnits?: MasumiAmountInput;
  rawAmount?: MasumiAmountInput;
  payByTime?: MasumiDateInput;
  submitResultTime?: MasumiDateInput;
  RequestedFunds?: MasumiRequestedFundInput[];
  requestedFunds?: MasumiRequestedFundInput[];
  agentIdentifier?: string;
  network?: MasumiNetworkInput;
  inputHash?: string;
  metadata?: string | Record<string, unknown>;
  identifierFromPurchaser?: string;
};

export type MasumiCreatePaymentRequestBody = {
  agentIdentifier: string;
  network: MasumiNetwork;
  inputHash: string;
  payByTime: string;
  submitResultTime: string;
  metadata: string;
  identifierFromPurchaser: string;
  RequestedFunds: MasumiAmount[];
};

export const MASUMI_PAYMENT_ACTIONS = [
  "None",
  "Ignore",
  "WaitingForManualAction",
  "WaitingForExternalAction",
  "SubmitResultRequested",
  "SubmitResultInitiated",
  "WithdrawRequested",
  "WithdrawInitiated",
  "AuthorizeRefundRequested",
  "AuthorizeRefundInitiated"
] as const;

export type MasumiPaymentAction = typeof MASUMI_PAYMENT_ACTIONS[number];

export const MASUMI_ON_CHAIN_STATES = [
  "FundsLocked",
  "FundsOrDatumInvalid",
  "ResultSubmitted",
  "RefundRequested",
  "Disputed",
  "WithdrawAuthorized",
  "RefundAuthorized",
  "Withdrawn",
  "RefundWithdrawn",
  "DisputedWithdrawn"
] as const;

export type MasumiOnChainState = typeof MASUMI_ON_CHAIN_STATES[number];

/** @deprecated Use MASUMI_ON_CHAIN_STATES. */
export const MASUMI_ESCROW_STATES = MASUMI_ON_CHAIN_STATES;

/** @deprecated Use MasumiOnChainState. */
export type MasumiEscrowState = MasumiOnChainState;

export const MASUMI_PAYMENT_ERROR_TYPES = ["NetworkError", "Unknown"] as const;

export type MasumiPaymentErrorType = typeof MASUMI_PAYMENT_ERROR_TYPES[number];

export const MASUMI_PAYMENT_SOURCE_TYPES = ["Web3CardanoV1", "Web3CardanoV2"] as const;

export type MasumiPaymentSourceType = typeof MASUMI_PAYMENT_SOURCE_TYPES[number];

export const MASUMI_PRICING_TYPES = ["Fixed", "Free", "Dynamic"] as const;

export type MasumiPricingType = typeof MASUMI_PRICING_TYPES[number];

export const MASUMI_TRANSACTION_STATUSES = [
  "Pending",
  "Confirmed",
  "FailedViaTimeout",
  "FailedViaManualReset",
  "RolledBack"
] as const;

export type MasumiTransactionStatus = typeof MASUMI_TRANSACTION_STATUSES[number];

/** @deprecated Use MasumiPaymentAction. */
export type MasumiPaymentRequestedAction = MasumiPaymentAction;

export type MasumiPaymentNextAction = {
  requestedAction: MasumiPaymentAction;
  errorType: MasumiPaymentErrorType | null;
  errorNote: string | null;
  resultHash: string | null;
} & Record<string, unknown>;

export type MasumiPaymentSource = {
  id: string;
  network: MasumiNetwork;
  paymentSourceType: MasumiPaymentSourceType;
  smartContractAddress: string;
  policyId: string | null;
} & Record<string, unknown>;

export type MasumiBuyerWallet = {
  id: string;
  walletVkey: string;
} & Record<string, unknown>;

export type MasumiWallet = {
  id: string;
  walletVkey: string;
  walletAddress: string;
} & Record<string, unknown>;

export type MasumiPaymentActionHistoryEntry = MasumiPaymentNextAction & {
  id: string;
  createdAt: string;
  updatedAt: string;
  submittedTxHash: string | null;
};

export type MasumiPaymentTransaction = {
  id: string;
  createdAt: string;
  updatedAt: string;
  fees: string | null;
  blockHeight: number | null;
  blockTime: number | null;
  txHash: string | null;
  status: MasumiTransactionStatus;
  previousOnChainState: MasumiOnChainState | null;
  newOnChainState: MasumiOnChainState | null;
  confirmations: number | null;
} & Record<string, unknown>;

export type MasumiPaymentDetails = {
  id: string;
  createdAt: string;
  updatedAt: string;
  blockchainIdentifier: string;
  agentIdentifier: string | null;
  agentName: string | null;
  pricingType: MasumiPricingType;
  lastCheckedAt: string | null;
  payByTime: string | null;
  submitResultTime: string;
  unlockTime: string;
  collateralReturnLovelace: string | null;
  buyerReturnAddress: string | null;
  sellerReturnAddress: string | null;
  externalDisputeUnlockTime: string;
  requestedById: string;
  resultHash: string | null;
  nextActionLastChangedAt: string;
  onChainStateOrResultLastChangedAt: string;
  nextActionOrOnChainStateOrResultLastChangedAt: string;
  inputHash: string | null;
  totalBuyerCardanoFees: number;
  totalSellerCardanoFees: number;
  cooldownTime: number;
  cooldownTimeOtherParty: number;
  onChainState: MasumiOnChainState | null;
  NextAction: MasumiPaymentNextAction;
  CurrentTransaction: MasumiPaymentTransaction | null;
  RequestedFunds: MasumiAmount[];
  WithdrawnForSeller: MasumiAmount[];
  WithdrawnForBuyer: MasumiAmount[];
  PaymentSource: MasumiPaymentSource;
  BuyerWallet: MasumiBuyerWallet | null;
  SmartContractWallet: MasumiWallet | null;
  metadata: string | null;
} & Record<string, unknown>;

export type MasumiPayment = MasumiPaymentDetails & {
  ActionHistory: MasumiPaymentActionHistoryEntry[] | null;
  TransactionHistory: MasumiPaymentTransaction[] | null;
};

export type MasumiCreatePaymentResult = MasumiPaymentDetails & {
  requestBody: MasumiCreatePaymentRequestBody;
  costCents: string;
  amountRawUnits: string;
};

export type MasumiListPaymentsInput = {
  network?: MasumiNetworkInput;
  limit?: number;
  cursorId?: string | number;
  filterSmartContractAddress?: string;
  includeHistory?: boolean;
};

export type MasumiListPaymentsPage = Record<string, unknown> & {
  Payments: MasumiPayment[];
};

export type MasumiListPaymentsResult = MasumiListPaymentsPage | MasumiPayment[];

type MasumiSubmitResultHash =
  | { submitResultHash: string; resultHash?: string }
  | { submitResultHash?: string; resultHash: string };

export type MasumiSubmitResultInput = MasumiSubmitResultHash & {
  network?: MasumiNetworkInput;
  blockchainIdentifier: string;
};

export type MasumiSubmitResultResponse = Record<string, unknown>;

export type MasumiFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Pick<Response, "ok" | "status" | "text">>;

export type MasumiPaymentClientOptions = {
  apiUrl?: string;
  apiToken?: string;
  agentIdentifier: string;
  network?: MasumiNetworkInput;
  paymentUnit?: string;
  fetchImpl?: MasumiFetch;
  timeoutMs?: number;
  now?: () => Date;
};

export type MasumiPaymentClient = {
  readonly apiUrl: string;
  readonly agentIdentifier: string;
  readonly network: MasumiNetwork;
  readonly paymentUnit: string;
  createPayment(input: MasumiCreatePaymentInput): Promise<MasumiCreatePaymentResult>;
  listPayments(input?: MasumiListPaymentsInput): Promise<MasumiListPaymentsResult>;
  submitResult(input: MasumiSubmitResultInput): Promise<MasumiSubmitResultResponse>;
};

export type MasumiPaymentClientPort = Pick<
  MasumiPaymentClient,
  "createPayment" | "listPayments" | "submitResult"
>;

export type MasumiPaymentErrorCode = "http_error" | "timeout" | "invalid_response";

export class MasumiPaymentError extends Error {
  readonly code: MasumiPaymentErrorCode;
  readonly statusCode?: number;
  readonly payload?: unknown;

  constructor(
    message: string,
    options: { code: MasumiPaymentErrorCode; statusCode?: number; payload?: unknown; cause?: unknown }
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "MasumiPaymentError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.payload = options.payload;
  }
}

type MasumiRequestOptions = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

export function createMasumiPaymentClient(options: MasumiPaymentClientOptions): MasumiPaymentClient;
export function createMasumiPaymentClient({
  apiUrl,
  apiToken,
  agentIdentifier,
  network = "Preprod",
  paymentUnit,
  fetchImpl = fetch,
  timeoutMs = 30000,
  now = () => new Date()
}: Partial<MasumiPaymentClientOptions> = {}): MasumiPaymentClient {
  const baseUrl = normalizeMasumiApiUrl(apiUrl);
  const normalizedNetwork = normalizeMasumiNetwork(network);
  const unit = normalizeRequiredText(paymentUnit || MASUMI_USDM_UNITS[normalizedNetwork], "paymentUnit");
  const configuredAgentIdentifier = normalizeRequiredText(agentIdentifier, "agentIdentifier");

  return {
    apiUrl: baseUrl,
    agentIdentifier: configuredAgentIdentifier,
    network: normalizedNetwork,
    paymentUnit: unit,

    async createPayment(input) {
      const taskId = normalizeRequiredText(input.taskId, "taskId");
      const costCents = resolveMasumiCostCents(input);
      const amountRawUnits = resolveMasumiAmountRawUnits(input, costCents);
      const currentNow = toDate(now(), "now");
      const payByTime = toDate(input.payByTime || addMs(currentNow, MASUMI_DEFAULT_PAY_BY_MS), "payByTime");
      const submitResultTime = toDate(
        input.submitResultTime || addMs(currentNow, MASUMI_DEFAULT_SUBMIT_RESULT_MS),
        "submitResultTime"
      );
      const requestedFunds = normalizeRequestedFunds(input.RequestedFunds || input.requestedFunds, {
        amountRawUnits,
        unit
      });
      const body: MasumiCreatePaymentRequestBody = {
        agentIdentifier: normalizeRequiredText(input.agentIdentifier || configuredAgentIdentifier, "agentIdentifier"),
        network: normalizeMasumiNetwork(input.network || normalizedNetwork),
        inputHash: normalizeHex(input.inputHash || sha256Hex(taskId), "inputHash"),
        payByTime: payByTime.toISOString(),
        submitResultTime: submitResultTime.toISOString(),
        metadata: normalizePaymentMetadata(input.metadata, {
          taskId,
          credits: input.credits !== undefined && input.credits !== null ? Number(input.credits) : Number(costCents),
          amountRawUnits: amountRawUnits.toString()
        }),
        identifierFromPurchaser: normalizeHex(
          input.identifierFromPurchaser || randomBytes(8).toString("hex"),
          "identifierFromPurchaser"
        ),
        RequestedFunds: requestedFunds
      };

      const payload = await request("/payment", {
        method: "POST",
        body
      });
      const data = narrowPaymentDetails(expectSuccess(payload, "Masumi create payment"), "Masumi create payment data");

      return {
        ...data,
        requestBody: body,
        costCents: costCents.toString(),
        amountRawUnits: amountRawUnits.toString()
      };
    },

    async listPayments(input = {}) {
      const search = new URLSearchParams();
      search.set("network", normalizeMasumiNetwork(input.network || normalizedNetwork));
      search.set("limit", String(normalizePositiveInteger(input.limit, 100)));
      if (input.cursorId) search.set("cursorId", String(input.cursorId));
      if (input.filterSmartContractAddress) search.set("filterSmartContractAddress", String(input.filterSmartContractAddress));
      if (input.includeHistory !== undefined) search.set("includeHistory", input.includeHistory ? "true" : "false");

      const payload = await request(`/payment?${search.toString()}`);
      return narrowPaymentList(expectSuccess(payload, "Masumi list payments"));
    },

    async submitResult(input) {
      const body = {
        network: normalizeMasumiNetwork(input.network || normalizedNetwork),
        blockchainIdentifier: normalizeRequiredText(input.blockchainIdentifier, "blockchainIdentifier"),
        submitResultHash: normalizeHex(input.submitResultHash || input.resultHash, "submitResultHash")
      };
      const payload = await request("/payment/submit-result", {
        method: "POST",
        body
      });
      return expectRecord(expectSuccess(payload, "Masumi submit result"), "Masumi submit result data");
    }
  };

  async function request(path: string, requestOptions: MasumiRequestOptions = {}): Promise<unknown> {
    if (!baseUrl) {
      throw new Error("Masumi payment API URL is required.");
    }
    if (!apiToken) {
      throw new Error("Masumi payment API token is required.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Pick<Response, "ok" | "status" | "text">;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: requestOptions.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          token: apiToken
        },
        body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
        signal: controller.signal
      });
    } catch (error) {
      if (isRecord(error) && error.name === "AbortError") {
        throw new MasumiPaymentError(`Masumi request timed out after ${timeoutMs}ms`, {
          code: "timeout",
          cause: error
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    const payload = text ? parseJson(text) : {};

    if (!response.ok) {
      const source = isRecord(payload) ? payload : {};
      const message = typeof source.message === "string"
        ? source.message
        : typeof source.error === "string"
          ? source.error
          : `Masumi request failed with ${response.status}`;
      throw new MasumiPaymentError(`${message} (${response.status})`, {
        code: "http_error",
        statusCode: response.status,
        payload
      });
    }

    return payload;
  }
}

export type SokosumiMasumiPaymentPayload = {
  id: string;
  blockchainIdentifier: string;
  agentIdentifier: string;
  sellerVkey: string | null;
  payByTime: string;
  submitResultTime: string;
  unlockTime: string;
  externalDisputeUnlockTime: string;
  inputHash: string;
  identifierFromPurchaser: string;
  Amounts: MasumiAmount[];
  PaymentSource: {
    network: MasumiNetwork | "";
    smartContractAddress: string;
    policyId: string | null;
  };
};

export type SokosumiMasumiPaymentPayloadInput = Record<string, unknown> & {
  id?: string;
  blockchainIdentifier?: string;
  agentIdentifier?: string | null;
  payByTime?: string | null;
  submitResultTime?: string;
  unlockTime?: string;
  externalDisputeUnlockTime?: string;
  inputHash?: string | null;
  requestBody?: Partial<MasumiCreatePaymentRequestBody>;
  identifierFromPurchaser?: string;
  RequestedFunds?: MasumiAmount[];
  Amounts?: MasumiAmount[];
  PaymentSource?: Partial<MasumiPaymentSource>;
  SmartContractWallet?: Partial<MasumiWallet> | null;
  SellerWallet?: Partial<MasumiWallet> | null;
};

export function createSokosumiMasumiPaymentPayload(
  payment: SokosumiMasumiPaymentPayloadInput = {}
): SokosumiMasumiPaymentPayload {
  const requestBody = payment.requestBody || {};
  const paymentSource = payment.PaymentSource || {};

  return {
    id: payment.id || "",
    blockchainIdentifier: payment.blockchainIdentifier || "",
    agentIdentifier: payment.agentIdentifier || requestBody.agentIdentifier || "",
    sellerVkey: payment.SmartContractWallet?.walletVkey ?? payment.SellerWallet?.walletVkey ?? null,
    payByTime: payment.payByTime || requestBody.payByTime || "",
    submitResultTime: payment.submitResultTime || requestBody.submitResultTime || "",
    unlockTime: payment.unlockTime || "",
    externalDisputeUnlockTime: payment.externalDisputeUnlockTime || "",
    inputHash: payment.inputHash || requestBody.inputHash || "",
    identifierFromPurchaser: payment.identifierFromPurchaser || requestBody.identifierFromPurchaser || "",
    Amounts: normalizeAmounts(payment.RequestedFunds || payment.Amounts || requestBody.RequestedFunds || []),
    PaymentSource: {
      network: paymentSource.network || requestBody.network || "",
      smartContractAddress: paymentSource.smartContractAddress || "",
      policyId: paymentSource.policyId ?? null
    }
  };
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(value: unknown): string {
  return createHash("sha256")
    .update(String(value))
    .digest("hex");
}

export function usdToMasumiCostCents(value: number | string): bigint {
  const usd = Number(value);
  if (!Number.isFinite(usd) || usd <= 0) return 1n;
  return BigInt(Math.max(1, Math.ceil(usd * 100)));
}

export function creditsToMasumiCostCents(value: MasumiAmountInput): bigint {
  return normalizeMasumiCostCents(value);
}

export function creditsToMasumiRawUnits(value: MasumiAmountInput): bigint {
  return decimalToScaledCeil(value, MASUMI_CENT_RAW_UNITS);
}

export function normalizeMasumiRawUnits(value: MasumiAmountInput): bigint {
  if (typeof value === "bigint") return value > 0n ? value : 1n;
  if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    const bigint = BigInt(value.trim());
    return bigint > 0n ? bigint : 1n;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1n;
  return BigInt(Math.max(1, Math.ceil(number)));
}

export function normalizeMasumiCostCents(value: MasumiAmountInput): bigint {
  if (typeof value === "bigint") return value > 0n ? value : 1n;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1n;
  return BigInt(Math.max(1, Math.ceil(number)));
}

export function masumiCentsToRawUnits(costCents: MasumiAmountInput): bigint {
  return normalizeMasumiCostCents(costCents) * MASUMI_CENT_RAW_UNITS;
}

export function normalizeMasumiNetwork(value: unknown): MasumiNetwork {
  const text = String(value || "").trim();
  if (text.toLowerCase() === "mainnet") return "Mainnet";
  if (text.toLowerCase() === "preprod" || text.toLowerCase() === "preproduction") return "Preprod";
  throw new Error(`Unsupported Masumi network: ${value}`);
}

export function normalizeMasumiApiUrl(value: unknown): string {
  const text = stripTrailingSlash(String(value || "").trim());
  if (!text) return "";

  try {
    const url = new URL(text);
    const path = stripTrailingSlash(url.pathname || "");
    if (!path || path === "/") {
      url.pathname = "/api/v1";
      return stripTrailingSlash(url.toString());
    }
    if (path === "/admin") {
      url.pathname = "/api/v1";
      return stripTrailingSlash(url.toString());
    }
    return stripTrailingSlash(url.toString());
  } catch {
    return text;
  }
}

function resolveMasumiCostCents(input: MasumiCreatePaymentInput): bigint {
  if (input.costCents !== undefined && input.costCents !== null) return normalizeMasumiCostCents(input.costCents);
  if (input.credits !== undefined && input.credits !== null) return creditsToMasumiCostCents(input.credits);
  if (input.totalCostUsd !== undefined && input.totalCostUsd !== null) return usdToMasumiCostCents(input.totalCostUsd);
  if (input.totalCost !== undefined && input.totalCost !== null) return usdToMasumiCostCents(input.totalCost);
  return 1n;
}

function resolveMasumiAmountRawUnits(input: MasumiCreatePaymentInput, costCents: bigint): bigint {
  if (input.amountRawUnits !== undefined && input.amountRawUnits !== null) return normalizeMasumiRawUnits(input.amountRawUnits);
  if (input.rawAmount !== undefined && input.rawAmount !== null) return normalizeMasumiRawUnits(input.rawAmount);
  if (input.credits !== undefined && input.credits !== null) return creditsToMasumiRawUnits(input.credits);
  return masumiCentsToRawUnits(costCents);
}

function normalizeRequestedFunds(
  value: MasumiRequestedFundInput[] | undefined,
  fallback: { amountRawUnits: bigint; unit: string }
): MasumiAmount[] {
  const funds = Array.isArray(value) && value.length
    ? value
    : [{ amount: fallback.amountRawUnits.toString(), unit: fallback.unit }];

  return funds.map((fund) => ({
    amount: normalizePositiveIntegerString(fund.amount, "RequestedFunds.amount"),
    unit: normalizeRequiredText(fund.unit, "RequestedFunds.unit")
  }));
}

function normalizeAmounts(value: MasumiAmount[]): MasumiAmount[] {
  return value.map((amount) => ({
    amount: String(amount?.amount || ""),
    unit: String(amount?.unit || "")
  }));
}

function normalizePaymentMetadata(
  value: string | Record<string, unknown> | undefined,
  fallback: Record<string, unknown> = {}
): string {
  if (typeof value === "string") return value;
  return JSON.stringify({
    ...fallback,
    ...(isRecord(value) ? value : {})
  });
}

function expectSuccess(payload: unknown, label: string): unknown {
  if (!isRecord(payload)) return payload;
  if (payload.status && payload.status !== "success") {
    const detail = payload.message || payload.error || payload.status;
    throw new Error(`${label} failed: ${String(detail)}`);
  }
  return payload.data ?? payload;
}

function narrowPaymentDetails(value: unknown, label: string): MasumiPaymentDetails {
  const payment = expectRecord(value, label);
  for (const key of [
    "id",
    "createdAt",
    "updatedAt",
    "blockchainIdentifier",
    "submitResultTime",
    "unlockTime",
    "externalDisputeUnlockTime",
    "requestedById",
    "nextActionLastChangedAt",
    "onChainStateOrResultLastChangedAt",
    "nextActionOrOnChainStateOrResultLastChangedAt"
  ]) {
    assertRequiredString(payment[key], `${label}.${key}`);
  }
  for (const key of [
    "agentIdentifier",
    "agentName",
    "lastCheckedAt",
    "payByTime",
    "collateralReturnLovelace",
    "buyerReturnAddress",
    "sellerReturnAddress",
    "resultHash",
    "inputHash",
    "metadata"
  ]) {
    assertNullableString(payment[key], `${label}.${key}`);
  }
  assertLiteral(payment.pricingType, MASUMI_PRICING_TYPES, `${label}.pricingType`);
  for (const key of [
    "totalBuyerCardanoFees",
    "totalSellerCardanoFees",
    "cooldownTime",
    "cooldownTimeOtherParty"
  ]) {
    assertRequiredNumber(payment[key], `${label}.${key}`);
  }
  assertNullableLiteral(payment.onChainState, MASUMI_ON_CHAIN_STATES, `${label}.onChainState`);
  payment.NextAction = narrowNextAction(payment.NextAction, `${label}.NextAction`);
  payment.CurrentTransaction = narrowNullableTransaction(
    payment.CurrentTransaction,
    `${label}.CurrentTransaction`
  );
  payment.RequestedFunds = narrowAmounts(payment.RequestedFunds, `${label}.RequestedFunds`);
  payment.WithdrawnForSeller = narrowAmounts(payment.WithdrawnForSeller, `${label}.WithdrawnForSeller`);
  payment.WithdrawnForBuyer = narrowAmounts(payment.WithdrawnForBuyer, `${label}.WithdrawnForBuyer`);
  payment.PaymentSource = narrowPaymentSource(payment.PaymentSource, `${label}.PaymentSource`);
  payment.BuyerWallet = narrowNullableBuyerWallet(payment.BuyerWallet, `${label}.BuyerWallet`);
  payment.SmartContractWallet = narrowNullableWallet(
    payment.SmartContractWallet,
    `${label}.SmartContractWallet`
  );
  return payment as MasumiPaymentDetails;
}

function narrowPayment(value: unknown, label: string): MasumiPayment {
  const payment = narrowPaymentDetails(value, label);
  payment.ActionHistory = narrowNullableActionHistory(payment.ActionHistory, `${label}.ActionHistory`);
  payment.TransactionHistory = narrowNullableTransactionHistory(
    payment.TransactionHistory,
    `${label}.TransactionHistory`
  );
  return payment as MasumiPayment;
}

function narrowPaymentList(value: unknown): MasumiListPaymentsResult {
  if (Array.isArray(value)) {
    return value.map((payment, index) => narrowPayment(payment, `Masumi payment ${index}`));
  }
  const page = expectRecord(value, "Masumi payment list data");
  if (!Array.isArray(page.Payments)) {
    throwInvalidResponse("Masumi payment list Payments must be an array.", page.Payments);
  }
  page.Payments = page.Payments.map((payment, index) => narrowPayment(payment, `Masumi payment ${index}`));
  return page as MasumiListPaymentsPage;
}

function narrowAmounts(value: unknown, label: string): MasumiAmount[] {
  if (!Array.isArray(value)) throwInvalidResponse(`${label} must be an array.`, value);
  return value.map((entry, index) => {
    const amount = expectRecord(entry, `${label}[${index}]`);
    if (typeof amount.amount !== "string" || typeof amount.unit !== "string") {
      throwInvalidResponse(`${label}[${index}] must contain string amount and unit fields.`, entry);
    }
    return { amount: amount.amount, unit: amount.unit };
  });
}

function narrowPaymentSource(value: unknown, label: string): MasumiPaymentSource {
  const source = expectRecord(value, label);
  assertRequiredString(source.id, `${label}.id`);
  assertLiteral(source.network, MASUMI_NETWORKS, `${label}.network`);
  assertLiteral(source.paymentSourceType, MASUMI_PAYMENT_SOURCE_TYPES, `${label}.paymentSourceType`);
  assertRequiredString(source.smartContractAddress, `${label}.smartContractAddress`);
  assertNullableString(source.policyId, `${label}.policyId`);
  return source as MasumiPaymentSource;
}

function narrowBuyerWallet(value: unknown, label: string): MasumiBuyerWallet {
  const wallet = expectRecord(value, label);
  assertRequiredString(wallet.id, `${label}.id`);
  assertRequiredString(wallet.walletVkey, `${label}.walletVkey`);
  return wallet as MasumiBuyerWallet;
}

function narrowWallet(value: unknown, label: string): MasumiWallet {
  const wallet = narrowBuyerWallet(value, label);
  assertRequiredString(wallet.walletAddress, `${label}.walletAddress`);
  return wallet as MasumiWallet;
}

function narrowNextAction(value: unknown, label: string): MasumiPaymentNextAction {
  const action = expectRecord(value, label);
  assertLiteral(action.requestedAction, MASUMI_PAYMENT_ACTIONS, `${label}.requestedAction`);
  assertNullableLiteral(action.errorType, MASUMI_PAYMENT_ERROR_TYPES, `${label}.errorType`);
  assertNullableString(action.errorNote, `${label}.errorNote`);
  assertNullableString(action.resultHash, `${label}.resultHash`);
  return action as MasumiPaymentNextAction;
}

function narrowNullableBuyerWallet(value: unknown, label: string): MasumiBuyerWallet | null {
  return value === null ? null : narrowBuyerWallet(value, label);
}

function narrowNullableWallet(value: unknown, label: string): MasumiWallet | null {
  return value === null ? null : narrowWallet(value, label);
}

function narrowTransaction(value: unknown, label: string): MasumiPaymentTransaction {
  const transaction = expectRecord(value, label);
  for (const key of ["id", "createdAt", "updatedAt"]) {
    assertRequiredString(transaction[key], `${label}.${key}`);
  }
  for (const key of ["fees", "txHash"]) {
    assertNullableString(transaction[key], `${label}.${key}`);
  }
  for (const key of ["blockHeight", "blockTime", "confirmations"]) {
    assertNullableNumber(transaction[key], `${label}.${key}`);
  }
  assertLiteral(transaction.status, MASUMI_TRANSACTION_STATUSES, `${label}.status`);
  assertNullableLiteral(
    transaction.previousOnChainState,
    MASUMI_ON_CHAIN_STATES,
    `${label}.previousOnChainState`
  );
  assertNullableLiteral(
    transaction.newOnChainState,
    MASUMI_ON_CHAIN_STATES,
    `${label}.newOnChainState`
  );
  return transaction as MasumiPaymentTransaction;
}

function narrowNullableTransaction(value: unknown, label: string): MasumiPaymentTransaction | null {
  return value === null ? null : narrowTransaction(value, label);
}

function narrowNullableActionHistory(
  value: unknown,
  label: string
): MasumiPaymentActionHistoryEntry[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throwInvalidResponse(`${label} must be an array or null.`, value);
  return value.map((entry, index) => {
    const entryLabel = `${label}[${index}]`;
    const action = narrowNextAction(entry, entryLabel);
    assertRequiredString(action.id, `${entryLabel}.id`);
    assertRequiredString(action.createdAt, `${entryLabel}.createdAt`);
    assertRequiredString(action.updatedAt, `${entryLabel}.updatedAt`);
    assertNullableString(action.submittedTxHash, `${entryLabel}.submittedTxHash`);
    return action as MasumiPaymentActionHistoryEntry;
  });
}

function narrowNullableTransactionHistory(
  value: unknown,
  label: string
): MasumiPaymentTransaction[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throwInvalidResponse(`${label} must be an array or null.`, value);
  return value.map((entry, index) => narrowTransaction(entry, `${label}[${index}]`));
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throwInvalidResponse(`${label} must be a JSON object.`, value);
  return value;
}

function assertRequiredString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throwInvalidResponse(`${label} must be a string.`, value);
}

function assertNullableString(value: unknown, label: string): asserts value is string | null {
  if (value !== null && typeof value !== "string") {
    throwInvalidResponse(`${label} must be a string or null.`, value);
  }
}

function assertRequiredNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throwInvalidResponse(`${label} must be a finite number.`, value);
  }
}

function assertNullableNumber(value: unknown, label: string): asserts value is number | null {
  if (value !== null) assertRequiredNumber(value, label);
}

function assertLiteral<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
  label: string
): asserts value is TValues[number] {
  if (!values.some((candidate) => candidate === value)) {
    throwInvalidResponse(`${label} is not a supported value.`, value);
  }
}

function assertNullableLiteral<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
  label: string
): asserts value is TValues[number] | null {
  if (value !== null) assertLiteral(value, values, label);
}

function throwInvalidResponse(message: string, payload: unknown): never {
  throw new MasumiPaymentError(message, { code: "invalid_response", payload });
}

function normalizeHex(value: unknown, label: string): string {
  const text = normalizeRequiredText(value, label).toLowerCase();
  if (!/^[0-9a-f]+$/.test(text)) throw new Error(`Masumi ${label} must be hex.`);
  return text;
}

function normalizePositiveIntegerString(value: MasumiAmountInput, label: string): string {
  const text = normalizeRequiredText(value, label);
  try {
    if (BigInt(text) <= 0n) throw new Error("non-positive");
  } catch {
    throw new Error(`Masumi ${label} must be a positive integer string.`);
  }
  return text;
}

function normalizeRequiredText(value: unknown, label: string): string {
  const text = String(value || "").trim();
  if (!text) throw new Error(`Masumi requires ${label}.`);
  return text;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function decimalToScaledCeil(value: MasumiAmountInput, scale: bigint): bigint {
  if (typeof value === "bigint") return value > 0n ? value * scale : 1n;

  const text = String(value || "").trim();
  if (!text) return 1n;
  if (text.startsWith("-")) return 1n;

  const normalized = text.startsWith("+") ? text.slice(1) : text;
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 1n;
    return BigInt(Math.max(1, Math.ceil(number * Number(scale))));
  }

  const [, wholePart, fractionPart = ""] = match;
  const scaleDigits = scale.toString().length - 1;
  const scaledFraction = fractionPart.slice(0, scaleDigits).padEnd(scaleDigits, "0");
  const remainder = fractionPart.slice(scaleDigits);
  let amount = BigInt(wholePart || "0") * scale + BigInt(scaledFraction || "0");
  if (remainder && /[1-9]/.test(remainder)) amount += 1n;
  return amount > 0n ? amount : 1n;
}

function toDate(value: MasumiDateInput, label: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Masumi ${label} must be a valid date.`);
  return date;
}

function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  if (value instanceof Date) return value.toISOString();

  return Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return { raw: value };
  }
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
