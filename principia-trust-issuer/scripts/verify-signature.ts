#!/usr/bin/env ts-node

/**
 * Verify Signature with Signify-ts
 * 
 * This script verifies a signature using signify-ts following the tutorial pattern
 */

import { SignifyClient, ready as signifyReady, Tier, Siger, Verfer } from "signify-ts";

const KERIA_URL = "";
const KERIA_BOOT_URL = "";
const KERIA_URL = "your-keria-endpoint-here";
const KERIA_BOOT_URL = "your-keria-boot-endpoint-here";

async function main() {
  console.log("🔍 Verifying Signature with Signify-ts");
  console.log("=====================================\n");
  
  await signifyReady();
  
  // Create a test bran for this session (must be exactly 21 characters)
  const bran = "verify-test-" + Math.random().toString(36).substring(2, 8) + "123";
  const client = new SignifyClient(KERIA_URL, bran, Tier.low, KERIA_BOOT_URL);
  
  try {
    // Boot and connect
    console.log("📡 Connecting to KERIA...");
    const bootResult = await client.boot();
    if (!bootResult.ok && bootResult.status !== 409) {
      throw new Error(`Boot failed: ${bootResult.status}`);
    }
    
    await client.connect();
    console.log("✅ Connected to KERIA");
    
    // Test data from our signing script
    const message = "Hello";
    const signatureCESR = "AABofTZG6c9GAQRDkhNPvi2eKWu6CoNMJ8HxTIOX7nGHhFV2E0xJlY2Zo1LTCpqyFBCyYMBrpC-c4MuusQ3_SiUB";
    const publicKeyCESR = "DPruEpug-lKa37RMHLyo4OMUf5NZibOXkVi8Wccl_fd7";
    const aidPrefix = "EKvrUU3XZHTUJaV8iXYl-9l6sVX3xv7fHx6kcjOfjn5K";
    
    console.log("\n🔍 Verification Data:");
    console.log("====================");
    console.log(`Message: "${message}"`);
    console.log(`AID: ${aidPrefix}`);
    console.log(`Signature: ${signatureCESR}`);
    console.log(`Public Key: ${publicKeyCESR}`);
    
    // Verify using signify-ts methods (following the tutorial pattern)
    console.log("\n🔍 Verifying signature with signify-ts...");
    
    // Create Siger and Verfer instances
    const siger = new Siger({ qb64: signatureCESR });
    const verfer = new Verfer({ qb64: publicKeyCESR });
    
    console.log("   Siger created:", siger.qb64);
    console.log("   Verfer created:", verfer.qb64);
    
    // Verify the signature
    const verificationResult = verfer.verify(siger.raw, new TextEncoder().encode(message));
    
    console.log("\n🎯 Verification Result:");
    console.log("======================");
    if (verificationResult) {
      console.log("✅ SUCCESS - Signature is valid!");
      console.log("   The message was signed by the holder of the private key");
      console.log("   The signature verification passed using signify-ts");
    } else {
      console.log("❌ FAILED - Signature verification failed!");
    }
    
  } catch (error) {
    console.error("❌ Error during verification:", error);
    
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
    }
  }
}

// Run the verification script
main().catch(console.error);
