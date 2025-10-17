// Verify the Ed25519 signature extracted from CBOR
import { C } from "@evolution-sdk/evolution"

console.log("🔐 Ed25519 Signature Verification Test\n");
console.log("=" .repeat(80));

// The complete CBOR signature from wallet.api.signData()
const cborSignature =
    "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458af42494e447c76317c454472377070724c33554a5f616f6933777a3877583449373542556770616e685164634262544e62375543567c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866357c3137353935363533323930373958403058b45822d4d00bc73b82c34b1fa3b9554f441638c544dd3f7d179c3c1882ba5b26f89ad5ddd9f38775514c7a91c33b68c31d49c2d95bfa7bd33927f137f50f"

// Extract the Ed25519 signature (last 128 hex chars = 64 bytes)
const signatureHex = cborSignature.substring(cborSignature.length - 128);
console.log("\n📝 Ed25519 Signature (from CBOR):");
console.log(signatureHex);
console.log(`Length: ${signatureHex.length / 2} bytes\n`);

// The public key from COSE_Key
const publicKeyHex = "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2";
console.log("🔑 Public Key:");
console.log(publicKeyHex);
console.log(`Length: ${publicKeyHex.length / 2} bytes\n`);

// The canonical message (what was signed)
const canonicalMessage = "BIND|v1|EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5|1759565329079";
console.log("📄 Canonical Message:");
console.log(canonicalMessage);

// Convert to hex
const messageHex = Array.from(new TextEncoder().encode(canonicalMessage))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
console.log("\n📄 Message (hex):");
console.log(messageHex);
console.log(`Length: ${messageHex.length / 2} bytes\n`);

console.log("=" .repeat(80));
console.log("\n🔍 CIP-8 Verification Process:\n");

try {
    // Convert hex strings to Uint8Array
    const publicKeyBytes = new Uint8Array(publicKeyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const signatureBytes = new Uint8Array(signatureHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const messageBytes = new TextEncoder().encode(canonicalMessage);
    
    console.log("1️⃣  Message bytes:", messageBytes.length);
    console.log("2️⃣  Public key bytes:", publicKeyBytes.length);
    console.log("3️⃣  Signature bytes:", signatureBytes.length);
    
    // CIP-8 signs the Blake2b-256 hash of the message
    const messageHashHex = C.hash_blake2b256(messageBytes);
    const messageHash = new Uint8Array(messageHashHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    console.log("\n4️⃣  Blake2b-256 hash of message:");
    console.log(`   Hex: ${messageHashHex}`);
    console.log(`   Length: ${messageHash.length} bytes`);
    
    // Create Ed25519 public key
    const publicKey = C.PublicKey.from_bytes(publicKeyBytes);
    const ed25519Signature = C.Ed25519Signature.from_bytes(signatureBytes);
    
    // Verify the signature against the hash
    console.log("\n5️⃣  Verifying signature...");
    const isValid = publicKey.verify(messageHash, ed25519Signature);
    
    console.log("\n" + "=" .repeat(80));
    if (isValid) {
        console.log("✅ SIGNATURE IS VALID!");
        console.log("\nThe Ed25519 signature correctly verifies against:");
        console.log("  - Public key: " + publicKeyHex.substring(0, 16) + "...");
        console.log("  - Message hash: " + messageHashHex.substring(0, 16) + "...");
    } else {
        console.log("❌ SIGNATURE IS INVALID");
        console.log("\nPossible reasons:");
        console.log("  1. Wrong public key");
        console.log("  2. Wrong message");
        console.log("  3. Signature was not created with this key/message pair");
        console.log("  4. CBOR extraction error");
    }
    console.log("=" .repeat(80));
    
} catch (error) {
    console.error("\n❌ Error during verification:", error);
    console.log("\nThis might indicate:");
    console.log("  - Invalid byte array lengths");
    console.log("  - Incorrect hex encoding");
    console.log("  - CSL library issues");
}

console.log("\n💡 For Aiken Validator:");
console.log("Use this test data:");
console.log(`
test validate_ed25519_signature_test() {
  let message = #"${messageHex}"
  let message_hash = blake2b_256(message)
  let public_key = #"${publicKeyHex}"
  let signature = #"${signatureHex}"
  verify_ed25519_signature(public_key, message_hash, signature)
}
`);
