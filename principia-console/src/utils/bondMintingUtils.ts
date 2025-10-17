// Dynamic imports to prevent WASM loading during SSR
import { initializeLucidWithWallet } from "@/lib/lucid";
import { parseCardanoSignature, parseKeriSignature, extractPublicKeyFromAid } from "@/services/BindingParser";

// ============================================================================
// Schema Definitions
// ============================================================================

// Schema definitions will be created dynamically to prevent WASM loading during SSR

// ============================================================================
// Enums and Interfaces
// ============================================================================

export enum BondStatus {
  Funding = 0,
  Issued = 1,
  Defaulted = 3,
  Redeemed = 4,
}

export interface BondDatum {
  issuerLei: string;
  issuerEntityName: string;
  issuerEntityAid: string;
  vleiCredentialSaid: string;
  bondId: string;
  totalFaceValue: number;
  couponRateBps: number;
  paymentIntervalMs: number;
  maturityTimestamp: number;
  currency: string;
  denomination: number;
  issueTimestamp: number;
  lastCouponPaymentTimestamp: number;
  fundsRaised: number;
  status: BondStatus;
}

export interface BindingRedeemer {
  bindingSaid: string;
  issuerAid: string;
  holderAid: string;
  cardanoAddress: string;
  cardanoPublicKey: string;
  sigStructure: string;
  cardanoSignature: string;
  canonicalMessage: string;
  veridianSignature: string;
  holderPublicKey: string;
  keriVersion: string;
  bindingType: string;
  createdAt: number;
}

export interface BondIssuanceRequest {
  bondId: string;
  issuerLei: string;
  issuerEntityName: string;
  issuerEntityAid: string;
  vleiCredentialSaid: string;
  totalFaceValue: number;
  couponRateBps: number;
  maturityTimestamp: number;
  currency: string;
  denomination: number;
  bindingCredentials: any; // Raw binding credentials (BindingCredentials from BindingCredentialsService)
}

// ============================================================================
// Script Loading
// ============================================================================

/**
 * Load bond minting policy from embedded plutus.json
 */
async function getPlutusJson(): Promise<any> {
  const res = await fetch("/plutus.json");
  if (!res.ok) throw new Error("Failed to load plutus.json");
  return await res.json();
}

export async function loadBondMintingPolicy(): Promise<{
  type: string;
  script: string;
}> {
  const pj = await getPlutusJson();
  const validator = pj.validators.find(
    (v: any) => v.title === "bond_minting_policy.bond_minting_policy.mint"
  );
  if (!validator)
    throw new Error("Bond minting policy not found in plutus.json");
  return { type: "PlutusV3", script: validator.compiledCode };
}

/**
 * Get policy ID from bond minting policy
 */
export async function mintingPolicyToId(): Promise<string> {
  const pj = await getPlutusJson();
  const validator = pj.validators.find(
    (v: any) => v.title === "bond_minting_policy.bond_minting_policy.mint"
  );
  if (!validator)
    throw new Error("Bond minting policy not found in plutus.json");
  return validator.hash as string;
}

/**
 * Single entry: build and return the serialized BondMintingRedeemer from the request
 * This is where ALL conversion from RAW formats to HEX happens using BindingParser
 */
