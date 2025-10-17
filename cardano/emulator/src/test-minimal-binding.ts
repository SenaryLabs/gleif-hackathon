/**
 * Minimal Binding Validator Test - 3-Field Tuple
 * 
 * This test uses the EXACT same signatures as the failing test,
 * but with the simpler minimal_binding validator that uses a 3-tuple
 * instead of the complex 13-f    console.log(`   ✅ Public key: ${aidParsed.publicKey.substring(0, 32)}... (32 bytes)`);
    console.log(`   ✅ Message: ${canonicalMessageHex.substring(0, 32)}... (${canonicalMessageHex.length / 2} bytes)`);
    console.log(`   ✅ Signature: ${keriParsed.signature.substring(0, 32)}... (64 bytes)`);
    
    // Use the same schema as Test 1
    const MinimalBindingRedeemerSchema = Data.Tuple([
      Data.Bytes(),  // public_key
      Data.Bytes(),  // message
      Data.Bytes(),  // signature
    ]);
    
    type MinimalBindingRedeemer = Data.Static<typeof MinimalBindingRedeemerSchema>;
    const MinimalBindingRedeemer = MinimalBindingRedeemerSchema as unknown as MinimalBindingRedeemer;
    
    const redeemerData: MinimalBindingRedeemer = [
      aidParsed.publicKey,
      canonicalMessageHex,
      keriParsed.signature,
    ];
    
    const redeemerSerialized = Data.to(redeemerData, MinimalBindingRedeemer);
    console.log(`   ✅ Redeemer serialized: ${redeemerSerialized.length} bytes`);gRedeemer.
 * 
 * If this PASSES: The signatures are valid, the issue is with the 13-field structure
 * If this FAILS: The signatures themselves are invalid
 */

import { 
  Lucid, 
  generateEmulatorAccount, 
  Emulator,
  Data,
  toHex,
  Script,
  validatorToAddress,
  Constr,
} from "@evolution-sdk/lucid";
import { readValidator } from "./utils.ts";
import {
  parseKeriSignature,
  extractPublicKeyFromAid,
} from "./binding-parser.ts";

// Utility: Convert string to hex
function stringToHex(str: string): string {
  return toHex(new TextEncoder().encode(str));
}

// FRESH BINDING DATA - Generated 2025-10-06 (BOTH signatures over SAME canonical message!)
const REAL_BINDING_DATA = {
  holderAID: "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV",
  cardanoPublicKey: "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",
  cardanoSignature: "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458af42494e447c76317c454472377070724c33554a5f616f6933777a3877583449373542556770616e685164634262544e62375543567c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866357c313735393738353730313834395840b6523b9ecbf8f650532e761b825f467e15c5f5becebc2363242f1fce2eebea0b27a5bd66a301ed7cf3e4e5a635ba6be92bacc45dfd603d6f46f1d6bd417ebb0b",
  canonicalMessage: "BIND|v1|EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5|1759785701849",
  veridianSignature: "0BBk25WRv3Ht_P5t-I_VZMTl-QEe3BOQRb89neeps3k2iYC0_-fxy9tx6_V0obJ-Boc3kA9OSCVNZ1TIRaOdJmwJ",
};

/**
 * Test minimal_binding validator with CARDANO signature
 */
