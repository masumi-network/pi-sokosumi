import type { MasumiNetwork } from "./masumiPaymentClient.js";
import type { SokosumiMasumiPaymentPayload } from "./sokosumiMasumiPaymentPayload.js";
import { isRecord, normalizeText } from "../sharedTypes.js";

export const MASUMI_PAYMENT_SUBMIT_STATUSES = ["pending", "submitted", "dropped"] as const;

export type MasumiPaymentSubmitStatus = typeof MASUMI_PAYMENT_SUBMIT_STATUSES[number];

type PendingMasumiPaymentIdentity =
  | {
      blockchainIdentifier: string;
      masumiPayment?: Partial<SokosumiMasumiPaymentPayload> | Record<string, unknown>;
    }
  | {
      blockchainIdentifier?: never;
      masumiPayment: (Partial<SokosumiMasumiPaymentPayload> & { blockchainIdentifier: string }) | (
        Record<string, unknown> & { blockchainIdentifier: string }
      );
    };

export type RecordPendingMasumiPaymentInput = PendingMasumiPaymentIdentity & {
  id?: string;
  taskId: string;
  triggerEventId?: string;
  taskEventId?: string;
  paymentId?: string;
  agentIdentifier?: string;
  network?: MasumiNetwork | "";
  resultHash: string;
  submitStatus?: MasumiPaymentSubmitStatus;
  completionPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  submitResponse?: Record<string, unknown>;
  errorType?: string;
  errorNote?: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  droppedAt?: string;
};

export type MasumiPendingPaymentRecord = {
  id: string;
  taskId: string;
  triggerEventId: string;
  taskEventId: string;
  paymentId: string;
  blockchainIdentifier: string;
  agentIdentifier: string;
  network: MasumiNetwork | "";
  resultHash: string;
  submitStatus: MasumiPaymentSubmitStatus;
  masumiPayment: Record<string, unknown>;
  completionPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  submitResponse: Record<string, unknown>;
  errorType: string;
  errorNote: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  droppedAt: string;
};

export type ListPendingMasumiPaymentsInput = {
  limit?: number;
};

export type MarkMasumiSubmittedInput = {
  blockchainIdentifier: string;
  response?: unknown;
};

export type MarkMasumiDroppedInput = {
  blockchainIdentifier: string;
  errorType?: string;
  errorNote?: string;
};

export type MasumiPaymentStoreStatus = {
  provider: string;
  configured: boolean;
  persistent: boolean;
  pending: number;
  startedAt: string;
};

export type MasumiPaymentStore<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord> = {
  provider?: string;
  status?(): MasumiPaymentStoreStatus;
  recordPendingMasumiPayment(input: RecordPendingMasumiPaymentInput): Promise<TRecord>;
  listPendingMasumiPayments(input?: ListPendingMasumiPaymentsInput): Promise<TRecord[]>;
  markMasumiSubmitted(input: MarkMasumiSubmittedInput): Promise<TRecord>;
  markMasumiDropped(input: MarkMasumiDroppedInput): Promise<TRecord>;
};

export type MemoryMasumiPaymentStore = MasumiPaymentStore & {
  provider: "memory";
  status(): MasumiPaymentStoreStatus & {
    provider: "memory";
    configured: true;
    persistent: false;
  };
};

export function createMemoryMasumiPaymentStore(): MemoryMasumiPaymentStore {
  const records = new Map<string, MasumiPendingPaymentRecord>();
  const startedAt = new Date().toISOString();

  return {
    provider: "memory",

    status(): MasumiPaymentStoreStatus & { provider: "memory"; configured: true; persistent: false } {
      return {
        provider: "memory",
        configured: true,
        persistent: false,
        pending: [...records.values()].filter((record) => record.submitStatus === "pending").length,
        startedAt
      };
    },

    async recordPendingMasumiPayment(input) {
      const record = normalizePendingPayment(input);
      const existing = records.get(record.blockchainIdentifier);
      const next: MasumiPendingPaymentRecord = {
        ...existing,
        ...record,
        createdAt: existing?.createdAt || record.createdAt,
        updatedAt: new Date().toISOString()
      };
      records.set(next.blockchainIdentifier, next);
      return sanitizeRecord(next);
    },

    async listPendingMasumiPayments({ limit = 20 } = {}) {
      return [...records.values()]
        .filter((record) => record.submitStatus === "pending")
        .sort((left, right) => String(left.createdAt || "").localeCompare(String(right.createdAt || "")))
        .slice(0, normalizeLimit(limit, 20))
        .map(sanitizeRecord);
    },

    async markMasumiSubmitted(input) {
      const record = getRecord(records, input);
      const now = new Date().toISOString();
      record.submitStatus = "submitted";
      record.submitResponse = normalizeJsonObject(input.response);
      record.submittedAt = now;
      record.updatedAt = now;
      records.set(record.blockchainIdentifier, record);
      return sanitizeRecord(record);
    },

    async markMasumiDropped(input) {
      const record = getRecord(records, input);
      const now = new Date().toISOString();
      record.submitStatus = "dropped";
      record.errorType = normalizeOptionalText(input.errorType);
      record.errorNote = normalizeOptionalText(input.errorNote);
      record.droppedAt = now;
      record.updatedAt = now;
      records.set(record.blockchainIdentifier, record);
      return sanitizeRecord(record);
    }
  };
}

