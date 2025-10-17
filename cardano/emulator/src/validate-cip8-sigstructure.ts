// Validate CIP-8 Signature with Sig_structure Extraction
// This script extracts Sig_structure from a CIP-30 signData response
// and validates it against the CIP-8 validator on-chain

import { 
  Lucid, 
  generateEmulatorAccount, 
  Emulator,
  Constr,
  Data,
  toHex,
  Script,
  validatorToAddress,
} from "@evolution-sdk/lucid";
import { decode, encode } from "npm:cbor-x";
import { Buffer } from "node:buffer";

console.log("🔐 CIP-8 Sig_structure Validator Test");
console.log("=".repeat(80));

// Input data from your signData response
const testData = {
  key: "a4010103272006215820eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",
  signature: "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f4581a48656c6c6f204349502d382056616c696461746f722054657374584099acd45bf7a27e6804d884e8dc94b721e41be570696d6aad9a1aa8f636b9a716d7c5726b4de6efa22b6b593b69a4688c3013ab6c6d41b7f8e2b9a33eaeecfa09"
};

async function validateCIP8Signature() {
  try {
    // ========================================================================
    // Step 1: Extract Public Key from COSE_Key
    // ========================================================================
    console.log("\n1️⃣  Extracting Public Key from COSE_Key...");
    const keyBytes = hexToBytes(testData.key);
    const coseKey = decode(keyBytes);
    
    console.log("   COSE_Key structure:", coseKey);
    
    if (!coseKey || typeof coseKey !== 'object' || !('-2' in coseKey)) {
      throw new Error("Invalid COSE_Key: missing field -2 (public key)");
    }
    
    const publicKeyBuffer = coseKey['-2'];
    const publicKeyHex = toHex(publicKeyBuffer);
    
    console.log("✅ Extracted public key:");
    console.log("   Hex:", publicKeyHex);
    console.log("   Length:", publicKeyHex.length / 2, "bytes");
    
    // ========================================================================
    // Step 2: Parse COSE_Sign1 from signature
    // ========================================================================
    console.log("\n2️⃣  Parsing COSE_Sign1 structure...");
    const signatureBytes = hexToBytes(testData.signature);
    const coseSign1 = decode(signatureBytes);
    
    if (!Array.isArray(coseSign1) || coseSign1.length !== 4) {
      throw new Error(`Invalid COSE_Sign1: expected array of 4 elements, got ${coseSign1?.length}`);
    }
    
    const [protectedHeader, unprotectedHeader, payload, signatureComponent] = coseSign1;
    
    console.log("✅ COSE_Sign1 components:");
    console.log("   Protected Header:", toHex(protectedHeader));
    console.log("   Unprotected Header:", unprotectedHeader);
    console.log("   Payload (message):", new TextDecoder().decode(payload));
    console.log("   Signature:", toHex(signatureComponent));
    console.log("   Signature length:", signatureComponent.length, "bytes");
    
    // ========================================================================
    // Step 3: Build Sig_structure (what wallet signed) - matching web app
    // ========================================================================
    console.log("\n3️⃣  Building Sig_structure (CIP-30 standard)...");
    console.log("   Sig_structure = [\"Signature1\", protected, h'', payload]");
    
    // Convert to Buffer for consistent CBOR encoding (matches web app)
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
    
    console.log("✅ Sig_structure built:");
    console.log("   CBOR hex:", sigStructureHex);
    console.log("   Length:", sigStructureBuffer.length, "bytes");
    
    // ========================================================================
    // Step 4: Prepare validator inputs
    // ========================================================================
    console.log("\n4️⃣  Preparing validator inputs...");
    
    const fullSignatureHex = toHex(signatureComponent);
    
    console.log("✅ Validator inputs ready:");
    console.log("   Message (Sig_structure):", sigStructureHex);
    console.log("   Public Key:", publicKeyHex);
    console.log("   Signature:", fullSignatureHex);
    
    // ========================================================================
    // Step 5: Setup emulator and validator
    // ========================================================================
    console.log("\n5️⃣  Setting up emulator...");
    const account = generateEmulatorAccount({ lovelace: 100_000_000n });
    const emulator = new Emulator([account]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(account.seedPhrase);
    
    console.log("✅ Emulator setup complete");
    console.log("   Account:", account.address);
    
    // ========================================================================
    // Step 6: Load validator from plutus.json
    // ========================================================================
    console.log("\n6️⃣  Loading CIP-8 validator...");
    
    // Load the actual validator from plutus.json
    // This is the updated version without blake2b_256 hashing
    const plutusJson = JSON.parse(
      await Deno.readTextFile("../aiken/plutus.json")
    );
    
    interface ValidatorInfo {
      title: string;
      compiledCode: string;
      hash: string;
    }
    
    const cip8Validator = plutusJson.validators.find(
      (v: ValidatorInfo) => v.title === "cip8_validator.cip8_validator.spend"
    );
    
    if (!cip8Validator) {
      throw new Error("CIP-8 validator not found in plutus.json");
    }
    
    console.log("✅ Loaded validator:");
    console.log("   Title:", cip8Validator.title);
    console.log("   Hash:", cip8Validator.hash);
    
    const validator: Script = {
      type: "PlutusV3",
      script: cip8Validator.compiledCode
    };
    
    // ========================================================================
    // Step 7: Create validator address and send funds
    // ========================================================================
    console.log("\n7️⃣  Creating validator address...");
    
    const validatorAddress = validatorToAddress("Custom", validator);
    console.log("✅ Validator address:", validatorAddress);
    
    // Send some ADA to the validator
    console.log("\n   Sending 5 ADA to validator...");
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
    console.log("   TX:", lockTxHash);
    
    // ========================================================================
    // Step 8: Build redeemer and unlock with signature verification
    // ========================================================================
    console.log("\n8️⃣  Building redeemer with Sig_structure...");
    
    // Redeemer structure: { message, public_key, signature }
    const redeemer = Data.to(
      new Constr(0, [
        sigStructureHex,      // The Sig_structure (what wallet signed)
        publicKeyHex,         // Ed25519 public key (32 bytes)
        fullSignatureHex      // Ed25519 signature (64 bytes)
      ])
    );
    
    console.log("✅ Redeemer created:");
    console.log("   Message field: Sig_structure (", sigStructureBuffer.length, "bytes)");
    console.log("   Public key field:", publicKeyHex.length / 2, "bytes");
    console.log("   Signature field:", fullSignatureHex.length / 2, "bytes");
    
    // ========================================================================
    // Step 9: Spend from validator (this triggers signature verification)
    // ========================================================================
    console.log("\n9️⃣  Attempting to spend from validator...");
    console.log("   This will verify: ed25519.verify(pubkey, sig_structure, signature)");
    
    const utxos = await lucid.utxosAt(validatorAddress);
    
    if (utxos.length === 0) {
      throw new Error("No UTXOs found at validator address");
    }
    
    console.log("   Found", utxos.length, "UTXO(s) at validator");
    
    const unlockTx = await lucid
      .newTx()
      .collectFrom(utxos, redeemer)
      .attach.SpendingValidator(validator)
      .complete();
    
    const signedUnlockTx = await unlockTx.sign.withWallet().complete();
    const unlockTxHash = await signedUnlockTx.submit();
    
    console.log("✅ Transaction submitted!");
    console.log("   TX:", unlockTxHash);
    
    await lucid.awaitTx(unlockTxHash);
    
    console.log("\n" + "=".repeat(80));
    console.log("🎉 SUCCESS! Signature verified on-chain!");
    console.log("=".repeat(80));
    console.log("\n✅ Validation Results:");
    console.log("   • Sig_structure extracted correctly");
    console.log("   • Ed25519 signature verification passed");
    console.log("   • Transaction completed successfully");
    console.log("\n📊 Summary:");
    console.log("   Message (Sig_structure): " + sigStructureBuffer.length + " bytes");
    console.log("   Public Key: " + (publicKeyHex.length / 2) + " bytes");
    console.log("   Signature: " + (fullSignatureHex.length / 2) + " bytes");
    console.log("   Validator: CIP-8 with CIP-30 compliance");
    console.log("=".repeat(80));
    
  } catch (error) {
    console.error("\n❌ Validation Error:", error);
    
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      if (error.stack) {
        console.error("   Stack:", error.stack);
      }
    }
    
    console.log("\n💡 Debugging tips:");
    console.log("   1. Verify validator script is correct (from plutus.json)");
    console.log("   2. Check that Sig_structure matches CIP-30 spec");
    console.log("   3. Ensure signature is 64 bytes (Ed25519)");
    console.log("   4. Confirm public key is 32 bytes");
    
    Deno.exit(1);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string: odd length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// ============================================================================
// Run the validation
// ============================================================================

if (import.meta.main) {
  await validateCIP8Signature();
}
