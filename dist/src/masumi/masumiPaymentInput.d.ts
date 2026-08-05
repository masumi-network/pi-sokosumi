import { type MasumiAmount, type MasumiCreatePaymentInput, type MasumiDateInput, type MasumiNetwork, type MasumiPaymentSourceSelection, type MasumiPaymentSourceType, type MasumiRequestedFundInput } from "./masumiPaymentTypes.js";
export declare function normalizeMasumiNetwork(value: unknown): MasumiNetwork;
export declare function normalizeMasumiPaymentSourceSelection(paymentSourceType: unknown, supportedPaymentSourceIndex: unknown): MasumiPaymentSourceSelection;
export declare function normalizeMasumiApiUrl(value: unknown): string;
export declare function resolveMasumiCostCents(input: MasumiCreatePaymentInput): bigint;
export declare function resolveMasumiAmountRawUnits(input: MasumiCreatePaymentInput, costCents: bigint): bigint;
export declare function normalizeRequestedFunds(value: MasumiRequestedFundInput[] | undefined, fallback: {
    amountRawUnits: bigint;
    unit: string;
}): MasumiAmount[];
export declare function normalizePaymentMetadata(value: string | Record<string, unknown> | undefined, fallback?: Record<string, unknown>): string;
export declare function normalizeHex(value: unknown, label: string): string;
export declare function normalizeRequiredText(value: unknown, label: string): string;
export declare function normalizePositiveInteger(value: unknown, fallback: number): number;
export declare function normalizeOptionalMasumiPaymentSourceType(value: unknown): MasumiPaymentSourceType | undefined;
export declare function toDate(value: MasumiDateInput, label: string): Date;
export declare function addMs(date: Date, ms: number): Date;
