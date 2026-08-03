import type { PiToolResult } from "../piTypes.js";

export function createJsonToolResult<TDetails>(details: TDetails): PiToolResult<TDetails> {
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
