export declare function resolveSokosumiIdentity(value: any, options?: {}): {
    id: string;
    name: string;
    image: string;
    organizationId: string;
    organizationSlug: string;
    workspaceId: string;
    source: string;
};
export declare function extractSokosumiIdentityMetadata(body: any, headers: any): {
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
