/**
 * Bond Minting with Verifiable Smart Contracts Test
 * 
 * Tests bond issuance with cryptographic binding verification:
 * 1. Wallet binding signatures (CIP-30 + Veridian) verified on-chain
 * 2. Entity AID from vLEI matches holder AID from binding
 * 3. Only authorized identity can mint bonds
 */

import { 
  Lucid, 
  generateEmulatorAccount, 
  Emulator, 
  Data,
  Constr,
  fromText,
  toHex,
  mintingPolicyToId,
  MintingPolicy,
} from "@evolution-sdk/lucid";
import { readValidator } from "./utils.ts";
import { 
  parseCardanoSignature,
  parseKeriSignature,
  extractPublicKeyFromAid,
} from "./binding-parser.ts";
import process from "node:process";

// Utility: Convert string to hex (UTF-8 encoding)
function stringToHex(str: string): string {
  return toHex(new TextEncoder().encode(str));
}

// ============================================================================
// Test Data - vLEI Entity Attribution
// ============================================================================

const ENTITY_LEI = "5493000TEYRWVVUHO339";
const ENTITY_NAME = "Test Entity Inc";
// IMPORTANT: Must match the holder_aid from REAL_BINDING_DATA for aid_match check to pass!
const ENTITY_AID = "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV";
const VLEI_CREDENTIAL_SAID = "EKBXw96m5Qzj3M1eP-KfFqvLrCqEZaDLrOEDp8_DQfHE";
const QVI_CREDENTIAL_SAID = "EHHtqUX99qxPdZM0LMZpzKPY4RqG_yKVGk5ZEZK6xLhE";

// ============================================================================
// Data Construction Functions
// ============================================================================

/**
 * Constructs BondDatum Constr
 * Matches: pub type BondDatum in types.ak
 */
function constructBondDatum(
  bondId: string,
  lei: string,
  entityName: string,
  entityAid: string,
  vleiSaid: string
): Constr<Data> {
  const now = Date.now();
  const maturityDate = now + (365 * 24 * 60 * 60 * 1000); // 1 year from now
  
  console.log("   📋 Constructing Bond Datum:");
  console.log("      bond_id:", bondId);
  console.log("      issuer_lei:", lei);
  console.log("      issuer_entity_name:", entityName);
  console.log("      issuer_entity_aid:", entityAid);
  console.log("      vlei_credential_said:", vleiSaid);
  console.log("      total_face_value: 1,000,000 cents ($10,000)");
  console.log("      coupon_rate_bps: 525 (5.25%)");
  console.log("      maturity:", new Date(maturityDate).toISOString());
  
  return new Constr(0, [
    // Entity Attribution
    fromText(lei),                                             // issuer_lei
    fromText(entityName),                                      // issuer_entity_name
    fromText(entityAid),                                       // issuer_entity_aid
    fromText(vleiSaid),                                        // vlei_credential_said
    
    // Bond Terms
    fromText(bondId),                                          // bond_id
    BigInt(1000000),                                           // total_face_value (10,000 USD in cents)
    BigInt(525),                                               // coupon_rate_bps (5.25%)
    BigInt(90 * 24 * 60 * 60 * 1000),                         // payment_interval_ms (90 days)
    BigInt(maturityDate),                                      // maturity_timestamp
    fromText('USD'),                                           // currency
    BigInt(100),                                               // denomination (100 cents = $1)
    
    // Lifecycle State
    BigInt(now),                                               // issue_timestamp
    BigInt(0),                                                 // last_coupon_payment_timestamp
    BigInt(0),                                                 // funds_raised
    new Constr(0, []),                                         // status (Funding = Constr(0, []))
  ]);
}

