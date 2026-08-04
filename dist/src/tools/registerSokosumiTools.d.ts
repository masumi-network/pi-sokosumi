import type { SokosumiClient } from "../client/types.js";
import type { PiToolRegistrationAPI } from "../piTypes.js";
export type SokosumiMockToolsClient = SokosumiClient;
export declare function registerSokosumiTools(pi: PiToolRegistrationAPI, client: SokosumiMockToolsClient): void;
