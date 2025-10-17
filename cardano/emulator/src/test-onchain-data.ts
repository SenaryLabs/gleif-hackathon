// Test using EXACT data from /onchain-test UI (which we know works in the UI)
// This will use cip8_validator which DOES work in emulator

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

console.log("================================================================================");
console.log("🧪 TEST: /onchain-test Data with CIP-8 Validator");
console.log("================================================================================\n");

// EXACT data from /onchain-test UI (DEFAULT_BINDING_DATA)
const ONCHAIN_TEST_DATA = {
  cardanoPublicKey: "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",
  cardanoSignature: "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458af42494e447c76317c454472377070724c33554a5f616f6933777a3877583449373542556770616e685164634262544e62375543567c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866357c313735393431313533383239375840b1327a241287e6939721c6194af3f95e6fde96bd74b39b27147a10a4b495f0d5160c1b97b84c81d9e37d78be6794644d09f81424a4afc64a5336f17487404806",
};

async function testOnChainData() {
  try {
    console.log("📋 1. Parsing COSE_Sign1...");
    const signatureBytes = new Uint8Array(
      ONCHAIN_TEST_DATA.cardanoSignature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const [protectedHeader, _unprotectedHeader, payload, signature] = decode(signatureBytes);
    
    console.log("   ✅ Protected Header:", toHex(protectedHeader));
    console.log("   ✅ Payload:", new TextDecoder().decode(payload));
    console.log("   ✅ Signature length:", signature.length, "bytes");
    
    // Build Sig_structure (what wallet signed)
    console.log("\n📋 2. Building Sig_structure...");
    const sigStructure = [
      "Signature1",
      Buffer.from(protectedHeader || []),
      Buffer.from([]),
      Buffer.from(payload)
    ];
    
    const sigStructureBytes = encode(sigStructure);
    const sigStructureHex = Buffer.from(sigStructureBytes).toString('hex');
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log("   ✅ Sig_structure:", sigStructureHex.length / 2, "bytes");
    console.log("   ✅ Signature:", signatureHex.length / 2, "bytes");
    console.log("   ✅ Public key:", ONCHAIN_TEST_DATA.cardanoPublicKey.length / 2, "bytes");
    
    // Setup emulator
    console.log("\n📋 3. Setting up emulator...");
    const account = generateEmulatorAccount({ lovelace: 100_000_000n });
    const emulator = new Emulator([account]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(account.seedPhrase);
    console.log("   ✅ Emulator ready");
    
    // Load cip8_validator
    console.log("\n📋 4. Loading cip8_validator...");
    const plutusJson = JSON.parse(await Deno.readTextFile("../aiken/plutus.json"));
    interface ValidatorInfo {
      title: string;
      compiledCode: string;
      hash: string;
    }
    
    const cip8Validator = plutusJson.validators.find(
      (v: ValidatorInfo) => v.title === "cip8_validator.cip8_validator.spend"
    );
    
    if (!cip8Validator) {
      throw new Error("cip8_validator not found");
    }
    
    const validator: Script = {
      type: "PlutusV3",
      script: cip8Validator.compiledCode
    };
    
    const validatorAddress = validatorToAddress("Custom", validator);
    console.log("   ✅ Validator loaded");
    console.log("   📍 Address:", validatorAddress);
    
    // Lock funds at validator
    console.log("\n📋 5. Locking 5 ADA at validator...");
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
    console.log("   ✅ Locked:", lockTxHash);
    
    // Build redeemer for cip8_validator (Named type: message, public_key, signature)
    console.log("\n📋 6. Building redeemer...");
    const redeemerCip8 = Data.to(
      new Constr(0, [
        sigStructureHex,                           // message (Sig_structure)
        ONCHAIN_TEST_DATA.cardanoPublicKey,        // public_key
        signatureHex                               // signature
      ])
    );
    console.log("   ✅ CIP-8 redeemer created (named type)");
    console.log("   💡 Note: minimal_binding needs different order: (pk, msg, sig)");
    
    // Spend from validator
    console.log("\n📋 7. Spending from validator (signature verification)...");
    const utxos = await lucid.utxosAt(validatorAddress);
    
    const unlockTx = await lucid
      .newTx()
      .collectFrom(utxos, redeemerCip8)
      .attach.SpendingValidator(validator)
      .complete();
    
    const signedUnlockTx = await unlockTx.sign.withWallet().complete();
    const unlockTxHash = await signedUnlockTx.submit();
    
    console.log("   ✅ Transaction submitted:", unlockTxHash);
    
    await lucid.awaitTx(unlockTxHash);
    
    console.log("\n" + "=".repeat(80));
    console.log("🎉 SUCCESS! /onchain-test data works with cip8_validator!");
    console.log("=".repeat(80));
    console.log("\n✅ This proves:");
    console.log("   • Sig_structure extraction is correct");
    console.log("   • Signature is valid");
    console.log("   • cip8_validator works in emulator");
    console.log("\n💡 Next: Use same pattern for minimal_binding");
    console.log("=".repeat(80));
    
  } catch (error) {
    console.error("\n❌ TEST FAILED!");
    console.error("   Error:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await testOnChainData();
}