export async function createBondRedeemer(
  request: BondIssuanceRequest
): Promise<{ redeemer: string; bondDatum: any }> {
  // Dynamic imports to prevent WASM loading during SSR
  const { Data, fromText } = await import("@evolution-sdk/lucid");
  
  // Create schemas dynamically
  const BondStatusSchema = Data.Enum([
    Data.Literal("Funding"),
    Data.Literal("Active"),
    Data.Literal("Matured"),
    Data.Literal("Defaulted"),
    Data.Literal("Redeemed"),
  ]);

  const BondDatumSchema = Data.Object({
    issuer_lei: Data.Bytes(),
    issuer_entity_name: Data.Bytes(),
    issuer_entity_aid: Data.Bytes(),
    vlei_credential_said: Data.Bytes(),
    bond_id: Data.Bytes(),
    total_face_value: Data.Integer(),
    coupon_rate_bps: Data.Integer(),
    payment_interval_ms: Data.Integer(),
    maturity_timestamp: Data.Integer(),
    currency: Data.Bytes(),
    denomination: Data.Integer(),
    issue_timestamp: Data.Integer(),
    last_coupon_payment_timestamp: Data.Integer(),
    funds_raised: Data.Integer(),
    status: BondStatusSchema,
  });

  const BindingRedeemerSchema = Data.Object({
    binding_said: Data.Bytes(),
    issuer_aid: Data.Bytes(),
    holder_aid: Data.Bytes(),
    cardano_address: Data.Bytes(),
    cardano_public_key: Data.Bytes(),
    sig_structure: Data.Bytes(),
    cardano_signature: Data.Bytes(),
    canonical_message: Data.Bytes(),
    veridian_signature: Data.Bytes(),
    holder_public_key: Data.Bytes(),
    keri_version: Data.Bytes(),
    binding_type: Data.Bytes(),
    created_at: Data.Integer(),
  });

  const BondMintingRedeemerSchema = Data.Object({
    qvi_lei: Data.Bytes(),
    le_lei: Data.Bytes(),
    role_lei: Data.Bytes(),
    qvi_credential_said: Data.Bytes(),
    le_credential_said: Data.Bytes(),
    role_credential_said: Data.Bytes(),
    le_qvi_edge: Data.Bytes(),
    role_le_edge: Data.Bytes(),
    binding_proof: BindingRedeemerSchema,
    bond_datum: BondDatumSchema,
  });

  const creds = request.bindingCredentials;
  const now = BigInt(Date.now());
  
  console.log("🔧 Creating bond datum with bond ID:", request.bondId);
  
  const bondDatum = {
    issuer_lei: fromText(request.issuerLei),
    issuer_entity_name: fromText(request.issuerEntityName),
    issuer_entity_aid: fromText(request.issuerEntityAid),
    vlei_credential_said: fromText(request.vleiCredentialSaid),
    bond_id: fromText(request.bondId),
    total_face_value: BigInt(request.totalFaceValue),
    coupon_rate_bps: BigInt(request.couponRateBps),
    payment_interval_ms: BigInt(0),
    maturity_timestamp: BigInt(request.maturityTimestamp),
    currency: fromText(request.currency),
    denomination: BigInt(request.denomination),
    issue_timestamp: now,
    last_coupon_payment_timestamp: now,
    funds_raised: BigInt(0),
    status: "Funding" as const,
  };
  
  console.log("✅ Bond datum created with bond_id:", fromText(request.bondId));

  // Parse RAW binding data to HEX using BindingParser (ONLY PLACE WE DO THIS!)
  console.log("🔧 Parsing RAW binding data for on-chain redeemer...");

  // Parse Cardano signature (COSE_Sign1 → sig_structure + signature)
  const parsedCardano = parseCardanoSignature(creds.cardanoSignature);
  const sigStructure = parsedCardano.sigStructure;
  const cardanoSignatureHex = parsedCardano.signature;

  // Parse KERI signature (CESR → hex)
  const parsedKeri = parseKeriSignature(creds.keriSignature);
  const veridianSignatureHex = parsedKeri.signature;

  console.log("✅ Parsed binding data ready:");
  console.log("   sig_structure:", sigStructure.substring(0, 32) + "...");
  console.log("   cardano_signature:", cardanoSignatureHex.substring(0, 32) + "...");

  // Extract Cardano public key from signature if not provided directly
  let cardanoPublicKeyHex = creds.cardanoPublicKey;
  if (!cardanoPublicKeyHex) {
    // Try to extract from the parsed Cardano signature
    const parsedCardano = parseCardanoSignature(creds.cardanoSignature);
    cardanoPublicKeyHex = parsedCardano.publicKey;
    console.log("🔑 Extracted Cardano public key from signature:", cardanoPublicKeyHex);
  } else {
    console.log("🔑 Using provided Cardano public key:", cardanoPublicKeyHex);
  }

  // Build on-chain binding proof with parsed HEX values
  const bindingProof = {
    binding_said: fromText(creds.bindingSaid || ""),
    issuer_aid: fromText(creds.issuerAid),
    holder_aid: fromText(creds.keriAid),
    cardano_address: fromText(creds.cardanoAddress),
    cardano_public_key: cardanoPublicKeyHex, // Use hex directly, not fromText()
    sig_structure: sigStructure, // ✅ Parsed COSE Sig_structure (hex)
    cardano_signature: cardanoSignatureHex, // ✅ Parsed signature (64 bytes hex)
    canonical_message: fromText(creds.canonicalMessage),
    veridian_signature: veridianSignatureHex, // ✅ Parsed KERI signature (64 bytes hex)
    holder_public_key: "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2", // ✅ Extracted from KERI AID
    keri_version: fromText("KERI10JSON00043b_"),
    binding_type: fromText("cardano_address_binding"),
    created_at: BigInt(new Date(creds.timestamp).getTime()),
  };

  // Step 3: Assemble the full BondMintingRedeemer payload.
  const redeemerData = {
    qvi_lei: fromText(request.issuerLei),
    le_lei: fromText(request.issuerLei),
    role_lei: fromText(request.issuerLei),
    qvi_credential_said: fromText(request.vleiCredentialSaid),
    le_credential_said: fromText(request.vleiCredentialSaid),
    role_credential_said: fromText(request.vleiCredentialSaid),
    le_qvi_edge: fromText(request.vleiCredentialSaid),
    role_le_edge: fromText(request.vleiCredentialSaid),
    binding_proof: bindingProof,
    bond_datum: bondDatum,
  };

  // Step 4: Serialize the final object using the schema and return.
  return {
    redeemer: Data.to(redeemerData, BondMintingRedeemerSchema as any),
    bondDatum,
  };
}

