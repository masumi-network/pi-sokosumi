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

export const MASUMI_ESCROW_STATES = [
  "FundsLockingRequested",
  "FundsLocked",
  "ResultSubmitted",
  "Completed",
  "RefundRequested",
  "RefundAuthorized",
  "Disputed"
] as const;

export type MasumiEscrowState = typeof MASUMI_ESCROW_STATES[number];

export type MasumiPaymentRequestedAction = MasumiEscrowState | "SubmitResultRequested";

export type MasumiPaymentNextAction = {
  requestedAction?: MasumiPaymentRequestedAction | null;
  errorType?: string | null;
  errorNote?: string | null;
} & Record<string, unknown>;

export type MasumiPaymentSource = {
  network?: MasumiNetwork;
  smartContractAddress?: string;
  policyId?: string | null;
} & Record<string, unknown>;

export type MasumiWallet = {
  walletVkey?: string | null;
} & Record<string, unknown>;

export type MasumiPayment = {
  id?: string;
  blockchainIdentifier?: string;
  agentIdentifier?: string;
  payByTime?: string;
  submitResultTime?: string;
  unlockTime?: string;
  externalDisputeUnlockTime?: string;
  inputHash?: string;
  identifierFromPurchaser?: string;
  RequestedFunds?: MasumiAmount[];
  Amounts?: MasumiAmount[];
  PaymentSource?: MasumiPaymentSource;
  SmartContractWallet?: MasumiWallet;
  SellerWallet?: MasumiWallet;
  NextAction?: MasumiPaymentNextAction;
  onChainState?: MasumiEscrowState | null;
} & Record<string, unknown>;

export type MasumiCreatePaymentResult = MasumiPayment & {
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
  Payments?: MasumiPayment[];
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
      const data = narrowPayment(expectSuccess(payload, "Masumi create payment"), "Masumi create payment data");

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

export function createSokosumiMasumiPaymentPayload(
  payment: (MasumiPayment & { requestBody?: Partial<MasumiCreatePaymentRequestBody> }) = {}
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

function narrowPayment(value: unknown, label: string): MasumiPayment {
  const payment = expectRecord(value, label);
  for (const key of [
    "id",
    "blockchainIdentifier",
    "agentIdentifier",
    "payByTime",
    "submitResultTime",
    "unlockTime",
    "externalDisputeUnlockTime",
    "inputHash",
    "identifierFromPurchaser"
  ]) {
    assertOptionalString(payment[key], `${label}.${key}`);
  }
  if (payment.RequestedFunds !== undefined) payment.RequestedFunds = narrowAmounts(payment.RequestedFunds, `${label}.RequestedFunds`);
  if (payment.Amounts !== undefined) payment.Amounts = narrowAmounts(payment.Amounts, `${label}.Amounts`);
  if (payment.PaymentSource !== undefined) payment.PaymentSource = narrowPaymentSource(payment.PaymentSource, `${label}.PaymentSource`);
  if (payment.SmartContractWallet !== undefined) payment.SmartContractWallet = narrowWallet(payment.SmartContractWallet, `${label}.SmartContractWallet`);
  if (payment.SellerWallet !== undefined) payment.SellerWallet = narrowWallet(payment.SellerWallet, `${label}.SellerWallet`);
  if (payment.NextAction !== undefined) payment.NextAction = narrowNextAction(payment.NextAction, `${label}.NextAction`);
  if (
    payment.onChainState !== undefined &&
    payment.onChainState !== null &&
    !MASUMI_ESCROW_STATES.some((state) => state === payment.onChainState)
  ) {
    throwInvalidResponse(`${label}.onChainState is not a supported Masumi escrow state.`, payment.onChainState);
  }
  return payment as MasumiPayment;
}

function narrowPaymentList(value: unknown): MasumiListPaymentsResult {
  if (Array.isArray(value)) {
    return value.map((payment, index) => narrowPayment(payment, `Masumi payment ${index}`));
  }
  const page = expectRecord(value, "Masumi payment list data");
  if (page.Payments !== undefined) {
    if (!Array.isArray(page.Payments)) {
      throwInvalidResponse("Masumi payment list Payments must be an array.", page.Payments);
    }
    page.Payments = page.Payments.map((payment, index) => narrowPayment(payment, `Masumi payment ${index}`));
  }
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
  if (source.network !== undefined && !MASUMI_NETWORKS.some((network) => network === source.network)) {
    throwInvalidResponse(`${label}.network is not a supported Masumi network.`, source.network);
  }
  assertOptionalString(source.smartContractAddress, `${label}.smartContractAddress`);
  if (source.policyId !== undefined && source.policyId !== null && typeof source.policyId !== "string") {
    throwInvalidResponse(`${label}.policyId must be a string or null when provided.`, source.policyId);
  }
  return source as MasumiPaymentSource;
}

function narrowWallet(value: unknown, label: string): MasumiWallet {
  const wallet = expectRecord(value, label);
  if (wallet.walletVkey !== undefined && wallet.walletVkey !== null && typeof wallet.walletVkey !== "string") {
    throwInvalidResponse(`${label}.walletVkey must be a string or null when provided.`, wallet.walletVkey);
  }
  return wallet as MasumiWallet;
}

function narrowNextAction(value: unknown, label: string): MasumiPaymentNextAction {
  const action = expectRecord(value, label);
  if (
    action.requestedAction !== undefined &&
    action.requestedAction !== null &&
    action.requestedAction !== "SubmitResultRequested" &&
    !MASUMI_ESCROW_STATES.some((state) => state === action.requestedAction)
  ) {
    throwInvalidResponse(`${label}.requestedAction is not a supported Masumi payment action.`, action.requestedAction);
  }
  for (const key of ["errorType", "errorNote"]) {
    if (action[key] !== undefined && action[key] !== null && typeof action[key] !== "string") {
      throwInvalidResponse(`${label}.${key} must be a string or null when provided.`, action[key]);
    }
  }
  return action as MasumiPaymentNextAction;
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throwInvalidResponse(`${label} must be a JSON object.`, value);
  return value;
}

function assertOptionalString(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== "string") {
    throwInvalidResponse(`${label} must be a string when provided.`, value);
  }
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
