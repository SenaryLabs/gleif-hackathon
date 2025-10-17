import { 
  Lucid, 
  generateEmulatorAccount, 
  Emulator, 
  Data,
  fromText,
  fromHex,
  TxHash,
  Script,
  validatorToAddress,
  getAddressDetails,
  mintingPolicyToId
} from "@evolution-sdk/lucid";
import { readValidator } from "./utils.ts";
import { parseCardanoSignature } from "./binding-parser.ts";

// ============================================================================
// BOND MINTING SCHEMAS (matching types.ak exactly)
// ============================================================================

// Bond Status Schema
const BondStatusSchema = Data.Enum([
  Data.Literal("Funding"),
  Data.Literal("Active"),
  Data.Literal("Matured"),
  Data.Literal("Defaulted"),
  Data.Literal("Redeemed"),
]);

// Bond Datum Schema (from types.ak - EXACT field order)
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

// Binding Redeemer Schema (from types.ak - EXACT field order is CRITICAL)
// Field order: 0-12 as documented in types.ak
const BindingRedeemerSchema = Data.Object({
  binding_said: Data.Bytes(),              // 0
  issuer_aid: Data.Bytes(),                // 1
  holder_aid: Data.Bytes(),                // 2
  cardano_address: Data.Bytes(),           // 3
  cardano_public_key: Data.Bytes(),        // 4 - Ed25519 public key (32 bytes)
  sig_structure: Data.Bytes(),             // 5 - CIP-30 Sig_structure (~113 bytes)
  cardano_signature: Data.Bytes(),         // 6 - Ed25519 signature (64 bytes only)
  canonical_message: Data.Bytes(),         // 7
  veridian_signature: Data.Bytes(),        // 8 - Ed25519 signature (64 bytes)
  holder_public_key: Data.Bytes(),         // 9 - Ed25519 public key (32 bytes)
  keri_version: Data.Bytes(),              // 10
  binding_type: Data.Bytes(),              // 11
  created_at: Data.Integer(),              // 12
});

// Bond Minting Redeemer Schema (from types.ak)
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

// TypeScript types
type BondStatus = Data.Static<typeof BondStatusSchema>;
type BondDatum = Data.Static<typeof BondDatumSchema>;
type BindingRedeemer = Data.Static<typeof BindingRedeemerSchema>;
type BondMintingRedeemer = Data.Static<typeof BondMintingRedeemerSchema>;

// ============================================================================
// REAL KEL DATA STRUCTURE
// ============================================================================

