// @ts-nocheck
export function createHttpSokosumiClient({ apiUrl, apiKey, fetchImpl = fetch, timeoutMs = 30000 }) {
  const baseUrl = stripTrailingSlash(apiUrl || "https://api.preprod.sokosumi.com");

  return {
    async getCurrentCoworker() {
      const result = await request("/v1/coworkers/me");
      return result.data;
    },

    async listCoworkerEvents({ limit = 20, cursor } = {}) {
      const search = new URLSearchParams({ limit: String(limit) });
      if (cursor) search.set("cursor", cursor);

      const result = await request(`/v1/coworkers/me/events?${search}`);
      return {
        events: Array.isArray(result.data) ? result.data : [],
        pagination: result.meta?.pagination
      };
    },

    async getTask(taskId) {
      const result = await request(`/v1/tasks/${encodeURIComponent(taskId)}`);
      return result.data;
    },

    async getUser(userId, options = {}) {
      const result = await request(`/v1/users/${encodeURIComponent(userId)}`, {
        headers: createDelegationHeaders({
          userId,
          organizationId: options.organizationId,
          organizationSlug: options.organizationSlug
        })
      });
      return result.data;
    },

    async createTaskEvent(taskId, body) {
      const result = await request(`/v1/tasks/${encodeURIComponent(taskId)}/events`, {
        method: "POST",
        body
      });
      return result.data;
    },

    async createCoworkerUsage(input) {
      const result = await request("/v1/coworkers/me/usage", {
        method: "POST",
        body: normalizeCoworkerUsageInput(input)
      });
      return result.data;
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
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`Sokosumi request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    const payload = text ? parseJson(text) : {};

    if (!response.ok) {
      const message = payload?.message || `Sokosumi request failed with ${response.status}`;
      throw new Error(`${message} (${response.status})`);
    }

    return payload;
  }
}

function normalizeCoworkerUsageInput(input = {}) {
  const userId = normalizeRequiredText(input.userId || input.sokosumiUserId, "userId");
  const idempotencyKey = normalizeRequiredText(input.idempotencyKey || input.idempotency_key, "idempotencyKey");
  const credits = Number(input.credits);
  if (!Number.isFinite(credits) || credits <= 0) {
    throw new Error("Sokosumi coworker usage credits must be a positive number.");
  }

  const organizationIdInput = input.organizationId ?? input.organization_id;
  const organizationId = organizationIdInput === null || organizationIdInput === undefined
    ? null
    : normalizeRequiredText(organizationIdInput, "organizationId");
  const referenceId = String(input.referenceId || input.reference_id || "").trim();

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
  if (!text) throw new Error(`Sokosumi coworker usage requires ${label}.`);
  return text;
}

function createDelegationHeaders({ userId, organizationId, organizationSlug } = {}) {
  return normalizeRequestHeaders({
    "X-Delegation-User-Id": userId,
    "X-Delegation-Organization-Id": organizationId,
    "X-Organization-Slug": organizationSlug
  });
}

function normalizeRequestHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    const header = String(key || "").trim();
    if (!header || /^authorization$/i.test(header)) continue;
    const text = Array.isArray(value) ? value.find((item) => String(item || "").trim()) : value;
    const normalizedValue = String(text || "").trim();
    if (normalizedValue) normalized[header] = normalizedValue;
  }
  return normalized;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