export function normalizePendingPayment(input: RecordPendingMasumiPaymentInput): MasumiPendingPaymentRecord {
  const now = new Date().toISOString();
  const masumiPayment = normalizeJsonObject(input.masumiPayment);
  const blockchainIdentifier = normalizeRequiredText(
    input.blockchainIdentifier || masumiPayment.blockchainIdentifier,
    "blockchainIdentifier"
  );
  const network = normalizeOptionalText(input.network || paymentSourceNetwork(masumiPayment));

  return {
    id: normalizeOptionalText(input.id || input.paymentId || masumiPayment.id) || `masumi_${blockchainIdentifier.slice(0, 24)}`,
    taskId: normalizeRequiredText(input.taskId, "taskId"),
    triggerEventId: normalizeOptionalText(input.triggerEventId),
    taskEventId: normalizeOptionalText(input.taskEventId),
    paymentId: normalizeOptionalText(input.paymentId || masumiPayment.id),
    blockchainIdentifier,
    agentIdentifier: normalizeOptionalText(input.agentIdentifier || masumiPayment.agentIdentifier),
    network: network === "Preprod" || network === "Mainnet" ? network : "",
    resultHash: normalizeRequiredText(input.resultHash, "resultHash"),
    submitStatus: normalizeSubmitStatus(input.submitStatus || "pending"),
    masumiPayment,
    completionPayload: normalizeJsonObject(input.completionPayload),
    metadata: normalizeJsonObject(input.metadata),
    submitResponse: normalizeJsonObject(input.submitResponse),
    errorType: normalizeOptionalText(input.errorType),
    errorNote: normalizeOptionalText(input.errorNote),
    createdAt: normalizeOptionalText(input.createdAt) || now,
    updatedAt: normalizeOptionalText(input.updatedAt) || now,
    submittedAt: normalizeOptionalText(input.submittedAt),
    droppedAt: normalizeOptionalText(input.droppedAt)
  };
}

function getRecord(
  records: Map<string, MasumiPendingPaymentRecord>,
  input: { blockchainIdentifier: string }
): MasumiPendingPaymentRecord {
  const blockchainIdentifier = normalizeRequiredText(input.blockchainIdentifier, "blockchainIdentifier");
  const record = records.get(blockchainIdentifier);
  if (!record) throw new Error(`Masumi pending payment not found: ${blockchainIdentifier}`);
  return record;
}

function sanitizeRecord(record: MasumiPendingPaymentRecord): MasumiPendingPaymentRecord {
  return {
    ...record,
    masumiPayment: normalizeJsonObject(record.masumiPayment),
    completionPayload: normalizeJsonObject(record.completionPayload),
    metadata: normalizeJsonObject(record.metadata),
    submitResponse: normalizeJsonObject(record.submitResponse)
  };
}

function normalizeSubmitStatus(value: unknown): MasumiPaymentSubmitStatus {
  const text = normalizeText(value).toLowerCase();
  if (text === "submitted" || text === "dropped") return text;
  return "pending";
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  return { ...value };
}

function paymentSourceNetwork(payment: Record<string, unknown>): unknown {
  const source = payment.PaymentSource;
  return isRecord(source) ? source.network : undefined;
}

function normalizeLimit(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function normalizeRequiredText(value: unknown, label: string): string {
  const text = normalizeOptionalText(value);
  if (!text) throw new Error(`Masumi payment store requires ${label}.`);
  return text;
}

function normalizeOptionalText(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}
