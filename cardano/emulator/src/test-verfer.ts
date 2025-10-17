import { SignifyClient, ready as signifyReady, Tier, Siger, Verfer, Cigar } from "signify-ts";

// Test examples
const workingPublicKey = "DPruEpug-lKa37RMHLyo4OMUf5NZibOXkVi8Wccl_fd7";
const veridianPublicKey = "DAOYn_JGRGSnbdmAkEq1WkPyGEJg6BEJV4l7AmCiYdus";
const aaSignature = "AABofTZG6c9GAQRDkhNPvi2eKWu6CoNMJ8HxTIOX7nGHhFV2E0xJlY2Zo1LTCpqyFBCyYMBrpC-c4MuusQ3_SiUB";
const obSignature = "0BD6o9vWQUqrHE95OpXXvUtzFfhHaHsFvgEDsgWWoU8oEMcSHGD2z8sFsNilRUDEKuphRm-wnlohLNcCgUTcBukF";

async function main() {
  console.log("Verfer/Siger Test\n");
  
  await signifyReady();
  
  const bran = "simple-test-abcde-bran123";
  const client = new SignifyClient(KERIA_URL, bran, Tier.low, KERIA_BOOT_URL);
  
  try {
    await client.boot();
    await client.connect();
  console.log("Connected to KERIA\n");
    
    // Test public keys
  console.log("Public Keys:");
    try {
      const verfer1 = new Verfer({ qb64: workingPublicKey });
  console.log(`Working: ${verfer1.code} (${verfer1.raw.length} bytes)`);
    } catch (error) {
  console.log(`Working failed: ${error.message}`);
    }
    
    try {
      const verfer2 = new Verfer({ qb64: veridianPublicKey });
  console.log(`Veridian: ${verfer2.code} (${verfer2.raw.length} bytes)`);
    } catch (error) {
  console.log(`Veridian failed: ${error.message}`);
    }
    
    // Test signatures
  console.log("\nSignatures:");
    try {
      const siger1 = new Siger({ qb64: aaSignature });
  console.log(`AA: ${siger1.code} (${siger1.raw.length} bytes, index: ${siger1.index})`);
    } catch (error) {
  console.log(`AA failed: ${error.message}`);
    }
    
    try {
      const siger2 = new Cigar({ qb64: obSignature });
  console.log(`0B: ${siger2.code} (${siger2.raw.length} bytes, index: ${siger2.index})`);
    } catch (error) {
  console.log(`0B failed: ${error.message}`);
    }
    
  } catch (error) {
  console.error("Error:", error.message);
  }
}

// KERIA endpoints
const KERIA_URL = "your-keria-endpoint-here";
const KERIA_BOOT_URL = "your-keria-boot-endpoint-here";

// Run the test script
main().catch(console.error);
