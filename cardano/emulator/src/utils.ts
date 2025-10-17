/// <reference lib="deno.ns" />

import { Constr, Data } from "@evolution-sdk/lucid";

/**
 * Reads a compiled validator from the Aiken project
 * @param plutusJsonPath Path to the plutus.json file
 * @param validatorName Name of the validator to read
 * @returns The compiled validator code
 */
export async function readValidator(
  plutusJsonPath: string,
  validatorName: string
): Promise<string> {
  try {
    // Read the plutus.json file
    const plutusJSON = JSON.parse(await Deno.readTextFile(plutusJsonPath));
    
    // Find the validator with the given name
    const validator = plutusJSON.validators.find(
      (v: any) => v.title === validatorName
    );
    
    if (!validator) {
      throw new Error(`Validator ${validatorName} not found in ${plutusJsonPath}`);
    }
    
    return validator.compiledCode;
  } catch (error) {
    console.error(`Error reading validator: ${error}`);
    throw error;
  }
}

/**
 * Formats the bytecode of a validator to work with Lucid
 */
export function formatValidator(hexBytecode: string): string {
  // Remove any 0x prefix if present
  if (hexBytecode.startsWith("0x")) {
    return hexBytecode.slice(2);
  }
  return hexBytecode;
}

/**
 * Helper function to apply a validator to given parameters
 * @param applyParams Parameters to apply to the validator
 * @returns Datum, redeemer, and script context
 */
export function applyParamsToScript(applyParams: any): Data {
  // This is a simplified version. In practice, you would need to format
  // the parameters according to the validator's requirements.
  return new Constr(0, [
    applyParams.datum,
    applyParams.redeemer,
    applyParams.scriptContext
  ]);
}

/**
 * Converts days to slots (assuming 1 slot = 1 second for simplicity)
 * @param days Number of days
 * @returns Number of slots
 */
export function daysToSlots(days: number): bigint {
  return BigInt(Math.floor(days * 24 * 60 * 60));
}

/**
 * Converts days to milliseconds
 * @param days Number of days
 * @returns Number of milliseconds
 */
export function daysToMs(days: number): bigint {
  return BigInt(Math.floor(days * 24 * 60 * 60 * 1000));
}

/**
 * Converts ADA to lovelace
 * @param ada Amount in ADA
 * @returns Amount in lovelace
 */
export function adaToLovelace(ada: number): bigint {
  return BigInt(ada * 1000000);
}

/**
 * Converts lovelace to ADA
 * @param lovelace Amount in lovelace
 * @returns Amount in ADA
 */
export function lovelaceToAda(lovelace: bigint): number {
  return Number(lovelace) / 1000000;
}

/**
 * Calculates coupon amount based on principal, rate, and period
 * @param principal Principal amount in lovelace
 * @param rateBps Rate in basis points (e.g., 500 = 5%)
 * @param periodMs Period in milliseconds
 * @returns Coupon amount in lovelace
 */
export function calculateCouponAmount(
  principal: bigint,
  rateBps: bigint,
  periodMs: bigint
): bigint {
  // Annual rate calculation: (principal * rate_bps * period_ms) / (10000 * 365 * 24 * 60 * 60 * 1000)
  const annualMs = 365n * 24n * 60n * 60n * 1000n;
  return (principal * rateBps * periodMs) / (10000n * annualMs);
}


/**
 * Creates a bond datum with default values
 * @param params Bond configuration and additional parameters
 * @param currentTime Current emulator time in milliseconds (optional)
 * @returns Bond datum
 */
