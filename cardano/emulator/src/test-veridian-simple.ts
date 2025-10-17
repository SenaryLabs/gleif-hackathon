/**
 * Simple Test for Veridian Verification Validator
 * 
 * Tests the validator with our working "Hello" signature example using signify-ts
 */

import { fromText } from "npm:lucid-cardano@0.10.7";
import * as cbor from "npm:cbor-x@1.5.9";
import { SignifyClient, ready as signifyReady, Tier, Cigar, Verfer } from "signify-ts";

// ✅ Working example with "Hello" message and signify-ts classes
const bindingData = {
  message: "Hello",
  veridianSignature: "0BD6o9vWQUqrHE95OpXXvUtzFfhHaHsFvgEDsgWWoU8oEMcSHGD2z8sFsNilRUDEKuphRm-wnlohLNcCgUTcBukF",
  veridianPublicKey: "DAOYn_JGRGSnbdmAkEq1WkPyGEJg6BEJV4l7AmCiYdus",
  // For validator testing, we'll use the raw bytes
  rawSignature: null as Uint8Array | null,
  rawPublicKey: null as Uint8Array | null,
  messageBytes: null as Uint8Array | null
};

async function main() {
  console.log("=== Testing Veridian Verification with Signify-ts ===\n");
  
  await signifyReady();
  
  const bran = "veridian-simple-abcde-bran123";
  const client = new SignifyClient(KERIA_URL, bran, Tier.low, KERIA_BOOT_URL);
  
  try {
    await client.boot();
    await client.connect();
    console.log("✅ Connected to KERIA\n");
    
    // Use signify-ts classes to parse CESR
    console.log("🔍 Parsing CESR with signify-ts classes...");
    const cigar = new Cigar({ qb64: bindingData.veridianSignature });
    const verfer = new Verfer({ qb64: bindingData.veridianPublicKey });
    
    console.log(`Cigar code: ${cigar.code}, raw length: ${cigar.raw.length}`);
    console.log(`Verfer code: ${verfer.code}, raw length: ${verfer.raw.length}`);
    
    // Store raw bytes for validator
    bindingData.rawSignature = cigar.raw;
    bindingData.rawPublicKey = verfer.raw;
    bindingData.messageBytes = new TextEncoder().encode(bindingData.message);
    
    console.log("\n📋 Parsed Data:");
    console.log(`Message: "${bindingData.message}"`);
    console.log(`Signature: ${bindingData.rawSignature.length} bytes`);
    console.log(`Public Key: ${bindingData.rawPublicKey.length} bytes`);
    console.log(`Message Bytes: ${bindingData.messageBytes.length} bytes\n`);
    
    // Helper functions
    function bytesToHex(bytes: Uint8Array): string {
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    console.log("🔍 Signature Details:");
    console.log(`  Signature hex: ${bytesToHex(bindingData.rawSignature)}`);
    console.log(`  Public key hex: ${bytesToHex(bindingData.rawPublicKey)}`);
    console.log(`  Message: "${bindingData.message}"\n`);

    // Verify field lengths match validator requirements
    console.log("✅ Validating field lengths:");
    console.log(`   Public Key: ${bindingData.rawPublicKey.length === 32 ? '✅' : '❌'} 32 bytes (required)`);
    console.log(`   Signature: ${bindingData.rawSignature.length === 64 ? '✅' : '❌'} 64 bytes (required)`);
    console.log(`   Message: ${bindingData.messageBytes.length > 0 ? '✅' : '❌'} > 0 bytes (required)\n`);

    if (bindingData.rawPublicKey.length !== 32 || bindingData.rawSignature.length !== 64 || bindingData.messageBytes.length === 0) {
      console.error("❌ Field validation failed!");
      async function main() {
        console.log("--- Veridian Verification Test ---\n");
        await signifyReady();
        // Parse CESR signature and public key
        const cigar = new Cigar({ qb64: bindingData.veridianSignature });
        const verfer = new Verfer({ qb64: bindingData.veridianPublicKey });

        // Store raw bytes for validator
        bindingData.rawSignature = cigar.raw;
        bindingData.rawPublicKey = verfer.raw;
        bindingData.messageBytes = new TextEncoder().encode(bindingData.message);

        // Helper function
        function bytesToHex(bytes: Uint8Array): string {
          return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // Summary of parsed data
        console.log(`Message: "${bindingData.message}" | ${bindingData.messageBytes.length} bytes`);
        console.log(`Signature: ${bindingData.rawSignature.length} bytes | Public Key: ${bindingData.rawPublicKey.length} bytes`);
        console.log(`Signature hex: ${bytesToHex(bindingData.rawSignature)}`);
        console.log(`Public key hex: ${bytesToHex(bindingData.rawPublicKey)}\n`);

        // Field validation
        if (bindingData.rawPublicKey.length !== 32 || bindingData.rawSignature.length !== 64 || bindingData.messageBytes.length === 0) {
          console.error("❌ Field validation failed: Check key, signature, and message lengths.");
          return;
        }

        // Build CBOR redeemer
        const redeemer = cbor.encode([
          bindingData.rawPublicKey,
          bindingData.messageBytes,
          bindingData.rawSignature
        ]);
        console.log(`CBOR redeemer built: ${redeemer.length} bytes\n`);

        // Load validator info
        const plutusJson = JSON.parse(await Deno.readTextFile("../aiken/plutus.json"));
        const validator = plutusJson.validators.find((v) => v.title === "veridian_verification.veridian_verification.spend");
        if (!validator) {
          console.error("❌ Validator not found!");
          return;
        }
        console.log(`Validator: ${validator.title} | Hash: ${validator.hash}`);

        // Off-chain verification
        try {
          const { ed25519 } = await import("npm:@noble/curves@1.3.0/ed25519");
          const isValid = ed25519.verify(
            bindingData.rawSignature,
            bindingData.messageBytes,
            bindingData.rawPublicKey
          );
          if (isValid) {
            console.log("✅ Signature verifies off-chain. On-chain validator should also pass.");
          } else {
            console.log("❌ Signature does NOT verify off-chain. On-chain validator will reject.");
          }
        } catch (error) {
          console.log(`⚠️  Off-chain verification error: ${error.message}`);
        }
      }
    function bytesToHex(bytes: Uint8Array): string {
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Summary of parsed data
    console.log(`Message: "${bindingData.message}" | ${bindingData.messageBytes.length} bytes`);
    console.log(`Signature: ${bindingData.rawSignature.length} bytes | Public Key: ${bindingData.rawPublicKey.length} bytes`);
    console.log(`Signature hex: ${bytesToHex(bindingData.rawSignature)}`);
    console.log(`Public key hex: ${bytesToHex(bindingData.rawPublicKey)}\n`);

    // Field validation
    if (bindingData.rawPublicKey.length !== 32 || bindingData.rawSignature.length !== 64 || bindingData.messageBytes.length === 0) {
      console.error("❌ Field validation failed: Check key, signature, and message lengths.");
      return;
    }

    // Build CBOR redeemer
    const redeemer = cbor.encode([
      bindingData.rawPublicKey,
      bindingData.messageBytes,
      bindingData.rawSignature
    ]);
    console.log(`CBOR redeemer built: ${redeemer.length} bytes\n`);

    // Load validator info
    const plutusJson = JSON.parse(await Deno.readTextFile("../aiken/plutus.json"));
    const validator = plutusJson.validators.find((v: any) => v.title === "veridian_verification.veridian_verification.spend");
    if (!validator) {
      console.error("❌ Validator not found!");
      return;
    }
    console.log(`Validator: ${validator.title} | Hash: ${validator.hash}`);

    // Off-chain verification
    try {
      const { ed25519 } = await import("npm:@noble/curves@1.3.0/ed25519");
      const isValid = ed25519.verify(
        bindingData.rawSignature,
        bindingData.messageBytes,
        bindingData.rawPublicKey
      );
      if (isValid) {
        console.log("✅ Signature verifies off-chain. On-chain validator should also pass.");
      } else {
        console.log("❌ Signature does NOT verify off-chain. On-chain validator will reject.");
      }
    } catch (error) {
      console.log(`⚠️  Off-chain verification error: ${error.message}`);
    }
