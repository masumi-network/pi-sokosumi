// @ts-nocheck
const ID_KEYS = ["sokosumiUserId", "sokosumi_user_id", "userId", "user_id", "createdById", "ownerId", "customerId", "sub"];
const HEADER_USER_ID_KEYS = [
  "x-delegation-user-id",
  "x-sokosumi-user-id",
  "x-user-id",
  "x-authenticated-user-id"
];
const HEADER_ORGANIZATION_ID_KEYS = [
  "x-delegation-organization-id",
  "x-sokosumi-organization-id",
  "x-organization-id",
  "x-authenticated-organization-id"
];
const HEADER_ORGANIZATION_SLUG_KEYS = [
  "x-organization-slug",
  "x-sokosumi-organization-slug",
  "x-delegation-organization-slug"
];
const HEADER_WORKSPACE_ID_KEYS = [
  "x-delegation-workspace-id",
  "x-sokosumi-workspace-id",
  "x-workspace-id",
  "x-authenticated-workspace-id"
];

export function resolveSokosumiIdentity(value, options = {}) {
  const root = value && typeof value === "object" ? value : {};
  const metadata = root.metadata && typeof root.metadata === "object" ? root.metadata : {};
  const headers = normalizeHeaders(options.headers || root.headers || root.requestHeaders || root.request?.headers);
  const messageIdentityCandidates = [
    ...getMessageIdentityCandidates(root.message),
    ...getMessageIdentityCandidates(metadata.message),
    ...getMessagesIdentityCandidates(root.messages),
    ...getMessagesIdentityCandidates(metadata.messages)
  ];
  const candidates = [
    root.sokosumi,
    root.sokosumi?.user,
    metadata.sokosumi,
    metadata.sokosumi?.user,
    root.user,
    metadata.user,
    root.actor,
    metadata.actor,
    root.customer,
    metadata.customer,
    root.owner,
    metadata.owner,
    root.createdBy,
    metadata.createdBy,
    root.requester,
    metadata.requester,
    root.conversation,
    metadata.conversation,
    root.task,
    metadata.task,
    root.event,
    metadata.event,
    ...messageIdentityCandidates,
    metadata,
    root
  ].filter((candidate) => candidate && typeof candidate === "object");

  const id = firstString(
    ...HEADER_USER_ID_KEYS.map((key) => headers[key]),
    ...ID_KEYS.map((key) => root[key]),
    ...ID_KEYS.map((key) => metadata[key]),
    root.sokosumi?.userId,
    root.sokosumi?.user?.id,
    metadata.sokosumi?.userId,
    metadata.sokosumi?.user?.id,
    root.user?.id,
    metadata.user?.id,
    root.actor?.id,
    metadata.actor?.id,
    root.customer?.id,
    metadata.customer?.id,
    root.owner?.id,
    metadata.owner?.id,
    root.createdBy?.id,
    metadata.createdBy?.id,
    root.requester?.id,
    metadata.requester?.id,
    root.task?.userId,
    root.task?.user?.id,
    metadata.task?.userId,
    metadata.task?.user?.id,
    root.event?.userId,
    root.event?.user?.id,
    metadata.event?.userId,
    metadata.event?.user?.id,
    ...candidates.flatMap((candidate) => ID_KEYS.map((key) => candidate[key]))
  );

  if (!id) return null;

  const userObject = candidates.find((candidate) => firstString(candidate.id, candidate.userId, candidate.sokosumiUserId, candidate.sub) === id) || root.user || root.sokosumi?.user;

  return {
    id,
    name: firstString(userObject?.name, root.user?.name, metadata.user?.name, root.sokosumi?.user?.name, metadata.sokosumi?.user?.name),
    image: firstString(
      userObject?.image,
      userObject?.avatarUrl,
      root.user?.image,
      metadata.user?.image,
      metadata.user?.avatarUrl,
      root.sokosumi?.user?.image,
      metadata.sokosumi?.user?.image
    ),
    organizationId: firstString(
      ...HEADER_ORGANIZATION_ID_KEYS.map((key) => headers[key]),
      ...candidates.flatMap((candidate) => [
        candidate.organizationId,
        candidate.organization_id,
        candidate.organization?.id,
        candidate.workspace?.organizationId,
        candidate.workspace?.organization_id
      ]),
      root.organizationId,
      metadata.organizationId,
      userObject?.organizationId,
      root.user?.organizationId,
      metadata.user?.organizationId,
      root.organization?.id,
      metadata.organization?.id,
      root.workspace?.organizationId,
      metadata.workspace?.organizationId
    ),
    organizationSlug: firstString(
      ...HEADER_ORGANIZATION_SLUG_KEYS.map((key) => headers[key]),
      ...candidates.flatMap((candidate) => [
        candidate.organizationSlug,
        candidate.organization_slug,
        candidate.organization?.slug,
        candidate.workspace?.organizationSlug,
        candidate.workspace?.organization_slug
      ]),
      root.organizationSlug,
      metadata.organizationSlug,
      userObject?.organizationSlug,
      root.user?.organizationSlug,
      metadata.user?.organizationSlug,
      root.organization?.slug,
      metadata.organization?.slug,
      root.workspace?.organizationSlug,
      metadata.workspace?.organizationSlug
    ),
    workspaceId: firstString(
      ...HEADER_WORKSPACE_ID_KEYS.map((key) => headers[key]),
      ...candidates.flatMap((candidate) => [
        candidate.workspaceId,
        candidate.workspace_id,
        candidate.workspace?.id
      ]),
      root.workspaceId,
      metadata.workspaceId,
      userObject?.workspaceId,
      root.user?.workspaceId,
      metadata.user?.workspaceId,
      root.workspace?.id,
      metadata.workspace?.id
    ),
    source: firstString(
      root.protocol,
      metadata.protocol,
      root.source,
      metadata.source,
      root.origin,
      metadata.origin,
      headers["x-delegation-user-id"] ? "sokosumi_delegation_headers" : "",
      headers["x-sokosumi-user-id"] ? "sokosumi_headers" : ""
    )
  };
}

export function extractSokosumiIdentityMetadata(body, headers) {
  const identity = resolveSokosumiIdentity(body, { headers });
  if (!identity) return undefined;

  return {
    userId: identity.id,
    user: {
      id: identity.id,
      name: identity.name,
      image: identity.image
    },
    organizationId: identity.organizationId,
    organizationSlug: identity.organizationSlug,
    workspaceId: identity.workspaceId
  };
}

function normalizeHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[String(key).toLowerCase()] = normalizeHeaderValue(value);
  }
  return normalized;
}

function getMessagesIdentityCandidates(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((message) => getMessageIdentityCandidates(message));
}

function getMessageIdentityCandidates(message) {
  if (!message || typeof message !== "object") return [];
  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  return [
    message,
    message.user,
    message.actor,
    message.owner,
    message.requester,
    metadata,
    metadata.sokosumi,
    metadata.sokosumi?.user,
    metadata.user,
    metadata.actor,
    metadata.owner,
    metadata.requester
  ];
}

function normalizeHeaderValue(value) {
  if (Array.isArray(value)) return firstString(...value);
  return firstString(value);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}