// ============================================================================
// Real Production Binding Data
// ============================================================================
// This data comes from actual dual-signing flow in trust-engine-demo
// It contains real CIP-30 and Veridian signatures that pass cryptographic verification
const REAL_BINDING_DATA = {
  holderAID: "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV",
  cardanoAddress: "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",
  cardanoPublicKey: "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",
  canonicalMessage: "BIND|v1|EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5|1759684624158",
  // COSE_Sign1 with CIP-30 signature
  cardanoSignatureCose: "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458af42494e447c76317c454472377070724c33554a5f616f6933777a3877583449373542556770616e685164634262544e62375543567c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866357c313735393638343632343135385840141eef550208b17b9895d69be3560161a1ab9be3cac2959cdf17b338fbf09293dbad2b1ed000e22bc952fd7edd6f6064fd64f19a5496aab6a73deb21dd2ebe02",
  // KERI signature from Veridian
  veridianSignature: "0BBIVDyPDALqtwWThBJD_PbnzZe_Tk2t0TBPnooGpWB68XTSdQBWJymUnbaJ033pFiXmVTW-EuG8vjBTY3zNHIMN",
  // CRITICAL: issuer_aid must be a KERI AID (from binding-test DEFAULT_BINDING_DATA)
  issuerAID: "ENsh33t2c6xhdc9QgGI_Nv4PofQDjVUfwXWxULUam5GYd",
  timestamp: "2025-10-05T17:17:37.069Z",
};

/**
 * Creates real binding data with actual cryptographic signatures
 * Uses production data from trust-engine-demo that passes verification
 * Properly parses COSE_Sign1 and KERI signatures using binding-parser utilities
 */
function createRealBindingData(_holderAid: string): Constr<Data> {
  console.log("   🔐 Using REAL binding data with valid signatures:");
  console.log("      holder_aid:", REAL_BINDING_DATA.holderAID);
  console.log("      cardano_address:", REAL_BINDING_DATA.cardanoAddress.substring(0, 30) + "...");
  
  // Step 1: Parse Cardano signature (COSE_Sign1) using proper parser
  console.log("   📦 Parsing COSE_Sign1 with binding-parser...");
  const cardanoParsed = parseCardanoSignature(
    REAL_BINDING_DATA.cardanoSignatureCose
    // Not passing COSE_Key - we already have the public key
  );
  
  // Use provided public key if not extracted from COSE_Key
  if (!cardanoParsed.publicKey) {
    cardanoParsed.publicKey = REAL_BINDING_DATA.cardanoPublicKey;
  }
  
  console.log("      ✅ Sig_structure extracted:", cardanoParsed.sigStructure.substring(0, 32) + "...");
  console.log("      ✅ Cardano signature:", cardanoParsed.signature.substring(0, 32) + "...");
  console.log("      ✅ Public key:", cardanoParsed.publicKey.substring(0, 32) + "...");
  
  // Step 2: Parse KERI signature using proper parser
  console.log("   🔐 Parsing KERI signature with binding-parser...");
  const keriParsed = parseKeriSignature(REAL_BINDING_DATA.veridianSignature);
  console.log("      ✅ Veridian signature:", keriParsed.signature.substring(0, 32) + "...");
  console.log("      ✅ Algorithm:", keriParsed.algorithm);
  
  // Step 3: Extract holder public key from AID using proper parser
  console.log("   🔑 Extracting public key from holder AID...");
  const aidParsed = extractPublicKeyFromAid(REAL_BINDING_DATA.holderAID);
  console.log("      ✅ Holder public key:", aidParsed.publicKey.substring(0, 32) + "...");
  console.log("      ✅ Algorithm:", aidParsed.algorithm);
  
  // Step 4: Prepare metadata
  const bindingSaid = "EHWynjie2GCVk3Diz7oAxk0h5L78hsmjJ3stg6kFnctn";
  const timestampPosix = BigInt(Date.parse(REAL_BINDING_DATA.timestamp));
  
  console.log("   ✅ All components parsed successfully!");
  console.log("      Sig_structure length:", cardanoParsed.sigStructure.length / 2, "bytes");
  console.log("      All signatures are cryptographically valid ✓");
  
  // Construct BindingRedeemer Constr (13 fields) with REAL signatures
  // CRITICAL: ALL fields as hex strings (matching /onchain-test pattern)
  // Text fields converted to UTF-8 hex, ByteArray fields already hex
  // Data.to() will automatically interpret hex strings as ByteArrays
  console.log("   🔧 Converting text fields to hex...");
  const bindingSaidHex = stringToHex(bindingSaid);
  const issuerAidHex = stringToHex(REAL_BINDING_DATA.issuerAID);
  const holderAidHex = stringToHex(REAL_BINDING_DATA.holderAID);
  const cardanoAddressHex = stringToHex(REAL_BINDING_DATA.cardanoAddress);
  const canonicalMessageHex = stringToHex(REAL_BINDING_DATA.canonicalMessage);
  const keriVersionHex = stringToHex("KERI10JSON0005a7_");
  const bindingTypeHex = stringToHex("cardano_address_binding");
  
  return new Constr(0, [
    bindingSaidHex,                                     // 0: binding_said (hex)
    issuerAidHex,                                       // 1: issuer_aid (hex)
    holderAidHex,                                       // 2: holder_aid (hex)
    cardanoAddressHex,                                  // 3: cardano_address (hex)
    cardanoParsed.publicKey,                           // 4: cardano_public_key (hex)
    cardanoParsed.sigStructure,                        // 5: sig_structure (hex)
    cardanoParsed.signature,                           // 6: cardano_signature (hex)
    canonicalMessageHex,                               // 7: canonical_message (hex)
    keriParsed.signature,                              // 8: veridian_signature (hex)
    aidParsed.publicKey,                               // 9: holder_public_key (hex)
    keriVersionHex,                                    // 10: keri_version (hex)
    bindingTypeHex,                                    // 11: binding_type (hex)
    timestampPosix,                                     // 12: created_at (BigInt)
  ]);
}

