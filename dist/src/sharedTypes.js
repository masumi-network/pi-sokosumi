export function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (isRecord(error) && typeof error.message === "string")
        return error.message;
    return String(error);
}
//# sourceMappingURL=sharedTypes.js.map