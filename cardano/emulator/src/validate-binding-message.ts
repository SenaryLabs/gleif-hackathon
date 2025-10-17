/**
 * KERI-Cardano Binding Validator Emulator Test
 * 
 * This test validates the binding validator with realistic test data:
 * 1. Real Cardano COSE_Sign1 signature (from CIP-8 test)
 * 2. KERI signature using deterministic pattern from keri_tests.ak
 * 3. Complete BindingRedeemer with all 13 fields in correct order
 * 
 * Success criteria:
 * - Parser extracts all components correctly
 * - Field lengths match expectations
 * - Both signatures verify on-chain
 * - Transaction completes successfully
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
import { 
  buildBindingRedeemer,
  validateBindingRedeemer,
  type BindingMessage 
} from "./binding-parser.ts";

console.log("🔐 KERI-Cardano Binding Validator Emulator Test");
console.log("=".repeat(80));

/**
 * Create test binding message with:
 * 1. Real Cardano COSE_Sign1 (from CIP-8 test - proven to work)
 * 2. KERI signature (using deterministic pattern)
 * 3. All required fields for BindingRedeemer
 */
function createTestBindingMessage(): BindingMessage {
  // ============================================================================
  // Real Cardano COSE_Sign1 from successful CIP-8 test
  // ============================================================================
  // This is proven to work on-chain (from validate-cip8-sigstructure.ts)
  const cardanoCoseSign1 = "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f4581a48656c6c6f204349502d382056616c696461746f722054657374584099acd45bf7a27e6804d884e8dc94b721e41be570696d6aad9a1aa8f636b9a716d7c5726b4de6efa22b6b593b69a4688c3013ab6c6d41b7f8e2b9a33eaeecfa09";
  
  // COSE_Key with public key (field -2)
  const cardanoCoseKey = "a4010103272006215820eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2";
  
  // ============================================================================
  // KERI signature and AID (using deterministic pattern)
  // ============================================================================
  // Real KERI signature from anchor data:
  // "0BA3jnHR0UjwZrKLkxOK4ZsJ7ve0ESQojyfPTbvohAe_M70WOVkROMlTPS4JabkKYrBSL-8LG5s9xxPKuJ5dJD4M"
  
  // Holder AID from anchor data
  const holderAid = "EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV";
  
  // KERI signature from real anchor data
  const veridianSignature = "0BA3jnHR0UjwZrKLkxOK4ZsJ7ve0ESQojyfPTbvohAe_M70WOVkROMlTPS4JabkKYrBSL-8LG5s9xxPKuJ5dJD4M";
  
  // ============================================================================
  // Canonical message
  // ============================================================================
  const canonicalMessage = "BIND|v1|EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5|1759521041060";
  
  // ============================================================================
  // Assemble complete binding message
  // ============================================================================
  return {
    v: "KERI10JSON0005a7_",
    t: "cardano_address_binding",
    issuer: "ENsh33t2c6xhdc9QgGI_Nv4PofQDjVUfwWxULUam5GYd",
    holder: holderAid,
    cardanoAddress: "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",
    cardanoPublicKey: cardanoCoseKey,  // COSE_Key (parser will extract public key)
    canonicalMessage: canonicalMessage,
    signature: {
      cardano: cardanoCoseSign1,
      veridian: veridianSignature
    },
    createdAt: "2025-10-03T19:51:20.518Z",
    d: "EHWynjie2GCVk3Diz7oAxk0h5L78hsmjJ3stg6kFnctn"
  };
}

/**
 * Main test function
 */