async function testMinimalBindingWithCardano() {
  console.log("================================================================================");
  console.log("🧪 TEST 1: MINIMAL_BINDING WITH CARDANO SIGNATURE");
  console.log("================================================================================");
  console.log("\nValidator: minimal_binding (3-tuple)");
  console.log("Signature: Cardano wallet (CIP-30)");
  console.log("Expected: PASS if Cardano signature is valid\n");
  
  try {
    // Setup emulator
    console.log("📋 Setting up emulator...");
    const accounts = [generateEmulatorAccount({ lovelace: BigInt(100_000_000_000) })];
    const emulator = new Emulator(accounts);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(accounts[0].seedPhrase);
    console.log("   ✅ Emulator ready");
    
    // Load minimal_binding validator
    console.log("\n📋 Loading minimal_binding validator...");
    const validatorCode = await readValidator(
      "../aiken/plutus.json",
      "minimal_binding.minimal_binding.spend"
    );
    const validator: Script = {
      type: "PlutusV3",
      script: validatorCode
    };
    const network = lucid.config().network;
    if (!network) throw new Error("Network not configured");
    const validatorAddress = validatorToAddress(network, validator);
    console.log("   ✅ Validator loaded");
    console.log("   📍 Address:", validatorAddress);
    
    // Build 3-field redeemer: (public_key, message, signature)
    console.log("\n📋 Building 3-field redeemer for Cardano signature...");
    
    // Extract sig_structure from COSE_Sign1 using cbor (EXACT pattern from validate-cip8)
    const cborModule = await import("cbor-x");
    const { decode, encode } = cborModule;
    const { Buffer } = await import("node:buffer");
    
    const coseBytes = new Uint8Array(
      REAL_BINDING_DATA.cardanoSignature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    const [
      protectedHeader,
      _unprotectedHeader,
      payload,
      signature
    ] = decode(coseBytes);
    
    // Reconstruct Sig_structure per RFC 8152 (MUST use Buffer for consistent CBOR encoding!)
    const sigStructure = [
      "Signature1",                                              // context string
      Buffer.isBuffer(protectedHeader) 
        ? protectedHeader 
        : Buffer.from(protectedHeader || []),                   // protected headers
      Buffer.from([]),                                          // external_aad (empty per CIP-30)
      Buffer.isBuffer(payload) 
        ? payload 
        : Buffer.from(payload)                                  // message payload
    ];
    
    const sigStructureBytes = encode(sigStructure);
    const sigStructureBuffer = Buffer.isBuffer(sigStructureBytes)
      ? sigStructureBytes
      : Buffer.from(sigStructureBytes);
    const sigStructureHex = sigStructureBuffer.toString('hex');
    
    const cardanoSignature64bytes = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log(`\n🔍 VERIFICATION DATA:`);
    console.log(`   Public key: ${REAL_BINDING_DATA.cardanoPublicKey}`);
    console.log(`   Signature:  ${cardanoSignature64bytes}`);
    console.log(`   Message (sig_structure, ${sigStructureHex.length / 2} bytes):`);
    console.log(`   ${sigStructureHex}`);
    
    // CRITICAL: For Aiken tuples, we need to use Data.Tuple with proper schema
    // The schema tells Lucid that hex strings should be interpreted as ByteArray
    const MinimalBindingRedeemerSchema = Data.Tuple([
      Data.Bytes(),  // public_key (32 bytes)
      Data.Bytes(),  // message (sig_structure)
      Data.Bytes(),  // signature (64 bytes)
    ]);
    
    type MinimalBindingRedeemer = Data.Static<typeof MinimalBindingRedeemerSchema>;
    const MinimalBindingRedeemer = MinimalBindingRedeemerSchema as unknown as MinimalBindingRedeemer;
    
    // Build redeemer with hex strings - schema will convert them to bytes
    const redeemerData: MinimalBindingRedeemer = [
      REAL_BINDING_DATA.cardanoPublicKey,
      sigStructureHex,
      cardanoSignature64bytes,
    ];
    
    const redeemerSerialized = Data.to(redeemerData, MinimalBindingRedeemer);
    console.log(`   ✅ Redeemer serialized: ${redeemerSerialized.length} bytes`);
    
    // Create and spend UTxO
    console.log("\n📋 Creating UTxO at validator...");
    const datum = Data.to(new Constr(0, []));
    const tx1 = await lucid
      .newTx()
      .pay.ToContract(validatorAddress, { kind: "inline", value: datum }, { lovelace: BigInt(10_000_000) })
      .complete();
    
    const signedTx1 = await tx1.sign.withWallet().complete();
    const txHash1 = await signedTx1.submit();
    console.log("   ✅ UTxO created:", txHash1);
    
    emulator.awaitBlock(1);
    
    console.log("\n📋 Spending with Cardano signature verification...");
    const utxos = await lucid.utxosAt(validatorAddress);
    
    const tx2 = await lucid
      .newTx()
      .collectFrom(utxos, redeemerSerialized)
      .attach.SpendingValidator(validator)
      .complete();
    
    const signedTx2 = await tx2.sign.withWallet().complete();
    const txHash2 = await signedTx2.submit();
    
    console.log("\n✅ TEST 1 PASSED!");
    console.log("   🔗 Tx hash:", txHash2);
    console.log("   💡 Cardano signature is VALID!");
    
  } catch (error) {
    console.log("\n❌ TEST 1 FAILED!");
    console.log("   💥 Error:", (error as Error).message);
    throw error;
  }
}

/**
 * Test minimal_binding validator with VERIDIAN signature
 */
async function testMinimalBindingWithVeridian() {
  console.log("\n\n================================================================================");
  console.log("🧪 TEST 2: MINIMAL_BINDING WITH VERIDIAN SIGNATURE");
  console.log("================================================================================");
  console.log("\nValidator: minimal_binding (3-tuple)");
  console.log("Signature: Veridian wallet (KERI)");
  console.log("Expected: PASS if Veridian signature is valid\n");
  
  try {
    // Setup emulator
    console.log("📋 Setting up emulator...");
    const accounts = [generateEmulatorAccount({ lovelace: BigInt(100_000_000_000) })];
    const emulator = new Emulator(accounts);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(accounts[0].seedPhrase);
    console.log("   ✅ Emulator ready");
    
    // Load minimal_binding validator
    console.log("\n📋 Loading minimal_binding validator...");
    const validatorCode = await readValidator(
      "../aiken/plutus.json",
      "minimal_binding.minimal_binding.spend"
    );
    const validator: Script = {
      type: "PlutusV3",
      script: validatorCode
    };
    const network = lucid.config().network;
    if (!network) throw new Error("Network not configured");
    const validatorAddress = validatorToAddress(network, validator);
    console.log("   ✅ Validator loaded");
    
    // Build 3-field redeemer: (public_key, message, signature)
    console.log("\n📋 Building 3-field redeemer for Veridian signature...");
    const keriParsed = parseKeriSignature(REAL_BINDING_DATA.veridianSignature);
    const aidParsed = extractPublicKeyFromAid(REAL_BINDING_DATA.holderAID);
    const canonicalMessageHex = stringToHex(REAL_BINDING_DATA.canonicalMessage);
    
    console.log(`   ✅ Public key: ${aidParsed.publicKey.substring(0, 32)}... (32 bytes)`);
    console.log(`   ✅ Message: ${canonicalMessageHex.substring(0, 32)}... (${canonicalMessageHex.length / 2} bytes)`);
    console.log(`   ✅ Signature: ${keriParsed.signature.substring(0, 32)}... (64 bytes)`);
    
    // CRITICAL: Tuples in Aiken serialize as LISTS, not Constr!
    const redeemerSerialized = Data.to([
      aidParsed.publicKey,        // public_key (32 bytes from holder AID)
      canonicalMessageHex,        // message (canonical message)
      keriParsed.signature,       // signature (64 bytes)
    ]);
    console.log(`   ✅ Redeemer serialized: ${redeemerSerialized.length} bytes`);
    
    // Create and spend UTxO
    console.log("\n📋 Creating UTxO at validator...");
    const datum = Data.to(new Constr(0, []));
    const tx1 = await lucid
      .newTx()
      .pay.ToContract(validatorAddress, { kind: "inline", value: datum }, { lovelace: BigInt(10_000_000) })
      .complete();
    
    const signedTx1 = await tx1.sign.withWallet().complete();
    const txHash1 = await signedTx1.submit();
    console.log("   ✅ UTxO created:", txHash1);
    
    emulator.awaitBlock(1);
    
    console.log("\n📋 Spending with Veridian signature verification...");
    const utxos = await lucid.utxosAt(validatorAddress);
    
    const tx2 = await lucid
      .newTx()
      .collectFrom(utxos, redeemerSerialized)
      .attach.SpendingValidator(validator)
      .complete();
    
    const signedTx2 = await tx2.sign.withWallet().complete();
    const txHash2 = await signedTx2.submit();
    
    console.log("\n✅ TEST 2 PASSED!");
    console.log("   🔗 Tx hash:", txHash2);
    console.log("   💡 Veridian signature is VALID!");
    
  } catch (error) {
    console.log("\n❌ TEST 2 FAILED!");
    console.log("   💥 Error:", (error as Error).message);
    throw error;
  }
}

async function main() {
  try {
    await testMinimalBindingWithCardano();
    await testMinimalBindingWithVeridian();
    
    console.log("\n\n================================================================================");
    console.log("🎉 ALL TESTS PASSED!");
    console.log("================================================================================");
    console.log("\n💡 Both signatures are VALID!");
    console.log("   ✅ Cardano signature verifies correctly");
    console.log("   ✅ Veridian signature verifies correctly");
    console.log("\n🔍 This means the issue with binding_validator is:");
    console.log("   - The 13-field BindingRedeemer structure");
    console.log("   - Field ordering or serialization");
    console.log("   - NOT the signatures themselves!");
    
  } catch (_error) {
    console.log("\n\n================================================================================");
    console.log("💥 TEST SUITE FAILED");
    console.log("================================================================================");
    console.log("\nAt least one signature is INVALID or there's a different issue.");
    Deno.exit(1);
  }
}

main();
