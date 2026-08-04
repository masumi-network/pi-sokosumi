import { type MasumiAmountInput } from "./masumiPaymentTypes.js";
export declare function usdToMasumiCostCents(value: number | string): bigint;
export declare function creditsToMasumiCostCents(value: MasumiAmountInput): bigint;
export declare function creditsToMasumiRawUnits(value: MasumiAmountInput): bigint;
export declare function normalizeMasumiRawUnits(value: MasumiAmountInput): bigint;
export declare function normalizeMasumiCostCents(value: MasumiAmountInput): bigint;
export declare function masumiCentsToRawUnits(costCents: MasumiAmountInput): bigint;