export function createBondDatum(
  params: {
    faceValue: bigint; // Face value in cents (e.g., 10000000000 = $100,000,000.00)
    maturityDays: number;
    interestRateBps: number;
    paymentIntervalMs: number;
    commitmentPeriodDays: number;
    creditAgreementPolicyId: string;
    creditAgreementTokenName: string;
    issuerAddress: string;
    underwriterAddress: string;
    bondSymbol: string;
    denomination?: bigint; // How many smallest units = 1 token (default: 100 for USD)
    // NEW: Satellite contract configuration
    commitmentValidatorHash?: string;
    tokenPoolValidatorHash?: string;
    bondLifecycleValidatorHash?: string;
    // Optional fields for updates
    funds_raised?: bigint;
    last_coupon_payment_timestamp?: bigint;
    status?: string;
    previousDatum?: any;
    interestRateModuleType?: "FixedRate" | "FloatingRate" | "ZeroCoupon";
    repaymentScheduleType?: "Bullet" | "Amortizing" | "Callable";
  },
  currentTime: bigint // Make this required for consistency
): any {
  // Use the provided current time (emulator time in tests, system time in production)
  const now = currentTime;
  const commitmentStartMs = now;
  const commitmentEndMs = now + daysToMs(params.commitmentPeriodDays);
  const maturityMs = now + daysToMs(params.maturityDays);

  // Set denomination (default to 100 for USD: 1 token = $1.00)
  const denomination = params.denomination || 100n;

  // Always use enum/object structure for interest_rate_module
  let interest_rate_module: any;
  if (params.interestRateModuleType === "FloatingRate") {
    interest_rate_module = {
      FloatingRate: {
        benchmark_oracle_address: params.previousDatum?.interest_rate_module?.FloatingRate?.benchmark_oracle_address || "",
        spread_bps: params.previousDatum?.interest_rate_module?.FloatingRate?.spread_bps || 0n,
        payment_interval_ms: BigInt(params.paymentIntervalMs)
      }
    };
  } else if (params.interestRateModuleType === "ZeroCoupon") {
    interest_rate_module = { ZeroCoupon: {} };
  } else {
    // Default to FixedRate
    interest_rate_module = {
      FixedRate: {
        coupon_rate_bps: BigInt(params.interestRateBps),
        payment_interval_ms: BigInt(params.paymentIntervalMs)
      }
    };
  }

  // Always use enum/object structure for repayment_schedule_module
  let repayment_schedule_module: any;
  if (params.repaymentScheduleType === "Amortizing") {
    repayment_schedule_module = {
      Amortizing: {
        payment_schedule: params.previousDatum?.repayment_schedule_module?.Amortizing?.payment_schedule || []
      }
    };
  } else if (params.repaymentScheduleType === "Callable") {
    repayment_schedule_module = {
      Callable: {
        call_schedule: params.previousDatum?.repayment_schedule_module?.Callable?.call_schedule || []
      }
    };
  } else {
    // Default to Bullet
    repayment_schedule_module = { Bullet: {} };
  }

  // Use previous datum values for updates if provided
  const funds_raised = params.funds_raised !== undefined
    ? params.funds_raised
    : params.previousDatum?.funds_raised !== undefined
      ? params.previousDatum.funds_raised
      : 0n;
  const last_coupon_payment_timestamp = params.last_coupon_payment_timestamp !== undefined
    ? params.last_coupon_payment_timestamp
    : params.previousDatum?.last_coupon_payment_timestamp !== undefined
      ? params.previousDatum.last_coupon_payment_timestamp
      : 0n;
  const status = params.status !== undefined
    ? params.status
    : params.previousDatum?.status !== undefined
      ? params.previousDatum.status
      : "Funding";

  // Get credentials from addresses
  const issuerCredential = params.issuerAddress.length === 56
    ? params.issuerAddress
    : (typeof params.issuerAddress === "string" ? params.issuerAddress : "");
  const underwriterCredential = params.underwriterAddress.length === 56
    ? params.underwriterAddress
    : (typeof params.underwriterAddress === "string" ? params.underwriterAddress : "");

  return {
    issuer_credential: issuerCredential,
    underwriter_credential: underwriterCredential,
    maturity_timestamp: maturityMs,
    total_face_value: params.faceValue, // Total face value in smallest currency unit (e.g., cents for USD)
    denomination, // How many smallest units = 1 token (e.g., 100 for USD: 1 token = $1.00)
    commitment_start_timestamp: commitmentStartMs,
    commitment_end_timestamp: commitmentEndMs,
    credit_agreement_nft_policy: params.creditAgreementPolicyId,
    credit_agreement_nft_token_name: params.creditAgreementTokenName,
    interest_rate_module,
    repayment_schedule_module,
    funds_raised,
    last_coupon_payment_timestamp, // Also serves as issue_date when status becomes Active
    status,
    commitment_validator_hash: params.commitmentValidatorHash || "",
    token_pool_validator_hash: params.tokenPoolValidatorHash || "",
    bond_lifecycle_script_hash: params.bondLifecycleValidatorHash || ""
  };
}

/**
 * Calculates accrued interest based on interest rate module and time period
 * @param principal Principal amount in lovelace
 * @param interest_rate_module Interest rate module from bond datum
 * @param startTimestamp Start timestamp in milliseconds
 * @param endTimestamp End timestamp in milliseconds
 * @returns Accrued interest amount in lovelace
 */
export function calculateAccruedInterest(
  principal: bigint,
  interest_rate_module: any,
  startTimestamp: bigint,
  endTimestamp: bigint
): bigint {
  const timeElapsedMs = endTimestamp - startTimestamp;
  
  // Handle different interest rate module types
  if (interest_rate_module.FixedRate) {
    const { coupon_rate_bps, payment_interval_ms } = interest_rate_module.FixedRate;
    return calculateCouponAmount(principal, coupon_rate_bps, timeElapsedMs);
  } 
  else if (interest_rate_module.FloatingRate) {
    const { spread_bps, payment_interval_ms } = interest_rate_module.FloatingRate;
    // For floating rate, we'd need to get the benchmark rate from oracle
    // For now, use the spread as the rate (simplified)
    return calculateCouponAmount(principal, spread_bps, timeElapsedMs);
  }
  else if (interest_rate_module.ZeroCoupon) {
    // Zero coupon bonds don't pay periodic interest
    return 0n;
  }
  else {
    // Default to zero if unknown module type
    return 0n;
  }
} 

/**
 * Ensures a hex string has an even length by adding a leading zero if needed
 * This is important for proper Plutus serialization
 */
export function toEvenHex(s: string): string {
  return s.length % 2 === 0 ? s : '0' + s;
} 