/**
 * Minimal Binding Verification Test
 * 
 * Tests ONLY the binding validator with real signatures
 * to isolate signature verification from bond minting complexity
 */

import { 
  Lucid, 
  generateEmulatorAccount, 
  Emulator, 
  Data,
  Constr,
  fromText,
  Script,
  validatorToAddress,
} from "@evolution-sdk/lucid";
import { readValidator } from "./utils.ts";
import { 
  parseCardanoSignature,
  parseKeriSignature,
  extractPublicKeyFromAid,
} from "./binding-parser.ts";

// Real binding data from trust-engine-demo
const REAL_BINDING_DATA = {
  holderAID: "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV",
  cardanoAddress: "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",
  cardanoPublicKey: "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",
  canonicalMessage: "BIND|v1|EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5|1759684624158",
  cardanoSignatureCose: "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458af42494e447c76317c454472377070724c33554a5f616f6933777a3877583449373542556770616e685164634262544e62375543567c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866357c313735393638343632343135385840141eef550208b17b9895d69be3560161a1ab9be3cac2959cdf17b338fbf09293dbad2b1ed000e22bc952fd7edd6f6064fd64f19a5496aab6a73deb21dd2ebe02",
  veridianSignature: "0BBIVDyPDALqtwWThBJD_PbnzZe_Tk2t0TBPnooGpWB68XTSdQBWJymUnbaJ033pFiXmVTW-EuG8vjBTY3zNHIMN",
  issuerAID: "principia-issuer",
  timestamp: "2025-10-05T17:17:37.069Z",
};

function createBindingRedeemer(): Constr<Data> {
  console.log("\n🔐 Parsing real binding signatures...");
  
  // Parse Cardano signature
  const cardanoParsed = parseCardanoSignature(REAL_BINDING_DATA.cardanoSignatureCose);
  if (!cardanoParsed.publicKey) {
    cardanoParsed.publicKey = REAL_BINDING_DATA.cardanoPublicKey;
  }
  
  console.log("   ✅ Cardano sig_structure:", cardanoParsed.sigStructure.substring(0, 32) + "...");
  console.log("   ✅ Cardano signature:", cardanoParsed.signature.substring(0, 32) + "...");
  console.log("   ✅ Cardano public key:", cardanoParsed.publicKey.substring(0, 32) + "...");
  
  // Parse KERI signature
  const keriParsed = parseKeriSignature(REAL_BINDING_DATA.veridianSignature);
  console.log("   ✅ Veridian signature:", keriParsed.signature.substring(0, 32) + "...");
  
  // Extract holder public key
  const aidParsed = extractPublicKeyFromAid(REAL_BINDING_DATA.holderAID);
  console.log("   ✅ Holder public key:", aidParsed.publicKey.substring(0, 32) + "...");
  
  const bindingSaid = "EHWynjie2GCVk3Diz7oAxk0h5L78hsmjJ3stg6kFnctn";
  const timestampPosix = BigInt(Date.parse(REAL_BINDING_DATA.timestamp));
  
  console.log("\n📦 Constructing BindingRedeemer (13 fields):");
  console.log("   Field order matches types.ak exactly");
  console.log("   Text fields use fromText(), ByteArrays are raw hex");

  console.log("   ✅ Cardano public key:", cardanoParsed.publicKey);
  
  return new Constr(0, [
    fromText(bindingSaid),                              // 0: binding_said
    fromText(REAL_BINDING_DATA.issuerAID),             // 1: issuer_aid
    fromText(REAL_BINDING_DATA.holderAID),             // 2: holder_aid
    fromText(REAL_BINDING_DATA.cardanoAddress),        // 3: cardano_address
    cardanoParsed.publicKey,                           // 4: cardano_public_key (32 bytes hex)
    cardanoParsed.sigStructure,                        // 5: sig_structure (262 bytes hex)
    cardanoParsed.signature,                           // 6: cardano_signature (64 bytes hex)
    fromText(REAL_BINDING_DATA.canonicalMessage),      // 7: canonical_message
    keriParsed.signature,                              // 8: veridian_signature (64 bytes hex)
    aidParsed.publicKey,                               // 9: holder_public_key (32 bytes hex)
    fromText("KERI10JSON0005a7_"),                     // 10: keri_version
    fromText("cardano_address_binding"),               // 11: binding_type
    timestampPosix,                                     // 12: created_at
  ]);
}