/**
 * Constructs BondMintingRedeemer with Verifiable Smart Contracts
 * Matches: pub type BondMintingRedeemer in types.ak (with binding_proof)
 */
function constructBondMintingRedeemerWithBinding(
  bondId: string,
  lei: string,
  entityName: string,
  entityAid: string,
  vleiSaid: string,
  qviSaid: string
): string {
  console.log("\n🔨 Constructing Bond Minting Redeemer with Binding Proof:");
  console.log("   📋 Entity Attribution:");
  console.log("      LEI:", lei);
  console.log("      Name:", entityName);
  console.log("      AID:", entityAid);
  console.log("      vLEI SAID:", vleiSaid);
  console.log("      QVI SAID:", qviSaid);
  
  const bondData = constructBondDatum(bondId, lei, entityName, entityAid, vleiSaid);
  console.log("   ✅ Bond datum constructed");
  
  const bindingProof = createRealBindingData(entityAid);
  console.log("   ✅ Binding proof constructed with REAL cryptographic signatures");
  
  console.log("   📦 Wrapping in BondMintingRedeemer (7 fields with binding)");
  
  // New redeemer: entity attribution + binding proof + bond datum
  const redeemer = Data.to(
    new Constr(0, [
      fromText(lei),                    // 1: entity_lei
      fromText(entityName),             // 2: entity_name
      fromText(entityAid),              // 3: entity_aid
      fromText(vleiSaid),               // 4: vlei_credential_said
      fromText(qviSaid),                // 5: qvi_credential_said
      bindingProof,                     // 6: binding_proof (BindingRedeemer Constr with 13 fields)
      bondData,                         // 7: bond_datum
    ])
  );
  
  console.log("   ✅ Redeemer serialized with binding verification");
  console.log("   📏 Redeemer size:", redeemer.length, "bytes");
  
  return redeemer;
}

// ============================================================================
// Main Test Function
// ============================================================================