async function testBindingValidator() {
  try {
    console.log("\n📋 Step 1: Create Test Binding Message");
    console.log("-".repeat(80));
    
    const bindingMessage = createTestBindingMessage();
    console.log("✅ Test binding message created");
    console.log(`   Holder AID: ${bindingMessage.holder}`);
    console.log(`   Cardano Address: ${bindingMessage.cardanoAddress.substring(0, 20)}...`);
    console.log(`   KERI Signature: ${bindingMessage.signature.veridian.substring(0, 20)}...`);
    
    // ==========================================================================
    // Step 2: Parse binding message with parser utility
    // ==========================================================================
    console.log("\n📋 Step 2: Parse Binding Message");
    console.log("-".repeat(80));
    
    const redeemer = buildBindingRedeemer(bindingMessage);
    
    console.log("✅ Binding redeemer built successfully");
    
    // Validate field lengths
    validateBindingRedeemer(redeemer);
    console.log("✅ All field lengths validated");
    
    // ==========================================================================
    // Step 3: Setup emulator
    // ==========================================================================
    console.log("\n📋 Step 3: Setup Emulator");
    console.log("-".repeat(80));
    
    const issuerAccount = generateEmulatorAccount({ lovelace: 100_000_000n });
    const holderAccount = generateEmulatorAccount({ lovelace: 50_000_000n });
    
    const emulator = new Emulator([issuerAccount, holderAccount]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(issuerAccount.seedPhrase);
    
    console.log("✅ Emulator initialized");
    console.log(`   Issuer: ${issuerAccount.address}`);
    console.log(`   Holder: ${holderAccount.address}`);
    
    // ==========================================================================
    // Step 4: Load binding validator
    // ==========================================================================
    console.log("\n📋 Step 4: Load Binding Validator");
    console.log("-".repeat(80));
    
    const plutusJson = JSON.parse(
      await Deno.readTextFile("../aiken/plutus.json")
    );
    
    interface ValidatorInfo {
      title: string;
      compiledCode: string;
      hash: string;
    }
    
    const bindingValidatorInfo = plutusJson.validators.find(
      (v: ValidatorInfo) => v.title === "binding_validator.binding_validator.spend"
    );
    
    if (!bindingValidatorInfo) {
      throw new Error("Binding validator not found in plutus.json");
    }
    
    const validator: Script = {
      type: "PlutusV3",
      script: bindingValidatorInfo.compiledCode
    };
    
    const validatorAddress = validatorToAddress("Custom", validator);
    
    console.log("✅ Binding validator loaded");
    console.log(`   Title: ${bindingValidatorInfo.title}`);
    console.log(`   Hash: ${bindingValidatorInfo.hash}`);
    console.log(`   Address: ${validatorAddress}`);
    
    // ==========================================================================
    // Step 5: Create UTxO at validator address
    // ==========================================================================
    console.log("\n📋 Step 5: Lock Funds at Validator");
    console.log("-".repeat(80));
    
    const lockTx = await lucid
      .newTx()
      .pay.ToContract(
        validatorAddress,
        { kind: "inline", value: Data.void() },
        { lovelace: 5_000_000n }
      )
      .complete();
    
    const signedLockTx = await lockTx.sign.withWallet().complete();
    const lockTxHash = await signedLockTx.submit();
    await lucid.awaitTx(lockTxHash);
    
    console.log("✅ Funds locked at validator");
    console.log(`   TX Hash: ${lockTxHash}`);
    console.log(`   Amount: 5 ADA`);
    
    // ==========================================================================
    // Step 6: Build redeemer with proper Data.to() format
    // ==========================================================================
    console.log("\n📋 Step 6: Build Plutus Redeemer");
    console.log("-".repeat(80));
    
    // CRITICAL: Field order must match types.ak exactly!
    const plutusRedeemer = Data.to(
      new Constr(0, [
        fromText(redeemer.binding_said),          // 0: binding_said
        fromText(redeemer.issuer_aid),            // 1: issuer_aid
        fromText(redeemer.holder_aid),            // 2: holder_aid
        fromText(redeemer.cardano_address),       // 3: cardano_address
        redeemer.cardano_public_key,              // 4: cardano_public_key (hex)
        redeemer.sig_structure,                   // 5: sig_structure (hex)
        redeemer.cardano_signature,               // 6: cardano_signature (hex)
        fromText(redeemer.canonical_message),     // 7: canonical_message
        redeemer.veridian_signature,              // 8: veridian_signature (hex)
        redeemer.holder_public_key,               // 9: holder_public_key (hex)
        fromText(redeemer.keri_version),          // 10: keri_version
        fromText(redeemer.binding_type),          // 11: binding_type
        redeemer.created_at                       // 12: created_at (BigInt)
      ])
    );
    
    console.log("✅ Plutus redeemer built");
    console.log("   Field Summary:");
    console.log(`   - Sig_structure: ${redeemer.sig_structure.length / 2} bytes`);
    console.log(`   - Cardano signature: ${redeemer.cardano_signature.length / 2} bytes`);
    console.log(`   - Cardano public key: ${redeemer.cardano_public_key.length / 2} bytes`);
    console.log(`   - Veridian signature: ${redeemer.veridian_signature.length / 2} bytes`);
    console.log(`   - Holder public key: ${redeemer.holder_public_key.length / 2} bytes`);
    
    // ==========================================================================
    // Step 7: Spend from validator (triggers dual signature verification)
    // ==========================================================================
    console.log("\n📋 Step 7: Spend from Validator (Verify Signatures On-Chain)");
    console.log("-".repeat(80));
    console.log("   This will verify:");
    console.log("   1. Cardano signature over Sig_structure (CIP-30)");
    console.log("   2. KERI signature over canonical message (Veridian)");
    console.log("   Both must be valid for transaction to succeed!");
    
    const utxos = await lucid.utxosAt(validatorAddress);
    
    if (utxos.length === 0) {
      throw new Error("No UTXOs found at validator address");
    }
    
    console.log(`   Found ${utxos.length} UTXO(s) at validator`);
    
    const unlockTx = await lucid
      .newTx()
      .collectFrom(utxos, plutusRedeemer)
      .attach.SpendingValidator(validator)
      .complete();
    
    console.log("✅ Transaction built");
    
    const signedUnlockTx = await unlockTx.sign.withWallet().complete();
    console.log("✅ Transaction signed");
    
    const unlockTxHash = await signedUnlockTx.submit();
    console.log("✅ Transaction submitted");
    console.log(`   TX Hash: ${unlockTxHash}`);
    
    await lucid.awaitTx(unlockTxHash);
    
    // ==========================================================================
    // Success!
    // ==========================================================================
    console.log("\n" + "=".repeat(80));
    console.log("🎉 SUCCESS! Binding Validator Test Passed!");
    console.log("=".repeat(80));
    console.log("\n✅ Validation Results:");
    console.log("   • Cardano signature verified (CIP-30 Sig_structure)");
    console.log("   • KERI signature verified (Veridian canonical message)");
    console.log("   • Dual signature verification successful");
    console.log("   • Transaction completed on-chain");
    
    console.log("\n📊 Component Summary:");
    console.log(`   • Sig_structure: ${redeemer.sig_structure.length / 2} bytes`);
    console.log(`   • Cardano signature: ${redeemer.cardano_signature.length / 2} bytes`);
    console.log(`   • Cardano public key: ${redeemer.cardano_public_key.length / 2} bytes`);
    console.log(`   • KERI signature: ${redeemer.veridian_signature.length / 2} bytes`);
    console.log(`   • Holder public key: ${redeemer.holder_public_key.length / 2} bytes`);
    
    console.log("\n🔑 Key Insights:");
    console.log("   • Parser successfully extracted Sig_structure from COSE_Sign1");
    console.log("   • KERI signature decoded from Base64URL format");
    console.log("   • Holder public key extracted from KERI AID");
    console.log("   • Field order in Constr(0, [...]) matches types.ak");
    console.log("   • Both Ed25519 signatures verified on-chain");
    
    console.log("\n🚀 Next Steps:");
    console.log("   1. Document serialization format in BINDING_SERIALIZATION.md");
    console.log("   2. Integrate parser with trust-engine-demo");
    console.log("   3. Test with real wallets (Eternal + Veridian)");
    console.log("   4. Deploy to Preprod testnet");
    
    console.log("\n" + "=".repeat(80));
    
  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ Test Failed!");
    console.error("=".repeat(80));
    
    if (error instanceof Error) {
      console.error("\n📛 Error Details:");
      console.error(`   Message: ${error.message}`);
      
      if (error.stack) {
        console.error("\n📚 Stack Trace:");
        console.error(error.stack);
      }
    } else {
      console.error("\n📛 Error:", error);
    }
    
    console.error("\n💡 Debugging Tips:");
    console.error("   1. Check that plutus.json is up to date (aiken build)");
    console.error("   2. Verify parser extracted all components correctly");
    console.error("   3. Confirm field lengths match expectations");
    console.error("   4. Ensure field order matches types.ak exactly");
    console.error("   5. Check validator logs for specific signature verification failure");
    
    console.error("\n🔍 Common Issues:");
    console.error("   • Sig_structure length mismatch (should be ~113 bytes)");
    console.error("   • Field order in Constr doesn't match types.ak");
    console.error("   • Public key or signature wrong length (32/64 bytes)");
    console.error("   • KERI signature not properly decoded from Base64URL");
    
    Deno.exit(1);
  }
}

// ============================================================================
// Run the test
// ============================================================================

if (import.meta.main) {
  await testBindingValidator();
}
