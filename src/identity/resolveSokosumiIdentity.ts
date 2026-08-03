import {
  getPathValue as path,
  getProperty as property,
  getRecordProperty as recordProperty,
  isRecord
} from "../sharedTypes.js";

const ID_KEYS = ["sokosumiUserId", "sokosumi_user_id", "userId", "user_id", "createdById", "ownerId", "customerId", "sub"] as const;
const HEADER_USER_ID_KEYS = [
  "x-delegation-user-id",
  "x-sokosumi-user-id",
  "x-user-id",
  "x-authenticated-user-id"
] as const;
const HEADER_ORGANIZATION_ID_KEYS = [
  "x-delegation-organization-id",
  "x-sokosumi-organization-id",
  "x-organization-id",
  "x-authenticated-organization-id"
] as const;
const HEADER_ORGANIZATION_SLUG_KEYS = [
  "x-organization-slug",
  "x-sokosumi-organization-slug",
  "x-delegation-organization-slug"
] as const;
const HEADER_WORKSPACE_ID_KEYS = [
  "x-delegation-workspace-id",
  "x-sokosumi-workspace-id",
  "x-workspace-id",
  "x-authenticated-workspace-id"
] as const;

export type SokosumiHeaderValue = string | string[] | number | undefined;

export type SokosumiHeaders = Record<string, SokosumiHeaderValue>;

export type ResolveSokosumiIdentityOptions = {
  headers?: SokosumiHeaders;
};

export type SokosumiIdentity = {
  id: string;
  name: string;
  image: string;
  organizationId: string;
  organizationSlug: string;
  workspaceId: string;
  source: string;
};

export type SokosumiIdentityMetadata = {
  userId: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
  organizationId: string;
  organizationSlug: string;
  workspaceId: string;
};