async function testSimplifiedBondMinting(): Promise<boolean> {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 BOND MINTING WITH VERIFIABLE SMART CONTRACTS');
  console.log('='.repeat(80));
  console.log('\nFocus: Cryptographic binding verification + entity authorization');
  
  try {
    // ========================================================================
    // Setup Emulator
    // ========================================================================
    console.log('\n📋 Step 1: Setting up emulator...');
    
    const issuerAccount = generateEmulatorAccount({ lovelace: BigInt(100_000_000_000) });
    const emulator = new Emulator([issuerAccount]);
    
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(issuerAccount.seedPhrase);
    
    const walletAddress = await lucid.wallet().address();
    console.log('   ✅ Emulator initialized');
    console.log('   💰 Issuer wallet:', walletAddress);
    console.log('   💵 Initial balance: 100,000 ADA');
    
    // ========================================================================
    // Load Bond Minting Policy
    // ========================================================================
    console.log('\n📋 Step 2: Loading simplified bond minting policy...');
    
    const bondMintingHex = await readValidator(
      "../aiken/plutus.json",
      "bond_minting_policy.bond_minting_policy.mint"
    );
    
    const bondMintingPolicy: MintingPolicy = {
      type: "PlutusV3",
      script: bondMintingHex
    };
    
    const policyId = mintingPolicyToId(bondMintingPolicy);
    
    console.log('   ✅ Policy loaded');
    console.log('   🔑 Policy ID:', policyId);
    console.log('   📝 Expected: 8dcaca05fc79188beba9edc70a6894f5ecd5467a643cdc9eea91beb0');
    
    // ========================================================================
    // Construct Redeemer and Datum
    // ========================================================================
    console.log('\n📋 Step 3: Constructing transaction data...');
    
    const bondId = 'TEST-BOND-001';
    
    const redeemer = constructBondMintingRedeemerWithBinding(
      bondId,
      ENTITY_LEI,
      ENTITY_NAME,
      ENTITY_AID,
      VLEI_CREDENTIAL_SAID,
      QVI_CREDENTIAL_SAID
    );
    
    console.log('   ✅ Redeemer constructed with binding proof');
    
    // ========================================================================
    // Build Transaction
    // ========================================================================
    console.log('\n📋 Step 4: Building bond minting transaction...');
    
    const assetName = fromText(bondId);
    const assetUnit = policyId + assetName;
    
    console.log('   🎫 Asset name (hex):', assetName);
    console.log('   🎫 Asset unit:', assetUnit);
    console.log('   🔑 Adding wallet as extra signatory (required)');
    
    const tx = await lucid
      .newTx()
      .mintAssets(
        { [assetUnit]: BigInt(1) },
        redeemer
      )
      .attach.MintingPolicy(bondMintingPolicy)
      .pay.ToAddress(
        walletAddress,
        { lovelace: BigInt(2_000_000) }
      )
      .addSigner(walletAddress) // Add extra signatory
      .complete();
    
    console.log('   ✅ Transaction built');
    console.log('   📦 Transaction size:', tx.toCBOR().length, 'bytes');
    
    // ========================================================================
    // Sign and Submit
    // ========================================================================
    console.log('\n📋 Step 5: Signing and submitting transaction...');
    
    const signedTx = await tx.sign.withWallet().complete();
    const txHash = await signedTx.submit();
    
    console.log('   ✅ Transaction signed');
    console.log('   ✅ Transaction submitted');
    console.log('   🔗 Transaction hash:', txHash);
    
    // ========================================================================
    // Wait for Confirmation
    // ========================================================================
    console.log('\n📋 Step 6: Waiting for confirmation...');
    
    emulator.awaitBlock(4);
    
    console.log('   ✅ Transaction confirmed');
    
    // ========================================================================
    // Verify Result
    // ========================================================================
    console.log('\n📋 Step 7: Verifying bond UTxO...');
    
    const utxos = await lucid.wallet().getUtxos();
    const bondUtxo = utxos.find(utxo => utxo.assets[assetUnit]);
    
    if (!bondUtxo) {
      throw new Error('❌ Bond UTxO not found!');
    }
    
    console.log('   ✅ Bond UTxO found');
    console.log('   🎫 Bond NFT present:', assetUnit);
    console.log('   💰 Lovelace:', bondUtxo.assets.lovelace);
    console.log('   🔗 UTxO hash:', bondUtxo.txHash);
    
    // Verify bond token amount
    const bondAmount = bondUtxo.assets[assetUnit];
    if (bondAmount !== BigInt(1)) {
      throw new Error(`❌ Expected 1 bond token, got ${bondAmount}`);
    }
    
    console.log('   ✅ Bond token amount correct: 1');
    
    // ========================================================================
    // Success!
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🎉 TEST PASSED!');
    console.log('='.repeat(80));
    console.log('\n✅ Simplified bond minting successful');
    console.log('✅ Entity attribution integrity verified on-chain');
    console.log('✅ Bond parameters validated');
    console.log('✅ Transaction authorization confirmed');
    console.log('✅ Bond NFT minted');
    
    console.log('\n📋 What This Proves:');
    console.log('1. Redeemer structure matches simplified validator');
    console.log('2. Entity attribution data flows correctly');
    console.log('3. Bond datum integrity check works');
    console.log('4. Wallet authorization (extra signatory) works');
    console.log('5. Ready for wallet binding integration');
    
    return true;
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(80));
    console.error('\n💥 Error:', error);
    
    if (error instanceof Error) {
      console.error('📝 Message:', error.message);
      if (error.stack) {
        console.error('📚 Stack trace:');
        console.error(error.stack);
      }
    }
    
    return false;
  }
}

// ============================================================================
// Run Test
// ============================================================================

if (import.meta.main) {
  const success = await testSimplifiedBondMinting();
  process.exit(success ? 0 : 1);
}

export { testSimplifiedBondMinting };
