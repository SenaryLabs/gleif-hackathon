import { ed25519 } from "npm:@noble/curves@1.3.0/ed25519";
import { Buffer } from "node:buffer";
import {
  SignifyClient,
  ready as signifyReady,
  Tier,
  Cigar,
  Verfer,
} from "signify-ts";

async function verifySignature(
  message: string,
  signatureCESR: string,
  publicKeyCESR: string
): Promise<boolean> {
  try {
    // Use signify-ts classes for proper CESR parsing
    console.log("🔍 Using signify-ts classes for CESR parsing...");

    const cigar = new Cigar({ qb64: signatureCESR });
    const verfer = new Verfer({ qb64: publicKeyCESR });

    console.log(`Cigar code: ${cigar.code}, raw length: ${cigar.raw.length}`);
    console.log(
      `Verfer code: ${verfer.code}, raw length: ${verfer.raw.length}`
    );

    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature using Ed25519 with signify-ts extracted bytes
    const isValid = ed25519.verify(cigar.raw, messageBytes, verfer.raw);

    return isValid;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}

// Main execution
async function main() {
  console.log("🔍 Verifying KERI Signature with Signify-ts");
  console.log("============================================\n");

  await signifyReady();

  const bran = "veridian-test-abcde-bran123";
  const client = new SignifyClient(KERIA_URL, bran, Tier.low, KERIA_BOOT_URL);

  try {
    await client.boot();
    await client.connect();
    console.log("✅ Connected to KERIA\n");

    const message = "Hello";
    const signatureCESR =
      "0BD6o9vWQUqrHE95OpXXvUtzFfhHaHsFvgEDsgWWoU8oEMcSHGD2z8sFsNilRUDEKuphRm-wnlohLNcCgUTcBukF";
    const publicKeyCESR = "DAOYn_JGRGSnbdmAkEq1WkPyGEJg6BEJV4l7AmCiYdus";

    console.log(`Message: "${message}"`);
    console.log(`Signature (QB64): ${signatureCESR}`);
    console.log(`Public Key (QB64): ${publicKeyCESR}`);
    console.log("");

    const isValid = await verifySignature(
      message,
      signatureCESR,
      publicKeyCESR
    );

    console.log(
      `\n🎯 Verification Result: ${isValid ? "✅ SUCCESS" : "❌ FAILED"}`
    );

    if (isValid) {
      console.log("✓ Signature verified successfully!");
    } else {
      console.log("✗ Signature verification failed!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// KERIA endpoints
const KERIA_URL = "your-keria-endpoint-here";
const KERIA_BOOT_URL = "your-keria-boot-endpoint-here";

main().catch(console.error);
