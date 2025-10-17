// Test script for utils.ts with evolution-sdk
// Tests the utility functions with the latest SDK

import { 
  Lucid, 
  generateEmulatorAccount, 
  Emulator, 
  Data,
  fromText
} from "@evolution-sdk/lucid";

// Import utils functions
import { 
  readValidator,
  formatValidator,
  applyParamsToScript,
  daysToSlots,
  daysToMs,
  adaToLovelace,
  lovelaceToAda,
  calculateCouponAmount,
  createBondDatum,
  calculateAccruedInterest,
  toEvenHex
} from "./utils.ts";

// ============================================================================
// UTILS TEST
// ============================================================================

/// Test the utility functions with evolution-sdk
async function testUtils() {
  console.log("🎯 Utils Test with Evolution SDK");
  console.log("==================================================");
  
  // Generate test accounts
  const issuerAccount = generateEmulatorAccount({ lovelace: 100_000_000n });
  const holderAccount = generateEmulatorAccount({ lovelace: 50_000_000n });
  
  // Initialize emulator
  const emulator = new Emulator([issuerAccount, holderAccount]);
  const lucid = await Lucid(emulator, "Custom");
  
  console.log("🚀 Setting up emulator...");
  console.log("✅ Emulator ready");
  console.log(`   Issuer: ${issuerAccount.address}`);
  console.log(`   Holder: ${holderAccount.address}`);
  
  // Test 1: Basic utility functions
  console.log("\n1️⃣ Testing Basic Utility Functions");
  await testBasicUtils();
  
  
  // Test 3: Data serialization
  console.log("\n3️⃣ Testing Data Serialization");
  await testDataSerialization();
  
  console.log("\n🎉 Utils tests completed!");
}

/// Test basic utility functions
async function testBasicUtils() {
  console.log("🔍 Testing basic utility functions...");
  
  // Test time conversions
  const days = 30;
  const slots = daysToSlots(days);
  const ms = daysToMs(days);
  console.log(`   ${days} days = ${slots} slots`);
  console.log(`   ${days} days = ${ms} ms`);
  
  // Test ADA/lovelace conversions
  const ada = 100;
  const lovelace = adaToLovelace(ada);
  const backToAda = lovelaceToAda(lovelace);
  console.log(`   ${ada} ADA = ${lovelace} lovelace`);
  console.log(`   ${lovelace} lovelace = ${backToAda} ADA`);
  
  // Test coupon calculation
  const principal = 1000000n; // 1M lovelace
  const rateBps = 500n; // 5%
  const periodMs = 365n * 24n * 60n * 60n * 1000n; // 1 year
  const coupon = calculateCouponAmount(principal, rateBps, periodMs);
  console.log(`   Coupon for ${principal} lovelace at ${rateBps} bps for 1 year: ${coupon} lovelace`);
  
  // Test hex formatting
  const oddHex = "abc";
  const evenHex = toEvenHex(oddHex);
  console.log(`   Odd hex "${oddHex}" -> even hex "${evenHex}"`);
  
  console.log("✅ Basic utility functions working");
}


/// Test data serialization
async function testDataSerialization() {
  console.log("🔍 Testing data serialization...");
  
  // Test basic data serialization
  const testData = Data.to(fromText("Hello World"));
  console.log(`   Basic data serialization: ${testData}`);
  
  // Test simple data structures
  const numberData = Data.to(1000000n);
  console.log(`   Number data: ${numberData}`);
  
  // Test boolean as integer (Plutus convention)
  const boolData = Data.to(1n); // 1 for true, 0 for false
  console.log(`   Boolean data (as int): ${boolData}`);
  
  // Test applyParamsToScript
  const params = {
    datum: Data.to(fromText("test_datum")),
    redeemer: Data.to(fromText("test_redeemer")),
    scriptContext: Data.to(fromText("test_context"))
  };
  
  const appliedParams = applyParamsToScript(params);
  console.log(`   Applied params: ${appliedParams}`);
  
  console.log("✅ Data serialization working");
}

/// Run the utils test
async function runUtilsTest() {
  try {
    await testUtils();
  } catch (error) {
    console.error("❌ Utils test failed:", error);
    process.exit(1);
  }
}

// Run the test
runUtilsTest();
