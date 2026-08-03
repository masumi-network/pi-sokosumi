import { SOKOSUMI_EVENT_CHANNELS, SOKOSUMI_TASK_LINK_RELATIONS, SOKOSUMI_TASK_EVENT_STATUSES } from "./types.js";
import { isRecord } from "../sharedTypes.js";
export class SokosumiRequestError extends Error {
    code;
    statusCode;
    payload;
    constructor(message, options) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = "SokosumiRequestError";
        this.code = options.code;
        this.statusCode = options.statusCode;
        this.payload = options.payload;
    }
}
export function createHttpSokosumiClient({ apiUrl, apiKey, fetchImpl = fetch, timeoutMs = 30000 }) {
    const baseUrl = stripTrailingSlash(apiUrl || "https://api.preprod.sokosumi.com");
    return {
        async getCurrentCoworker() {
            const payload = await request("/v1/coworkers/me");
            return narrowCoworker(expectObjectData(payload, "current coworker"));
        },
        async listCoworkerEvents({ limit = 20, cursor } = {}) {
            const search = new URLSearchParams({ limit: String(limit) });
            if (cursor)
                search.set("cursor", cursor);
            const payload = await request(`/v1/coworkers/me/events?${search}`);
            const result = expectEnvelope(payload, "coworker events");
            const events = result.data === undefined
                ? []
                : expectArray(result.data, "Sokosumi coworker events").map((event, index) => narrowTaskEvent(event, `Sokosumi coworker event ${index}`));
            const meta = isRecord(result.meta) ? result.meta : undefined;
            const pagination = meta?.pagination === undefined
                ? undefined
                : narrowPagination(meta.pagination);
            return { events, pagination };
        },
        async getTask(taskId) {
            const payload = await request(`/v1/tasks/${encodeURIComponent(taskId)}`);
            const data = expectEnvelope(payload, "task").data;
            return data == null ? undefined : narrowTask(data, "Sokosumi task");
        },
        async updateTask(input) {
            const { taskId, ...body } = input;
            if (!taskId)
                throw new Error("Sokosumi task id is required.");
            const payload = await request(`/v1/tasks/${encodeURIComponent(taskId)}`, {
                method: "PATCH",
                body
            });
            return narrowTask(expectEnvelope(payload, "updated task").data, "updated Sokosumi task");
        },
        async getUser(userId, options = {}) {
            const payload = await request(`/v1/users/${encodeURIComponent(userId)}`, {
                headers: createDelegationHeaders({
                    userId,
                    organizationId: options.organizationId,
                    organizationSlug: options.organizationSlug
                })
            });
            const data = expectEnvelope(payload, "user").data;
            return data == null ? undefined : narrowUser(data);
        },
        async createTaskEvent(taskId, body) {
            const payload = await request(`/v1/tasks/${encodeURIComponent(taskId)}/events`, {
                method: "POST",
                body
            });
            return narrowTaskEvent(expectEnvelope(payload, "created task event").data, "created Sokosumi task event");
        },
        async createCoworkerUsage(input) {
            const payload = await request("/v1/coworkers/me/usage", {
                method: "POST",
                body: normalizeCoworkerUsageInput(input)
            });
            return narrowCoworkerUsage(expectObjectData(payload, "created coworker usage"));
        }
    };
    async function request(path, options = {}) {
        if (!apiKey) {
            throw new Error("Sokosumi API key is required.");
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
            response = await fetchImpl(`${baseUrl}${path}`, {
                method: options.method || "GET",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    ...normalizeRequestHeaders(options.headers)
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal
            });
        }
        catch (error) {
            if (isRecord(error) && error.name === "AbortError") {
                throw new SokosumiRequestError(`Sokosumi request timed out after ${timeoutMs}ms`, {
                    code: "timeout",
                    cause: error
                });
            }
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
        const text = await response.text();
        const payload = text ? parseJson(text) : {};
        if (!response.ok) {
            const message = isRecord(payload) && typeof payload.message === "string"
                ? payload.message
                : `Sokosumi request failed with ${response.status}`;
            throw new SokosumiRequestError(`${message} (${response.status})`, {
                code: "http_error",
                statusCode: response.status,
                payload
            });
        }
        return payload;
    }
}
function normalizeCoworkerUsageInput(input) {
    const aliases = isRecord(input) ? input : {};
    const userId = normalizeRequiredText(input.userId || aliases.sokosumiUserId, "userId");
    const idempotencyKey = normalizeRequiredText(input.idempotencyKey || aliases.idempotency_key, "idempotencyKey");
    const credits = Number(input.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
        throw new Error("Sokosumi coworker usage credits must be a positive number.");
    }
    const organizationIdInput = input.organizationId ?? aliases.organization_id;
    const organizationId = organizationIdInput === null || organizationIdInput === undefined
        ? null
        : normalizeRequiredText(organizationIdInput, "organizationId");
    const referenceId = String(input.referenceId || aliases.reference_id || "").trim();
    return {
        userId,
        organizationId,
        idempotencyKey,
        credits,
        ...(referenceId ? { referenceId } : {})
    };
}
function normalizeRequiredText(value, label) {
    const text = String(value || "").trim();
    if (!text)
        throw new Error(`Sokosumi coworker usage requires ${label}.`);
    return text;
}
function createDelegationHeaders({ userId, organizationId, organizationSlug }) {
    return normalizeRequestHeaders({
        "X-Delegation-User-Id": userId,
        "X-Delegation-Organization-Id": organizationId,
        "X-Organization-Slug": organizationSlug
    });
}
function normalizeRequestHeaders(headers) {
    if (!headers)
        return {};
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        const header = String(key || "").trim();
        if (!header || /^authorization$/i.test(header))
            continue;
        const firstValue = Array.isArray(value) ? value.find((item) => String(item || "").trim()) : value;
        const normalizedValue = String(firstValue || "").trim();
        if (normalizedValue)
            normalized[header] = normalizedValue;
    }
    return normalized;
}
function parseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return { raw: value };
    }
}
function expectEnvelope(value, label) {
    return expectRecord(value, `Sokosumi ${label} response`);
}
function expectObjectData(value, label) {
    return expectRecord(expectEnvelope(value, label).data, `Sokosumi ${label}`);
}
function expectRecord(value, label) {
    if (!isRecord(value)) {
        throw new SokosumiRequestError(`${label} must be a JSON object.`, {
            code: "invalid_response",
            payload: value
        });
    }
    return value;
}
function expectArray(value, label) {
    if (!Array.isArray(value)) {
        throw new SokosumiRequestError(`${label} must be a JSON array.`, {
            code: "invalid_response",
            payload: value
        });
    }
    return value;
}
function narrowTask(value, label) {
    const task = expectRecord(value, label);
    for (const key of ["id", "createdAt", "updatedAt", "ownerId", "userId", "name"]) {
        expectString(task[key], `${label}.${key}`);
    }
    narrowUserSummary(task.owner, `${label}.owner`);
    narrowUserSummary(task.user, `${label}.user`);
    expectNullableRecord(task.organization, `${label}.organization`);
    for (const key of [
        "organizationId",
        "projectId",
        "assigneeId",
        "coworkerId",
        "orchestratorId",
        "pendingVendorGrantId",
        "nextRunAt",
        "description"
    ]) {
        expectNullableString(task[key], `${label}.${key}`);
    }
    task.assignee === null
        ? null
        : narrowCoworkerSummary(task.assignee, `${label}.assignee`);
    task.coworker === null
        ? null
        : narrowCoworkerSummary(task.coworker, `${label}.coworker`);
    narrowTaskEventActor(task.creator, `${label}.creator`);
    task.orchestrator === null
        ? null
        : narrowOrchestratorSummary(task.orchestrator, `${label}.orchestrator`);
    expectTaskEventStatus(task.status, `${label}.status`);
    if (task.grantResumeStatus !== null && task.grantResumeStatus !== "DRAFT" && task.grantResumeStatus !== "READY") {
        throwInvalidResponse(`${label}.grantResumeStatus must be DRAFT, READY, or null.`, task.grantResumeStatus);
    }
    if (task.metadata !== null && typeof task.metadata !== "string") {
        throwInvalidResponse(`${label}.metadata must be a string or null.`, task.metadata);
    }
    expectNumber(task.credits, `${label}.credits`);
    const events = expectArray(task.events, `${label}.events`);
    task.events = events.map((event, index) => narrowTaskEvent(event, `${label}.events[${index}]`));
    expectRecordArray(task.jobs, `${label}.jobs`);
    expectRecord(task.workspace, `${label}.workspace`);
    expectNullableRecord(task.share, `${label}.share`);
    task.links = expectArray(task.links, `${label}.links`).map((link, index) => narrowTaskLink(link, `${label}.links[${index}]`));
    expectRecordArray(task.files, `${label}.files`);
    for (const key of ["title", "body", "content"]) {
        assertOptionalString(task[key], `${label}.${key}`);
    }
    return task;
}
function narrowTaskEvent(value, label) {
    const event = expectRecord(value, label);
    for (const key of ["id", "taskId", "createdAt", "updatedAt"]) {
        expectString(event[key], `${label}.${key}`);
    }
    if (event.actor === null) {
        // Null is an explicit upstream state when no actor foreign key is set.
    }
    else {
        narrowTaskEventActor(event.actor, `${label}.actor`);
    }
    expectEventChannel(event.channel, `${label}.channel`);
    expectEventChannel(event.origin, `${label}.origin`);
    for (const key of [
        "message",
        "body",
        "content",
        "description",
        "title",
        "name",
        "created_at",
        "updated_at"
    ]) {
        assertOptionalString(event[key], `${label}.${key}`);
    }
    for (const key of ["transactionId", "comment", "authenticationUrl"]) {
        assertOptionalStringOrNull(event[key], `${label}.${key}`);
    }
    if (event.credits !== undefined && event.credits !== null && typeof event.credits !== "number") {
        throwInvalidResponse(`${label}.credits must be a number or null when provided.`, event.credits);
    }
    assertOptionalStringOrNull(event.coworkerId, `${label}.coworkerId`);
    assertOptionalStringOrNull(event.coworker_id, `${label}.coworker_id`);
    assertOptionalStringOrNull(event.userId, `${label}.userId`);
    assertOptionalStringOrNull(event.orchestratorId, `${label}.orchestratorId`);
    if (event.coworker !== undefined && event.coworker !== null) {
        narrowCoworkerSummary(event.coworker, `${label}.coworker`);
    }
    if (event.user !== undefined && event.user !== null) {
        narrowUserSummary(event.user, `${label}.user`);
    }
    if (event.orchestrator !== undefined && event.orchestrator !== null) {
        narrowOrchestratorSummary(event.orchestrator, `${label}.orchestrator`);
    }
    assertOptionalRecord(event.metadata, `${label}.metadata`);
    assertOptionalArray(event.attachments, `${label}.attachments`);
    assertOptionalArray(event.media, `${label}.media`);
    assertOptionalArray(event.files, `${label}.files`);
    if (event.timestamp !== undefined &&
        typeof event.timestamp !== "string" &&
        typeof event.timestamp !== "number") {
        throwInvalidResponse(`${label}.timestamp must be a string or number when provided.`, event.timestamp);
    }
    if (event.status !== undefined &&
        event.status !== null &&
        !SOKOSUMI_TASK_EVENT_STATUSES.some((status) => status === event.status)) {
        throwInvalidResponse(`${label}.status is not a supported Sokosumi event status.`, event.status);
    }
    return event;
}
function narrowPagination(value) {
    const pagination = expectRecord(value, "Sokosumi pagination");
    assertOptionalString(pagination.nextCursor, "Sokosumi pagination.nextCursor");
    assertOptionalString(pagination.previousCursor, "Sokosumi pagination.previousCursor");
    if (pagination.hasMore !== undefined && typeof pagination.hasMore !== "boolean") {
        throwInvalidResponse("Sokosumi pagination.hasMore must be a boolean when provided.", pagination.hasMore);
    }
    return pagination;
}
function assertOptionalString(value, label) {
    if (value !== undefined && typeof value !== "string") {
        throwInvalidResponse(`${label} must be a string when provided.`, value);
    }
}
function assertOptionalStringOrNull(value, label) {
    if (value !== undefined && value !== null && typeof value !== "string") {
        throwInvalidResponse(`${label} must be a string or null when provided.`, value);
    }
}
function assertOptionalRecord(value, label) {
    if (value !== undefined && !isRecord(value)) {
        throwInvalidResponse(`${label} must be a JSON object when provided.`, value);
    }
}
function expectString(value, label) {
    if (typeof value !== "string") {
        throwInvalidResponse(`${label} must be a string.`, value);
    }
    return value;
}
function expectNullableString(value, label) {
    if (value !== null && typeof value !== "string") {
        throwInvalidResponse(`${label} must be a string or null.`, value);
    }
    // TypeScript does not retain the compound unknown narrowing with strict mode disabled.
    return value;
}
function expectNumber(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throwInvalidResponse(`${label} must be a finite number.`, value);
    }
    return value;
}
function expectBoolean(value, label) {
    if (typeof value !== "boolean") {
        throwInvalidResponse(`${label} must be a boolean.`, value);
    }
    return value;
}
function expectNullableRecord(value, label) {
    return value === null ? null : expectRecord(value, label);
}
function expectRecordArray(value, label) {
    return expectArray(value, label).map((item, index) => expectRecord(item, `${label}[${index}]`));
}
function expectStringArray(value, label) {
    return expectArray(value, label).map((item, index) => expectString(item, `${label}[${index}]`));
}
function expectTaskEventStatus(value, label) {
    if (!SOKOSUMI_TASK_EVENT_STATUSES.some((status) => status === value)) {
        throwInvalidResponse(`${label} is not a supported Sokosumi task status.`, value);
    }
}
function expectEventChannel(value, label) {
    if (!SOKOSUMI_EVENT_CHANNELS.some((channel) => channel === value)) {
        throwInvalidResponse(`${label} is not a supported Sokosumi event channel.`, value);
    }
}
function narrowUserSummary(value, label) {
    const user = expectRecord(value, label);
    expectString(user.id, `${label}.id`);
    expectString(user.name, `${label}.name`);
    assertOptionalStringOrNull(user.image, `${label}.image`);
    return user;
}
function narrowCoworkerSummary(value, label) {
    const coworker = expectRecord(value, label);
    expectString(coworker.id, `${label}.id`);
    expectString(coworker.name, `${label}.name`);
    expectString(coworker.slug, `${label}.slug`);
    assertOptionalStringOrNull(coworker.image, `${label}.image`);
    return coworker;
}
function narrowOrchestratorSummary(value, label) {
    const orchestrator = expectRecord(value, label);
    expectString(orchestrator.id, `${label}.id`);
    return orchestrator;
}
function narrowTaskEventActor(value, label) {
    const actor = expectRecord(value, label);
    expectString(actor.id, `${label}.id`);
    if (actor.type === "user") {
        narrowUserSummary(actor.user, `${label}.user`);
    }
    else if (actor.type === "coworker") {
        narrowCoworkerSummary(actor.coworker, `${label}.coworker`);
    }
    else if (actor.type === "orchestrator") {
        narrowOrchestratorSummary(actor.orchestrator, `${label}.orchestrator`);
    }
    else {
        throwInvalidResponse(`${label}.type must identify a user, coworker, or orchestrator.`, actor.type);
    }
    return actor;
}
function narrowTaskLink(value, label) {
    const link = expectRecord(value, label);
    for (const key of ["id", "createdAt", "updatedAt"]) {
        expectString(link[key], `${label}.${key}`);
    }
    if (!SOKOSUMI_TASK_LINK_RELATIONS.some((relation) => relation === link.relation)) {
        throwInvalidResponse(`${label}.relation is not a supported task-link relation.`, link.relation);
    }
    const peerTask = expectRecord(link.peerTask, `${label}.peerTask`);
    expectString(peerTask.id, `${label}.peerTask.id`);
    expectString(peerTask.name, `${label}.peerTask.name`);
    expectTaskEventStatus(peerTask.status, `${label}.peerTask.status`);
    expectNullableString(peerTask.archivedAt, `${label}.peerTask.archivedAt`);
    expectNullableString(link.note, `${label}.note`);
    return link;
}
function assertOptionalArray(value, label) {
    if (value !== undefined && !Array.isArray(value)) {
        throwInvalidResponse(`${label} must be a JSON array when provided.`, value);
    }
}
function narrowCoworker(value) {
    const coworker = expectRecord(value, "Sokosumi coworker");
    for (const key of ["id", "createdAt", "updatedAt", "slug", "name"]) {
        expectString(coworker[key], `Sokosumi coworker.${key}`);
    }
    expectNullableString(coworker.archivedAt, "Sokosumi coworker.archivedAt");
    expectBoolean(coworker.isWhitelisted, "Sokosumi coworker.isWhitelisted");
    expectNumber(coworker.priority, "Sokosumi coworker.priority");
    for (const key of ["caption", "url", "description", "image"]) {
        assertOptionalStringOrNull(coworker[key], `Sokosumi coworker.${key}`);
    }
    expectRecord(coworker.vendor, "Sokosumi coworker.vendor");
    expectNullableString(coworker.baseURL, "Sokosumi coworker.baseURL");
    expectStringArray(coworker.capabilities, "Sokosumi coworker.capabilities");
    expectNullableRecord(coworker.metadata, "Sokosumi coworker.metadata");
    return coworker;
}
function narrowUser(value) {
    const user = expectRecord(value, "Sokosumi user");
    for (const key of ["id", "createdAt", "updatedAt", "name", "email", "role"]) {
        expectString(user[key], `Sokosumi user.${key}`);
    }
    expectBoolean(user.emailVerified, "Sokosumi user.emailVerified");
    assertOptionalStringOrNull(user.image, "Sokosumi user.image");
    assertOptionalStringOrNull(user.organizationId, "Sokosumi user.organizationId");
    return user;
}
function narrowCoworkerUsage(value) {
    const usage = expectRecord(value, "Sokosumi coworker usage");
    for (const key of [
        "id",
        "createdAt",
        "updatedAt",
        "idempotencyKey",
        "coworkerId",
        "userId",
        "transactionId"
    ]) {
        expectString(usage[key], `Sokosumi coworker usage.${key}`);
    }
    expectNullableString(usage.referenceId, "Sokosumi coworker usage.referenceId");
    expectNullableString(usage.organizationId, "Sokosumi coworker usage.organizationId");
    expectNumber(usage.credits, "Sokosumi coworker usage.credits");
    return usage;
}
function throwInvalidResponse(message, payload) {
    throw new SokosumiRequestError(message, { code: "invalid_response", payload });
}
function stripTrailingSlash(value) {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}
//# sourceMappingURL=httpSokosumiClient.js.map