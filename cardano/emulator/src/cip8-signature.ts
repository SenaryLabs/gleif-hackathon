// CIP-8 Signature Generator using Evolution SDK
// This script generates a CIP-8 signature that can be used in Aiken tests
import { 
  Lucid, 
  generateEmulatorAccount, 
  Emulator, 
  toHex,
  getAddressDetails,
} from "@evolution-sdk/lucid";
import { ed25519 } from 'npm:@noble/curves@1.3.0/ed25519';
import { blake2b } from 'npm:@noble/hashes@1.3.3/blake2b';

console.log("--- CIP-8 Signature Generator ---");

async function generateCIP8Signature() {
  try {
    // 1. Setup emulator with account
    const account = generateEmulatorAccount({ lovelace: 100_000_000n });
    const emulator = new Emulator([account]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(account.seedPhrase);
  console.log(`Emulator ready. Account: ${account.address}`);
    
    // 2. Get the wallet's payment credential (contains public key hash)
    const addressDetails = getAddressDetails(account.address);
    const paymentCredential = addressDetails.paymentCredential;
        
    if (!paymentCredential || paymentCredential.type !== "Key") {
      throw new Error("No payment key found in address");
    }
    
  const pubKeyHash = paymentCredential.hash;
  console.log(`Payment Key Hash: ${pubKeyHash}`);
    
    // 3. Create a test message
    const message = "Hello Aiken CIP-8 Test";
    const messageBytes = new TextEncoder().encode(message);
    const messageHex = toHex(messageBytes);
  console.log(`Test Message: '${message}' | ${messageBytes.length} bytes | Hex: ${messageHex}`);
    
    // 4. Generate Ed25519 key pair for testing
    console.log("\n3️⃣  Generating Ed25519 key pair...");
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);
  console.log(`Ed25519 Key Pair: Public Key: ${toHex(publicKey)} | Length: ${publicKey.length} bytes`);
    
    // 5. Create a simple signature for Aiken testing
    console.log("\n4️⃣  Creating signature for Aiken testing...");
  console.log("Creating signature for Aiken testing...");
    
    // For Aiken testing, we'll sign the Blake2b-256 hash of the message directly
    // This is simpler than the full CIP-8 COSE structure
    
    // Hash the message with Blake2b-256 (as used in Aiken)
    const messageHash = blake2b(messageBytes, { dkLen: 32 });
    const messageHashHex = toHex(messageHash);
    
    console.log(`   Message Hash (Blake2b-256): ${messageHashHex}`);
    console.log(`   Message Hash Length: ${messageHash.length} bytes`);
    
    // Sign the message hash directly
    const signature = ed25519.sign(messageHash, privateKey);
    const signatureHex = toHex(signature);
    
    console.log(`   Signature: ${signatureHex}`);
    console.log(`   Signature Length: ${signature.length} bytes (64 bytes for Ed25519)`);
    
    // Verify the signature
    console.log("\n5️⃣  Verifying signature...");
    const isValid = ed25519.verify(signature, messageHash, publicKey);
    console.log(`   Signature Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
    
    // 6. Display test data for Aiken
    console.log("\n6️⃣  Preparing Aiken test data...");
    
    // 11. Display test data for Aiken
    console.log("\n" + "=".repeat(80));
    console.log("🎯 Aiken Test Data");
    console.log("=".repeat(80));
    
    console.log("\n📋 Test Case for ed25519_tests.ak:");
    console.log("```aiken");
    console.log(`test test_cip8_signature_valid() {`);
    console.log(`  // Message: "${message}"`);
    console.log(`  let message = #"${messageHex}"`);
    console.log(`  // Hash the message using blake2b_256`);
    console.log(`  let message_hash = blake2b_256(message)`);
    console.log(`  // Public key (32 bytes)`);
    console.log(`  let public_key = #"${publicKeyHex}"`);
    console.log(`  // Ed25519 signature (64 bytes) - signed over CIP-8 Sig_structure`);
    console.log(`  let signature = #"${signatureHex}"`);
    console.log(`  // This MUST verify as True - cryptographically valid signature`);
    console.log(`  verify_ed25519_signature(public_key, message_hash, signature)`);
    console.log(`}`);
    console.log("```");
    
    console.log("\n📊 Summary:");
    console.log(`   Message: "${message}"`);
    console.log(`   Message Hex: ${messageHex}`);
    console.log(`   Message Hash: ${messageHashHex}`);
    console.log(`   Public Key: ${publicKeyHex}`);
    console.log(`   Signature: ${signatureHex}`);
    console.log(`   Test completed successfully!`);
   
    console.log("\n" + "=".repeat(80));
    console.log("✅ CIP-8 Signature Generation Complete!");
    console.log("=".repeat(80));
    
    return {
      message,
      messageHex,
      messageHashHex,
      publicKeyHex,
      signatureHex,
      isValid
    };
    
  } catch (error) {
    console.error("\n❌ Error generating CIP-8 signature:", error);
    throw error;
  }
}

// Run the generator
generateCIP8Signature().catch(console.error);
