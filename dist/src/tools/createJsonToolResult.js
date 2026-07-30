export function createJsonToolResult(details) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(details, null, 2)
            }
        ],
        details
    };
}
//# sourceMappingURL=createJsonToolResult.js.map