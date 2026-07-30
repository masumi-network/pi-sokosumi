import type { PiToolResult } from "../piTypes.js";

export function createJsonToolResult(details: unknown): PiToolResult {
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
