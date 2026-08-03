export function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function getProperty(source, key) {
    return isRecord(source) ? source[key] : undefined;
}
export function getRecordProperty(source, key) {
    const value = getProperty(source, key);
    return isRecord(value) ? value : undefined;
}
export function getPathValue(source, ...keys) {
    let value = source;
    for (const key of keys) {
        value = getProperty(value, key);
        if (value === undefined)
            return undefined;
    }
    return value;
}
export function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (isRecord(error) && typeof error.message === "string")
        return error.message;
    return String(error);
}
//# sourceMappingURL=sharedTypes.js.map