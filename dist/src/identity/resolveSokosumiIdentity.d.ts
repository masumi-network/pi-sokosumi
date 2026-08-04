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
export declare function resolveSokosumiIdentity(value: unknown, options?: ResolveSokosumiIdentityOptions): SokosumiIdentity | null;
export declare function extractSokosumiIdentityMetadata(body: unknown, headers?: SokosumiHeaders): SokosumiIdentityMetadata | undefined;