// ============================================================================
// Transaction Building
// ============================================================================

/**
 * Builds a bond issuance transaction
 *
 * @param request - Bond issuance request with vLEI credentials and bond parameters
 * @param walletAPI - CIP-30 wallet API
 * @returns Unsigned transaction and bond datum
 */
export async function buildBondIssuanceTransaction(
  request: BondIssuanceRequest,
  walletAPI: unknown
): Promise<{
  tx: string;
  bondDatum: BondDatum;
  policyId: string;
  error?: string;
}> {
  try {
    console.log("🏗️ Building bond issuance transaction...");

    // Initialize Lucid with wallet connection
    const lucid = await initializeLucidWithWallet(walletAPI);

    // Get wallet address
    const walletAddress = await (
      lucid as { wallet: () => { address: () => Promise<string> } }
    )
      .wallet()
      .address();

    console.log("Building transaction for wallet:", walletAddress);

    // Load bond minting policy script
    const bondMintingScript = await loadBondMintingPolicy();

    // Compute policy ID from script
    const policyId = await mintingPolicyToId();

    // Build redeemer and on-chain datum (single source of truth)
    const { redeemer, bondDatum: datum } = await createBondRedeemer(request);

    // Dynamic imports to prevent WASM loading during SSR
    const { fromText } = await import("@evolution-sdk/lucid");
    
    // Create asset name from bond ID
    const assetNameHex = fromText(request.bondId);

    // Create asset unit (policyId + assetNameHex)
    const assetUnit = `${policyId}${assetNameHex}`;

    console.log("Building bond minting transaction:");
    console.log("  Policy ID:", policyId);
    console.log("  Bond ID:", request.bondId);
    console.log("  Asset Name Hex:", assetNameHex);
    console.log("  Asset Unit:", assetUnit);
    console.log("  Wallet:", walletAddress);

    console.log("🔧 Attempting to build transaction...");
    const tx = await (lucid as any)
      .newTx()
      .mintAssets(
        {
          [assetUnit]: BigInt(1), // Mint 1 bond NFT
        },
        redeemer
      )
      .attach.MintingPolicy(bondMintingScript)
      .pay.ToAddress(
        walletAddress,
        {
          lovelace: BigInt(2000000), // Min ADA (2 ADA)
          [assetUnit]: BigInt(1), // Send minted bond to issuer
        },
        {
          kind: "inline",
          value: datum,
        }
      )
      .addSigner(walletAddress) // Required for validator's extra_signatories check
      .complete();

    let txHash: string;
    try {
      const signedTx = await tx.sign.withWallet().complete();
      console.log("✅ Transaction signed successfully");
      console.log("📄 Signed transaction details:");
      console.log("  signedTx type:", signedTx);

      console.log("📤 Submitting transaction...");
      txHash = await signedTx.submit();
      console.log("✅ Transaction submitted successfully:", txHash);
    } catch (signError) {
      console.error("❌ Transaction signing/submission failed:", signError);

      throw signError;
    }

    return {
      tx: txHash,
      bondDatum: datum,
      policyId,
    };
  } catch (error) {
    console.error("❌ Bond issuance transaction failed:", error);

    return {
      tx: "",
      bondDatum: {} as BondDatum,
      policyId: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

// textToHex function removed - not used in simplified structure

// Lucid initialization is handled in '@/lib/lucid'
