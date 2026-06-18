// @ts-nocheck
export function createMemoryMasumiPaymentStore() {
    const records = new Map();
    const startedAt = new Date().toISOString();
    return {
        provider: "memory",
        status() {
            return {
                provider: "memory",
                configured: true,
                persistent: false,
                pending: [...records.values()].filter((record) => record.submitStatus === "pending").length,
                startedAt
            };
        },
        async recordPendingMasumiPayment(input = {}) {
            const record = normalizePendingPayment(input);
            const existing = records.get(record.blockchainIdentifier) || {};
            const next = {
                ...existing,
                ...record,
                createdAt: existing.createdAt || record.createdAt,
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
        async markMasumiSubmitted(input = {}) {
            const record = getRecord(records, input);
            const now = new Date().toISOString();
            record.submitStatus = "submitted";
            record.submitResponse = normalizeJsonObject(input.response);
            record.submittedAt = now;
            record.updatedAt = now;
            records.set(record.blockchainIdentifier, record);
            return sanitizeRecord(record);
        },
        async markMasumiDropped(input = {}) {
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
export function normalizePendingPayment(input = {}) {
    const now = new Date().toISOString();
    const masumiPayment = normalizeJsonObject(input.masumiPayment);
    const blockchainIdentifier = normalizeRequiredText(input.blockchainIdentifier || masumiPayment.blockchainIdentifier, "blockchainIdentifier");
    return {
        id: normalizeOptionalText(input.id || input.paymentId || masumiPayment.id) || `masumi_${blockchainIdentifier.slice(0, 24)}`,
        taskId: normalizeRequiredText(input.taskId, "taskId"),
        triggerEventId: normalizeOptionalText(input.triggerEventId),
        taskEventId: normalizeOptionalText(input.taskEventId),
        paymentId: normalizeOptionalText(input.paymentId || masumiPayment.id),
        blockchainIdentifier,
        agentIdentifier: normalizeOptionalText(input.agentIdentifier || masumiPayment.agentIdentifier),
        network: normalizeOptionalText(input.network || masumiPayment.PaymentSource?.network),
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
function getRecord(records, input = {}) {
    const blockchainIdentifier = normalizeRequiredText(input.blockchainIdentifier, "blockchainIdentifier");
    const record = records.get(blockchainIdentifier);
    if (!record)
        throw new Error(`Masumi pending payment not found: ${blockchainIdentifier}`);
    return record;
}
function sanitizeRecord(record = {}) {
    return {
        ...record,
        masumiPayment: normalizeJsonObject(record.masumiPayment),
        completionPayload: normalizeJsonObject(record.completionPayload),
        metadata: normalizeJsonObject(record.metadata),
        submitResponse: normalizeJsonObject(record.submitResponse)
    };
}
function normalizeSubmitStatus(value) {
    const text = String(value || "").trim().toLowerCase();
    if (text === "submitted" || text === "dropped")
        return text;
    return "pending";
}
function normalizeJsonObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return {};
    return { ...value };
}
function normalizeLimit(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
}
function normalizeRequiredText(value, label) {
    const text = normalizeOptionalText(value);
    if (!text)
        throw new Error(`Masumi payment store requires ${label}.`);
    return text;
}
function normalizeOptionalText(value) {
    if (typeof value === "string" && value.trim())
        return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return "";
}
//# sourceMappingURL=masumiPaymentStore.js.map