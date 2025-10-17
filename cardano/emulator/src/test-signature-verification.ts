// Test Ed25519 signature verification from real CBOR
import { toHex } from "@evolution-sdk/lucid";

function testSignatureVerification() {
  console.log("🔐 Testing Ed25519 Signature Verification");
  console.log("=" .repeat(80));
  
  // Real data from the binding message
  const canonicalMessage = "BIND|v1|EDr7pprL3UJ_aoi3wz8wX4I75BUgpanhQdcBbTNb7UCV|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5|1759565329079";
  
  console.log(`\n📝 Canonical Message:`);
  console.log(`   "${canonicalMessage}"`);
  
  // Convert to hex
  const messageHex = toHex(new TextEncoder().encode(canonicalMessage));
  console.log(`\n🔢 Message (hex):`);
  console.log(`   ${messageHex}`);
  console.log(`   Length: ${messageHex.length / 2} bytes`);
  
  // Real CBOR signature from wallet
  const cborSignature = "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458af42494e447c76317c454472377070724c33554a5f616f6933777a3877583449373542556770616e685164634262544e62375543567c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866357c3137353935363533323930373958403058b45822d4d00bc73b82c34b1fa3b9554f441638c544dd3f7d179c3c1882ba5b26f89ad5ddd9f38775514c7a91c33b68c31d49c2d95bfa7bd33927f137f50f";
  
  // Real COSE_Key from wallet
  const coseKey = "a401012715820eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2";
  
  console.log("\n📦 Real Wallet Signature Data:");
  console.log(`   CBOR signature length: ${cborSignature.length} chars (${cborSignature.length / 2} bytes)`);
  console.log(`   COSE_Key length: ${coseKey.length} chars (${coseKey.length / 2} bytes)`);
  
  // Mock signature response structure
  const signatureResponse = {
    signature: cborSignature,
    key: coseKey
  };
  
  console.log("\n📦 Signature Response:");
  console.log(JSON.stringify(signatureResponse, null, 2));
  
  // Extract components
  const signature = signatureResponse.signature;
  const key = signatureResponse.key;
  
  console.log("\n🔍 CBOR Signature Components:");
  console.log(`   Full CBOR signature: ${signature}`);
  console.log(`   CBOR length: ${signature.length} chars (${signature.length / 2} bytes)`);
  
  // Extract Ed25519 signature (last 128 hex chars = 64 bytes)
  const ed25519Sig = signature.substring(signature.length - 128);
  console.log(`\n   Ed25519 signature: ${ed25519Sig}`);
  console.log(`   Ed25519 length: ${ed25519Sig.length / 2} bytes`);
  
  // Extract public key from COSE_Key
  // Pattern can be: a401...215820[64 hex] or just look for 215820[64 hex]
  console.log("\n🔍 CBOR Signature Components:");
  console.log(`   Full CBOR signature: ${signature}`);
  console.log(`   CBOR length: ${signature.length} chars (${signature.length / 2} bytes)`);
  const ed25519Sig = signature.substring(signature.length - 128);
  const coseKeyMatch = key.match(/215820([0-9a-fA-F]{64})/i) || key.match(/5820([0-9a-fA-F]{64})/i);
  if (coseKeyMatch) {
    const publicKey = coseKeyMatch[1];
    console.log(`\n🔑 Public Key (from COSE_Key):`);
    console.log(`   ${publicKey}`);
    console.log(`   Length: ${publicKey.length / 2} bytes`);
    console.log("\n" + "=".repeat(80));
    console.log("✅ Successfully extracted all signature components!");
    console.log("\n📋 For Aiken Test:");
    console.log(`
test validate_ed25519_signature_with_emulator() {
  // Message: "${canonicalMessage}"
  let message = #"${messageHex}"
  
  // CIP-8: Hash the message first
  let message_hash = blake2b_256(message)
  
  // Public key from emulator wallet
  let public_key = #"${publicKey}"
  
  // Ed25519 signature from CBOR
  let signature = #"${ed25519Sig}"
  
  // Verify the signature
  verify_ed25519_signature(public_key, message_hash, signature)
}
`);
  } else {
    console.log("❌ Could not extract public key from COSE_Key");
    console.log("   COSE_Key format:", key);
  }
    