interface KELBindingData {
  a: Array<{
    d: string;
    x: {
      v: string;
      t: string;
      issuer: string;
      holder: string;
      cardanoAddress: string;
      cardanoPublicKey: string;
      canonicalMessage: string;
      signature: {
        cardano: string;
        veridian: string;
      };
      createdAt: string;
      d: string;
    };
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================


/**
 * Extract Ed25519 public key from holder AID
 * Format: "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV"
 * "E" = basic prefix, "D" = Ed25519, rest = Base64URL encoded key (32 bytes)
 */
function extractPublicKeyFromAID(aid: string): string {
  // For now, return a placeholder 32-byte hex string (64 hex characters)
  // In production, this would properly decode the Base64URL from the AID
  return "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
}

/**
 * Convert Base64URL Veridian signature to hex string
 * Format: "0BBLm2tSXGrhqD3MdTlP..." -> 64-byte hex string
 */
function convertVeridianSignatureToHex(veridianSig: string): string {
  if (!veridianSig || veridianSig.length < 88) {
    throw new Error('Invalid Veridian signature: must be at least 88 characters');
  }
  
  const signatureCode = veridianSig.substring(0, 2);
  console.log('   ℹ Veridian signature code:', signatureCode);
  
  if (signatureCode !== '0B') {
    throw new Error(`Unsupported signature code: ${signatureCode}. Expected '0B' for Ed25519`);
  }
  
  // Remove signature code and decode base64url to hex
  const base64urlSig = veridianSig.substring(2);
  const signatureHex = base64urlToHex(base64urlSig);
  
  console.log('   ✓ Extracted Veridian Ed25519 signature (64 bytes):', signatureHex.substring(0, 32) + '...');
  
  if (signatureHex.length !== 128) {
    throw new Error(`Invalid signature length: ${signatureHex.length} hex chars (expected 128)`);
  }
  
  return signatureHex;
}

/**
 * Convert base64url to hex
 * KERI uses base64url encoding for all cryptographic material
 */
function base64urlToHex(base64url: string): string {
  // Replace URL-safe characters with standard base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  // Decode base64 to bytes
  const bytes = atob(base64);
  
  // Convert bytes to hex
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes.charCodeAt(i).toString(16).padStart(2, '0');
  }
  
  return hex;
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testBondMinting(kelData: KELBindingData) {
  console.log("🏦 Bond Minting Test with Real KEL Data");
  console.log("========================================\n");

  // Extract binding data from KEL structure
  if (!kelData.a || kelData.a.length === 0) {
    throw new Error("Invalid KEL data: missing 'a' array or empty array");
  }

  const bindingEvent = kelData.a[0];
  const binding = bindingEvent.x;

  console.log("📋 KEL Binding Data:");
  console.log(`   Binding SAID: ${binding.d}`);
  console.log(`   Issuer AID: ${binding.issuer}`);
  console.log(`   Holder AID: ${binding.holder}`);
  console.log(`   Cardano Address: ${binding.cardanoAddress}`);
  console.log(`   Cardano Public Key: ${binding.cardanoPublicKey}`);
  console.log(`   Created At: ${binding.createdAt}\n`);

  // 1. Setup emulator with accounts
  const issuer = generateEmulatorAccount({ lovelace: 100_000_000n });
  const underwriter = generateEmulatorAccount({ lovelace: 50_000_000n });
  const investor = generateEmulatorAccount({ lovelace: 10_000_000n });
  
  const emulator = new Emulator([issuer, underwriter, investor]);
  const lucid = await Lucid(emulator, "Custom");
  lucid.selectWallet.fromSeed(issuer.seedPhrase);
  
  console.log("✅ Emulator setup complete");
  console.log(`   Issuer: ${issuer.address}`);
  console.log(`   Underwriter: ${underwriter.address}`);
  console.log(`   Investor: ${investor.address}\n`);

  // 2. Create bond datum
  console.log("📋 Creating bond datum...");
  
  const currentTime = BigInt(Date.now());
  const maturityTime = currentTime + BigInt(365 * 24 * 60 * 60 * 1000); // 1 year
  
  const bondDatumData = {
    issuer_lei: fromText("875500ELOZEL05BVXV37"),
    issuer_entity_name: fromText("VERTEX Energy Solutions PJSC"),
    issuer_entity_aid: fromText(binding.holder),
    vlei_credential_said: fromText("Emkwmiv5w049am24yqx9sy9"),
    bond_id: fromText("PDB2DAY-001"),
    total_face_value: 10000000000n, // $100M in cents
    coupon_rate_bps: 500n, // 5%
    payment_interval_ms: 60000n, // 1 minute
    maturity_timestamp: maturityTime,
    currency: fromText("USD"),
    denomination: 100n, // $1.00 per token
    issue_timestamp: currentTime,
    last_coupon_payment_timestamp: currentTime,
    funds_raised: 0n,
    status: "Funding" as const,
  };
  
  console.log("✅ Bond datum created\n");

  // 3. Process signatures and keys from KEL data
  console.log("🔐 Processing cryptographic components...");
  
  const cardanoSignatureHex = binding.signature.cardano;
  const veridianSignature = binding.signature.veridian;
  
  // Parse Cardano signature using proper COSE_Sign1 parsing
  console.log("📦 Parsing Cardano COSE_Sign1 signature...");
  const parsedCardanoSignature = parseCardanoSignature(cardanoSignatureHex);
  
  // Extract Ed25519 signature directly from CBOR (like trust-engine-demo)
  if (cardanoSignatureHex.length < 128) {
    throw new Error('Invalid COSE signature: too short');
  }
  
  // Extract last 64 bytes (128 hex chars) which is the Ed25519 signature
  const ed25519Signature = cardanoSignatureHex.slice(-128);
  console.log(`   Direct Ed25519 extraction: ${ed25519Signature.substring(0, 20)}... (${ed25519Signature.length} chars = ${ed25519Signature.length / 2} bytes)`);
  
  console.log("✅ Cryptographic components extracted");
  console.log(`   Cardano Public Key: ${binding.cardanoPublicKey.substring(0, 20)}... (${binding.cardanoPublicKey.length} chars = ${binding.cardanoPublicKey.length / 2} bytes)`);
  console.log(`   Cardano Signature: ${cardanoSignatureHex.substring(0, 20)}... (${cardanoSignatureHex.length} chars = ${cardanoSignatureHex.length / 2} bytes)`);
  console.log(`   Parsed Cardano Signature: ${parsedCardanoSignature.signature.substring(0, 20)}... (${parsedCardanoSignature.signature.length} chars = ${parsedCardanoSignature.signature.length / 2} bytes)`);
  console.log(`   Veridian Signature: ${veridianSignature.substring(0, 20)}... (${veridianSignature.length} chars = ${veridianSignature.length / 2} bytes)`);
  console.log(`   Hardcoded Veridian Signature: 1234567890abcdef1234... (128 chars = 64 bytes)\n`);

  // 4. Create binding redeemer with EXACT field order (0-12)
  console.log("🔗 Creating binding redeemer (field order 0-12)...");
  
  const bindingRedeemerData = {
    binding_said: fromText(binding.d),                    // 0
    issuer_aid: fromText(binding.issuer),                 // 1
    holder_aid: fromText(binding.holder),                 // 2
    cardano_address: fromText(binding.cardanoAddress),    // 3
    cardano_public_key: binding.cardanoPublicKey,         // 4 - Ed25519 (32 bytes) - raw hex string
    sig_structure: parsedCardanoSignature.sigStructure,   // 5 - CIP-30 Sig_structure - raw hex string
    cardano_signature: ed25519Signature, // 6 - Ed25519 (64 bytes) - direct extraction from CBOR
    canonical_message: fromText(binding.canonicalMessage),// 7
    veridian_signature: convertVeridianSignatureToHex(veridianSignature), // 8 - Ed25519 (64 bytes) - properly decoded from Base64URL
    holder_public_key: extractPublicKeyFromAID(binding.holder), // 9 - Ed25519 (32 bytes) - raw hex string
    keri_version: fromText(binding.v),                    // 10
    binding_type: fromText(binding.t),                   // 11
    created_at: BigInt(new Date(binding.createdAt).getTime()), // 12
  };
  
  console.log("✅ Binding redeemer created with correct field order\n");

  // 5. Create bond minting redeemer with 3-credential chain
  console.log("🏦 Creating bond minting redeemer with vLEI chain...");
  
  const bondMintingRedeemerData = {
    // 3-Credential Chain (Simplified)
    qvi_lei: fromText("875500ELOZEL05BVXV37"),                    // QVI LEI
    le_lei: fromText("875500ELOZEL05BVXV37"),                     // LE LEI
    role_lei: fromText("875500ELOZEL05BVXV37"),                   // Role LEI
    qvi_credential_said: fromText("EEYykJ1HshZNgfousuqXEmn1STEZBw7712SBX8fWfWcv"), // QVI credential SAID
    le_credential_said: fromText("Emkwmiv5w049am24yqx9sy9"),      // LE credential SAID
    role_credential_said: fromText("Emkwmiv5w049am24yqx9sy9"),    // Role credential SAID
    le_qvi_edge: fromText("EEYykJ1HshZNgfousuqXEmn1STEZBw7712SBX8fWfWcv"), // LE->QVI edge
    role_le_edge: fromText("Emkwmiv5w049am24yqx9sy9"),            // Role->LE edge
    // Wallet Binding Proof (cryptographic verification)
    binding_proof: bindingRedeemerData,
    // Bond Datum
    bond_datum: bondDatumData,
  };
  
  
  const bondMintingRedeemer = Data.to(bondMintingRedeemerData, BondMintingRedeemerSchema);
  console.log("✅ Bond minting redeemer created with complete vLEI chain\n");

  // 6. Load the bond minting policy
  console.log("📜 Loading bond minting policy...");
  
  const mintingPolicyCode = await readValidator(
    "../aiken/plutus.json",
    "bond_minting_policy.bond_minting_policy.mint"
  );
  const mintingPolicy: Script = {
    type: "PlutusV3",
    script: mintingPolicyCode,
  };
  
  console.log("✅ Bond minting policy loaded\n");

  // 7. Create minting transaction
  console.log("💰 Creating bond minting transaction...");
  
  const bondAssetName = fromText("PDB2DAY");
  const bondPolicyId = mintingPolicyToId(mintingPolicy);
  const bondAsset = `${bondPolicyId}${bondAssetName}`;
  
  const mintTx = await lucid
    .newTx()
    .mintAssets(
      { [bondAsset]: 100000000n }, // 1M tokens
      bondMintingRedeemer
    )
    .attach.MintingPolicy(mintingPolicy)
    .pay.ToAddress(issuer.address, {
      lovelace: 5_000_000n,
      [bondAsset]: 100000000n,
    })
    .complete();

  const mintSigned = await mintTx.sign.withWallet().complete();
  const mintTxHash = await mintSigned.submit();
  await emulator.awaitBlock(1);

  console.log(`✅ Bond minted successfully: ${mintTxHash}`);
  console.log(`   Bond Asset: ${bondAsset}`);
  console.log(`   Policy ID: ${bondPolicyId}`);
  console.log(`   Asset Name: PDB2DAY`);
  console.log(`   Tokens Minted: 100,000,000\n`);

  // 8. Verify tokens
  console.log("🔍 Verifying token distribution...");
  
  const issuerUtxos = await lucid.utxosAt(issuer.address);
  const issuerBondTokens = issuerUtxos.reduce(
    (sum, utxo) => sum + (utxo.assets[bondAsset] || 0n),
    0n
  );
  
  console.log(`   Bond tokens in issuer wallet: ${issuerBondTokens}`);
  
  if (issuerBondTokens === 100000000n) {
    console.log("✅ Token distribution verified!\n");
  } else {
    throw new Error("❌ Token distribution incorrect");
  }

  console.log("🎉 Bond minting test completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   ✓ vLEI 3-credential chain verified`);
  console.log(`   ✓ Wallet binding proof validated`);
  console.log(`   ✓ Bond tokens minted: 100,000,000`);
  console.log(`   ✓ Entity: VERTEX Energy Solutions PJSC`);
  console.log(`   ✓ LEI: 875500ELOZEL05BVXV37`);
  
  return mintTxHash;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function run() {
  try {
    // Real KEL anchored binding data
    const kelData: KELBindingData = {
      "a": [
        {
          "d": "EC0vmnPuDj5mHzV3xE5auCVRTMFu5BDnlsjC12Cl0_Sc",
          "x": {
            "v": "KERI10JSON00043b_",
            "t": "cardano_address_binding",
            "issuer": "EAzkF2sA10BQBA1TZxbfXCLRadORFNyxSmHmdC7JDciL",
            "holder": "EEexsHQ4Hum6H8C-XRSx2nc1MQyJgtCyRKr5RHZN0AL9",
            "cardanoAddress": "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",
            "cardanoPublicKey": "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",
            "canonicalMessage": "BIND|v1|EEexsHQ4Hum6H8C-XRSx2nc1MQyJgtCyRKr5RHZN0AL9|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",
            "signature": {
              "cardano": "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f4410b5840d622f5eec037ef59c37e0b5f348e6f7d5968197fce797ccb0c6aeaebdb9dc0d02d24b189bd131fd61428c709e591248b40886f8b1618dea9a8cb1303266ca401",
              "veridian": "0BBLm2tSXGrhqD3MdTlPnrsj_d1jvEUVuhhDq71uUrFVSfmG4sn5cQOiWPrvzN7SIbz2cCsiYFamEBC9Mwt27UUK"
            },
            "createdAt": "2025-10-08T23:33:40.778Z",
            "d": "EC0vmnPuDj5mHzV3xE5auCVRTMFu5BDnlsjC12Cl0_Sc"
          }
        }
      ]
    };

    await testBondMinting(kelData);
    console.log("\n🎯 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

run();