export function resolveSokosumiIdentity(
  value: unknown,
  options: ResolveSokosumiIdentityOptions = {}
): SokosumiIdentity | null {
  const root = isRecord(value) ? value : {};
  const metadata = recordProperty(root, "metadata") || {};
  const request = recordProperty(root, "request");
  const headers = normalizeHeaders(
    options.headers ||
    property(root, "headers") ||
    property(root, "requestHeaders") ||
    property(request, "headers")
  );
  const messageIdentityCandidates = [
    ...getMessageIdentityCandidates(property(root, "message")),
    ...getMessageIdentityCandidates(property(metadata, "message")),
    ...getMessagesIdentityCandidates(property(root, "messages")),
    ...getMessagesIdentityCandidates(property(metadata, "messages"))
  ];
  const rootSokosumi = recordProperty(root, "sokosumi");
  const metadataSokosumi = recordProperty(metadata, "sokosumi");
  const candidates = [
    rootSokosumi,
    recordProperty(rootSokosumi, "user"),
    metadataSokosumi,
    recordProperty(metadataSokosumi, "user"),
    recordProperty(root, "user"),
    recordProperty(metadata, "user"),
    recordProperty(root, "actor"),
    recordProperty(metadata, "actor"),
    recordProperty(root, "customer"),
    recordProperty(metadata, "customer"),
    recordProperty(root, "owner"),
    recordProperty(metadata, "owner"),
    recordProperty(root, "createdBy"),
    recordProperty(metadata, "createdBy"),
    recordProperty(root, "requester"),
    recordProperty(metadata, "requester"),
    recordProperty(root, "conversation"),
    recordProperty(metadata, "conversation"),
    recordProperty(root, "task"),
    recordProperty(metadata, "task"),
    recordProperty(root, "event"),
    recordProperty(metadata, "event"),
    ...messageIdentityCandidates,
    metadata,
    root
  ].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));

  const id = firstString(
    ...HEADER_USER_ID_KEYS.map((key) => headers[key]),
    ...ID_KEYS.map((key) => property(root, key)),
    ...ID_KEYS.map((key) => property(metadata, key)),
    path(root, "sokosumi", "userId"),
    path(root, "sokosumi", "user", "id"),
    path(metadata, "sokosumi", "userId"),
    path(metadata, "sokosumi", "user", "id"),
    path(root, "user", "id"),
    path(metadata, "user", "id"),
    path(root, "actor", "id"),
    path(metadata, "actor", "id"),
    path(root, "customer", "id"),
    path(metadata, "customer", "id"),
    path(root, "owner", "id"),
    path(metadata, "owner", "id"),
    path(root, "createdBy", "id"),
    path(metadata, "createdBy", "id"),
    path(root, "requester", "id"),
    path(metadata, "requester", "id"),
    path(root, "task", "userId"),
    path(root, "task", "user", "id"),
    path(metadata, "task", "userId"),
    path(metadata, "task", "user", "id"),
    path(root, "event", "userId"),
    path(root, "event", "user", "id"),
    path(metadata, "event", "userId"),
    path(metadata, "event", "user", "id"),
    ...candidates.flatMap((candidate) => ID_KEYS.map((key) => property(candidate, key)))
  );

  if (!id) return null;

  const userObject = candidates.find((candidate) =>
    firstString(
      property(candidate, "id"),
      property(candidate, "userId"),
      property(candidate, "sokosumiUserId"),
      property(candidate, "sub")
    ) === id
  ) || recordProperty(root, "user") || recordProperty(rootSokosumi, "user");

  return {
    id,
    name: firstString(
      property(userObject, "name"),
      path(root, "user", "name"),
      path(metadata, "user", "name"),
      path(root, "sokosumi", "user", "name"),
      path(metadata, "sokosumi", "user", "name")
    ),
    image: firstString(
      property(userObject, "image"),
      property(userObject, "avatarUrl"),
      path(root, "user", "image"),
      path(metadata, "user", "image"),
      path(metadata, "user", "avatarUrl"),
      path(root, "sokosumi", "user", "image"),
      path(metadata, "sokosumi", "user", "image")
    ),
    organizationId: firstString(
      ...HEADER_ORGANIZATION_ID_KEYS.map((key) => headers[key]),
      ...candidates.flatMap((candidate) => [
        property(candidate, "organizationId"),
        property(candidate, "organization_id"),
        path(candidate, "organization", "id"),
        path(candidate, "workspace", "organizationId"),
        path(candidate, "workspace", "organization_id")
      ]),
      property(root, "organizationId"),
      property(metadata, "organizationId"),
      property(userObject, "organizationId"),
      path(root, "user", "organizationId"),
      path(metadata, "user", "organizationId"),
      path(root, "organization", "id"),
      path(metadata, "organization", "id"),
      path(root, "workspace", "organizationId"),
      path(metadata, "workspace", "organizationId")
    ),
    organizationSlug: firstString(
      ...HEADER_ORGANIZATION_SLUG_KEYS.map((key) => headers[key]),
      ...candidates.flatMap((candidate) => [
        property(candidate, "organizationSlug"),
        property(candidate, "organization_slug"),
        path(candidate, "organization", "slug"),
        path(candidate, "workspace", "organizationSlug"),
        path(candidate, "workspace", "organization_slug")
      ]),
      property(root, "organizationSlug"),
      property(metadata, "organizationSlug"),
      property(userObject, "organizationSlug"),
      path(root, "user", "organizationSlug"),
      path(metadata, "user", "organizationSlug"),
      path(root, "organization", "slug"),
      path(metadata, "organization", "slug"),
      path(root, "workspace", "organizationSlug"),
      path(metadata, "workspace", "organizationSlug")
    ),
    workspaceId: firstString(
      ...HEADER_WORKSPACE_ID_KEYS.map((key) => headers[key]),
      ...candidates.flatMap((candidate) => [
        property(candidate, "workspaceId"),
        property(candidate, "workspace_id"),
        path(candidate, "workspace", "id")
      ]),
      property(root, "workspaceId"),
      property(metadata, "workspaceId"),
      property(userObject, "workspaceId"),
      path(root, "user", "workspaceId"),
      path(metadata, "user", "workspaceId"),
      path(root, "workspace", "id"),
      path(metadata, "workspace", "id")
    ),
    source: firstString(
      property(root, "protocol"),
      property(metadata, "protocol"),
      property(root, "source"),
      property(metadata, "source"),
      property(root, "origin"),
      property(metadata, "origin"),
      headers["x-delegation-user-id"] ? "sokosumi_delegation_headers" : "",
      headers["x-sokosumi-user-id"] ? "sokosumi_headers" : ""
    )
  };
}

export function extractSokosumiIdentityMetadata(
  body: unknown,
  headers?: SokosumiHeaders
): SokosumiIdentityMetadata | undefined {
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

function normalizeHeaders(headers: unknown): Record<string, string> {
  if (!isRecord(headers)) return {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[String(key).toLowerCase()] = normalizeHeaderValue(value);
  }
  return normalized;
}

function getMessagesIdentityCandidates(messages: unknown): Record<string, unknown>[] {
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((message) => getMessageIdentityCandidates(message));
}

function getMessageIdentityCandidates(message: unknown): Record<string, unknown>[] {
  if (!isRecord(message)) return [];
  const metadata = recordProperty(message, "metadata") || {};
  const metadataSokosumi = recordProperty(metadata, "sokosumi");
  return [
    message,
    recordProperty(message, "user"),
    recordProperty(message, "actor"),
    recordProperty(message, "owner"),
    recordProperty(message, "requester"),
    metadata,
    metadataSokosumi,
    recordProperty(metadataSokosumi, "user"),
    recordProperty(metadata, "user"),
    recordProperty(metadata, "actor"),
    recordProperty(metadata, "owner"),
    recordProperty(metadata, "requester")
  ].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));
}

function normalizeHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return firstString(...value);
  return firstString(value);
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}
