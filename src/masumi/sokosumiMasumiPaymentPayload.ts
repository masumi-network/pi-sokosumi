import { createJsonValidators } from "../sharedTypes.js";
import {
  MASUMI_NETWORKS,
  MASUMI_PAYMENT_SOURCE_TYPES,
  MasumiPaymentError,
  type MasumiAmount,
  type MasumiCreatePaymentRequestBody,
  type MasumiNetwork,
  type MasumiPaymentSource,
  type MasumiPaymentSourceType,
  type MasumiWallet
} from "./masumiPaymentTypes.js";

export type SokosumiMasumiPaymentPayload = {
  id?: string;
  blockchainIdentifier: string;
  agentIdentifier: string;
  sellerVkey: string;
  payByTime: string;
  submitResultTime: string;
  unlockTime: string;
  externalDisputeUnlockTime: string;
  inputHash: string;
  identifierFromPurchaser: string;
  Amounts: [MasumiAmount, ...MasumiAmount[]];
  PaymentSource?: {
    network: MasumiNetwork;
    smartContractAddress: string;
    policyId: string;
    paymentSourceType?: MasumiPaymentSourceType;
  };
};

export type SokosumiMasumiPaymentPayloadInput = Record<string, unknown> & {
  id?: string;
  blockchainIdentifier?: string;
  agentIdentifier?: string | null;
  sellerVkey?: string;
  payByTime?: string | null;
  submitResultTime?: string;
  unlockTime?: string;
  externalDisputeUnlockTime?: string;
  inputHash?: string | null;
  requestBody?: Partial<MasumiCreatePaymentRequestBody>;
  identifierFromPurchaser?: string;
  RequestedFunds?: MasumiAmount[];
  Amounts?: MasumiAmount[];
  PaymentSource?: Partial<MasumiPaymentSource> | null;
  SmartContractWallet?: Partial<MasumiWallet> | null;
  SellerWallet?: Partial<MasumiWallet> | null;
};

const {
  expectLiteral,
  expectRecord
} = createJsonValidators(throwInvalidResponse);

export function createSokosumiMasumiPaymentPayload(
  payment: SokosumiMasumiPaymentPayloadInput | SokosumiMasumiPaymentPayload = {}
): SokosumiMasumiPaymentPayload {
  const source = expectRecord(payment, "Masumi payment payload");
  const requestBody = source.requestBody === undefined
    ? {}
    : expectRecord(source.requestBody, "Masumi payment payload.requestBody");
  const smartContractWalletVkey = walletVkey(
    source.SmartContractWallet,
    "Masumi payment payload.SmartContractWallet"
  );
  const sellerWalletVkey = walletVkey(
    source.SellerWallet,
    "Masumi payment payload.SellerWallet"
  );
  const paymentSource = narrowPaymentSource(
    source.PaymentSource,
    requestBody.network,
    requestBody.paymentSourceType
  );
  const id = narrowOptionalNonEmptyString(source.id, "Masumi payment payload.id");

  return {
    ...(id ? { id } : {}),
    blockchainIdentifier: narrowNonEmptyString(
      source.blockchainIdentifier,
      "Masumi payment payload.blockchainIdentifier"
    ),
    agentIdentifier: narrowNonEmptyString(
      source.agentIdentifier ?? requestBody.agentIdentifier,
      "Masumi payment payload.agentIdentifier"
    ),
    sellerVkey: narrowNonEmptyString(
      source.sellerVkey ?? smartContractWalletVkey ?? sellerWalletVkey,
      "Masumi payment payload.sellerVkey"
    ),
    payByTime: narrowNonEmptyString(
      source.payByTime ?? requestBody.payByTime,
      "Masumi payment payload.payByTime"
    ),
    submitResultTime: narrowNonEmptyString(
      source.submitResultTime ?? requestBody.submitResultTime,
      "Masumi payment payload.submitResultTime"
    ),
    unlockTime: narrowNonEmptyString(
      source.unlockTime,
      "Masumi payment payload.unlockTime"
    ),
    externalDisputeUnlockTime: narrowNonEmptyString(
      source.externalDisputeUnlockTime,
      "Masumi payment payload.externalDisputeUnlockTime"
    ),
    inputHash: narrowNonEmptyString(
      source.inputHash ?? requestBody.inputHash,
      "Masumi payment payload.inputHash"
    ),
    identifierFromPurchaser: narrowNonEmptyString(
      source.identifierFromPurchaser ?? requestBody.identifierFromPurchaser,
      "Masumi payment payload.identifierFromPurchaser"
    ),
    Amounts: narrowAmounts(
      source.RequestedFunds ?? source.Amounts ?? requestBody.RequestedFunds,
      "Masumi payment payload.Amounts"
    ),
    ...(paymentSource ? { PaymentSource: paymentSource } : {})
  };
}

function narrowAmounts(
  value: unknown,
  label: string
): [MasumiAmount, ...MasumiAmount[]] {
  if (!Array.isArray(value) || value.length === 0) {
    throwInvalidResponse(`${label} must be a non-empty array.`, value);
  }
  return value.map((amount, index) => {
    const source = expectRecord(amount, `${label}[${index}]`);
    return {
      amount: narrowNonEmptyString(source.amount, `${label}[${index}].amount`),
      unit: narrowNonEmptyString(source.unit, `${label}[${index}].unit`)
    };
  }) as [MasumiAmount, ...MasumiAmount[]];
}

function narrowPaymentSource(
  value: unknown,
  fallbackNetwork: unknown,
  fallbackPaymentSourceType: unknown
): SokosumiMasumiPaymentPayload["PaymentSource"] {
  if (value === undefined || value === null) return undefined;
  const source = expectRecord(value, "Masumi payment payload.PaymentSource");

  // Masumi permits a nullable policy id, while Sokosumi only accepts a complete
  // PaymentSource. The field is optional on Sokosumi, so omit an unmappable source.
  if (source.policyId === undefined || source.policyId === null) return undefined;

  const paymentSourceType = source.paymentSourceType ?? fallbackPaymentSourceType;
  return {
    network: expectLiteral(
      source.network ?? fallbackNetwork,
      MASUMI_NETWORKS,
      "Masumi payment payload.PaymentSource.network"
    ),
    smartContractAddress: narrowNonEmptyString(
      source.smartContractAddress,
      "Masumi payment payload.PaymentSource.smartContractAddress"
    ),
    policyId: narrowNonEmptyString(
      source.policyId,
      "Masumi payment payload.PaymentSource.policyId"
    ),
    ...(paymentSourceType === undefined || paymentSourceType === null || paymentSourceType === ""
      ? {}
      : {
          paymentSourceType: expectLiteral(
            paymentSourceType,
            MASUMI_PAYMENT_SOURCE_TYPES,
            "Masumi payment payload.PaymentSource.paymentSourceType"
          )
        })
  };
}

function walletVkey(value: unknown, label: string): unknown {
  if (value === undefined || value === null) return undefined;
  return expectRecord(value, label).walletVkey;
}

function narrowNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throwInvalidResponse(`${label} must be a non-empty string.`, value);
  }
  return value;
}

function narrowOptionalNonEmptyString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return narrowNonEmptyString(value, label);
}

function throwInvalidResponse(message: string, payload: unknown): never {
  throw new MasumiPaymentError(message, { code: "invalid_response", payload });
}