async function testBindingOnly() {
  console.log("================================================================================");
  console.log("🧪 MINIMAL BINDING VERIFICATION TEST");
  console.log("================================================================================");
  console.log("\nFocus: Isolate binding signature verification from bond minting\n");
  
  try {
    // Setup emulator
    console.log("📋 Step 1: Setting up emulator...");
    const accounts = [generateEmulatorAccount({ lovelace: BigInt(100_000_000_000) })];
    const emulator = new Emulator(accounts);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(accounts[0].seedPhrase);
    console.log("   ✅ Emulator initialized");
    console.log("   💰 Test wallet:", await lucid.wallet().address());
    
    // Load binding validator
    console.log("\n📋 Step 2: Loading binding validator...");
    const validatorCode = await readValidator(
      "../aiken/plutus.json",
      "binding_validator.binding_validator.spend"
    );
    const validator: Script = {
      type: "PlutusV3",
      script: validatorCode
    };
    console.log("   ✅ Validator loaded");
    
    const network = lucid.config().network;
    if (!network) throw new Error("Network not configured");
    const validatorAddress = validatorToAddress(network, validator);
    console.log("   📍 Validator address:", validatorAddress);
    
    // Create redeemer
    console.log("\n📋 Step 3: Creating binding redeemer with REAL signatures...");
    const redeemer = createBindingRedeemer();
    const redeemerSerialized = Data.to(redeemer);
    console.log("   ✅ Redeemer serialized");
    console.log("   📏 Redeemer size:", redeemerSerialized.length, "bytes");
    
    // Create a UTxO at validator to spend
    console.log("\n📋 Step 4: Creating UTxO at validator...");
    const datum = Data.to(new Constr(0, [])); // Empty datum
    const tx1 = await lucid
      .newTx()
      .pay.ToContract(validatorAddress, { kind: "inline", value: datum }, { lovelace: BigInt(10_000_000) })
      .complete();
    
    const signedTx1 = await tx1.sign.withWallet().complete();
    const txHash1 = await signedTx1.submit();
    console.log("   ✅ UTxO created");
    console.log("   🔗 Tx hash:", txHash1);
    
    emulator.awaitBlock(1);
    
    // Try to spend with binding verification
    console.log("\n📋 Step 5: Spending with binding verification...");
    console.log("   This will test verify_binding() with real signatures");
    
    const utxos = await lucid.utxosAt(validatorAddress);
    if (utxos.length === 0) throw new Error("No UTxOs found at validator");
    
    const tx2 = await lucid
      .newTx()
      .collectFrom(utxos, redeemerSerialized)
      .attach.SpendingValidator(validator)
      .complete();
    
    const signedTx2 = await tx2.sign.withWallet().complete();
    const txHash2 = await signedTx2.submit();
    
    console.log("\n================================================================================");
    console.log("✅ TEST PASSED!");
    console.log("================================================================================");
    console.log("\n🎉 Binding verification successful!");
    console.log("   🔗 Spend tx hash:", txHash2);
    console.log("\n✓ Both signatures verified on-chain:");
    console.log("  - Cardano wallet signature (CIP-30 over sig_structure)");
    console.log("  - KERI/Veridian signature (Ed25519 over canonical message)");
    
  } catch (error) {
    console.log("\n================================================================================");
    console.log("❌ TEST FAILED!");
    console.log("================================================================================");
    console.log("\n💥 Error:", error);
    console.log("📝 Message:", (error as Error).message);
    if ((error as Error).stack) {
      console.log("📚 Stack trace:");
      console.log((error as Error).stack);
    }
    Deno.exit(1);
  }
}

testBindingOnly();
