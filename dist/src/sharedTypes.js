export function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function createJsonValidators(fail) {
    return {
        expectRecord(value, label) {
            if (!isRecord(value))
                fail(`${label} must be a JSON object.`, value);
            return value;
        },
        expectArray(value, label) {
            if (!Array.isArray(value))
                fail(`${label} must be an array.`, value);
            return value;
        },
        expectString(value, label) {
            if (typeof value !== "string")
                fail(`${label} must be a string.`, value);
            return value;
        },
        expectNullableString(value, label) {
            if (value !== null && typeof value !== "string") {
                fail(`${label} must be a string or null.`, value);
            }
            return value;
        },
        expectNumber(value, label) {
            if (typeof value !== "number" || !Number.isFinite(value)) {
                fail(`${label} must be a finite number.`, value);
            }
            return value;
        },
        expectNullableNumber(value, label) {
            if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
                fail(`${label} must be a finite number.`, value);
            }
            return value;
        },
        expectBoolean(value, label) {
            if (typeof value !== "boolean")
                fail(`${label} must be a boolean.`, value);
            return value;
        },
        expectLiteral(value, values, label) {
            if (!values.some((candidate) => candidate === value)) {
                fail(`${label} is not a supported value.`, value);
            }
            return value;
        },
        expectNullableLiteral(value, values, label) {
            if (value === null)
                return null;
            if (!values.some((candidate) => candidate === value)) {
                fail(`${label} is not a supported value.`, value);
            }
            return value;
        }
    };
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
export function firstText(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim())
            return value.trim();
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
    }
    return undefined;
}
export function normalizeText(value) {
    return String(value || "").trim();
}
//# sourceMappingURL=sharedTypes.js.map