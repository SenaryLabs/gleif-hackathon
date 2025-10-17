import { 
  generateEmulatorAccount, 
  Data,
  fromText,
  fromHex
} from "@evolution-sdk/lucid";
import process from "node:process";

// Minimal Bond Datum Schema for testing
const MinimalBondDatumSchema = Data.Object({
  issuer_credential: Data.Bytes(),
  maturity_timestamp: Data.Integer(),
  total_face_value: Data.Integer(),
  status: Data.Enum([
    Data.Literal("Funding"),
    Data.Literal("Active")
  ]),
  bond_id: Data.Bytes()
});

// KEL Event Schema
const KelEventSchema = Data.Object({
  d: Data.Bytes(),
  x: Data.Object({
    v: Data.Bytes(),
    t: Data.Bytes(),
    issuer: Data.Bytes(),
    holder: Data.Bytes(),
    cardanoAddress: Data.Bytes(),
    cardanoPublicKey: Data.Bytes(),
    canonicalMessage: Data.Bytes(),
    signature: Data.Object({
      cardano: Data.Bytes(),
      veridian: Data.Bytes()
    }),
    createdAt: Data.Bytes(),
    d: Data.Bytes()
  })
});

// Complete Bond Datum Schema with KEL Event
const CompleteBondDatumSchema = Data.Object({
  // Bond financial data
  issuer_credential: Data.Bytes(),
  maturity_timestamp: Data.Integer(),
  total_face_value: Data.Integer(),
  status: Data.Enum([
    Data.Literal("Funding"),
    Data.Literal("Active"),
    Data.Literal("Matured"),
    Data.Literal("Defaulted")
  ]),
  
  // KEL event data for binding verification
  kel_event: KelEventSchema,
  
  // Additional bond metadata
  bond_id: Data.Bytes(),
  coupon_rate: Data.Integer(), // in basis points (e.g., 500 = 5%)
  payment_frequency: Data.Enum([
    Data.Literal("Monthly"),
    Data.Literal("Quarterly"),
    Data.Literal("SemiAnnual"),
    Data.Literal("Annual")
  ]),
  
  // Regulatory and compliance
  regulatory_status: Data.Enum([
    Data.Literal("Pending"),
    Data.Literal("Approved"),
    Data.Literal("Rejected")
  ]),
  
  // Timestamps
  created_at: Data.Integer(),
  last_updated: Data.Integer()
});

type MinimalBondDatum = Data.Static<typeof MinimalBondDatumSchema>;
type CompleteBondDatum = Data.Static<typeof CompleteBondDatumSchema>;
type KelEvent = Data.Static<typeof KelEventSchema>;

function testCompleteBondDatum() {
  console.log("🏦 Complete Bond Datum Test with KEL Events");
  console.log("==========================================\n");

  // 1. Setup emulator
  const account = generateEmulatorAccount({ lovelace: 100_000_000n });
  
  console.log("✅ Emulator setup complete");
  console.log(`   Account: ${account.address}\n`);

  // 2. Create complete bond datum with real KEL event data
  console.log("📋 Creating complete bond datum with KEL events...");
  
  const currentTime = BigInt(Date.now());
  const maturityTime = currentTime + BigInt(365 * 24 * 60 * 60 * 1000); // 1 year
  
  // Real KEL anchored binding data from the issuer service
  const kelEvent = {
    d: fromText("EC0vmnPuDj5mHzV3xE5auCVRTMFu5BDnlsjC12Cl0_Sc"),
    x: {
      v: fromText("KERI10JSON00043b_"),
      t: fromText("cardano_address_binding"),
      issuer: fromText("EAzkF2sA10BQBA1TZxbfXCLRadORFNyxSmHmdC7JDciL"),
      holder: fromText("EEexsHQ4Hum6H8C-XRSx2nc1MQyJgtCyRKr5RHZN0AL9"),
      cardanoAddress: fromText("addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5"),
      cardanoPublicKey: fromText("eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2"),
      canonicalMessage: fromText("BIND|v1|EEexsHQ4Hum6H8C-XRSx2nc1MQyJgtCyRKr5RHZN0AL9|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5"),
      signature: {
        cardano: fromText("845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f4410b5840d622f5eec037ef59c37e0b5f348e6f7d5968197fce797ccb0c6aeaebdb9dc0d02d24b189bd131fd61428c709e591248b40886f8b1618dea9a8cb1303266ca401"),
        veridian: fromText("0BBLm2tSXGrhqD3MdTlPnrsj_d1jvEUVuhhDq71uUrFVSfmG4sn5cQOiWPrvzN7SIbz2cCsiYFamEBC9Mwt27UUK")
      },
      createdAt: fromText("2025-10-08T23:33:40.778Z"),
      d: fromText("EC0vmnPuDj5mHzV3xE5auCVRTMFu5BDnlsjC12Cl0_Sc")
    }
  };
  
  const completeBondDatumData = {
    // Bond financial data
    issuer_credential: fromText("eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2"),
    maturity_timestamp: maturityTime,
    total_face_value: 10000000000n, // $100M in cents
    status: "Funding" as const,
    
    // KEL event data for binding verification
    kel_event: kelEvent,
    
    // Additional bond metadata
    bond_id: fromText("BOND-2024-001"),
    coupon_rate: 500n, // 5% in basis points
    payment_frequency: "Quarterly" as const,
    
    // Regulatory and compliance
    regulatory_status: "Approved" as const,
    
    // Timestamps
    created_at: currentTime,
    last_updated: currentTime
  };

  console.log("🔧 Testing KEL event serialization first...");
  try {
    const kelDatum = Data.to(kelEvent as any, KelEventSchema);
    console.log("✅ KEL event serialized successfully");
    
    // Test individual fields to identify the problematic one
    console.log("🔧 Testing individual fields...");
    
    // Test minimal bond data first
    const minimalBondData = {
      issuer_credential: fromText("eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2"),
      maturity_timestamp: maturityTime,
      total_face_value: 10000000000n,
      status: "Funding" as const,
      bond_id: fromText("BOND-2024-001")
    };
    
    console.log("🔧 Testing minimal bond data...");
    const minimalBondDatum = Data.to(minimalBondData as any, MinimalBondDatumSchema);
    console.log("✅ Minimal bond data serialized successfully");
    
    // Test basic bond data with KEL event
    const basicBondData = {
      issuer_credential: fromText("eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2"),
      maturity_timestamp: maturityTime,
      total_face_value: 10000000000n,
      status: "Funding" as const,
      kel_event: kelEvent,
      bond_id: fromText("BOND-2024-001"),
      coupon_rate: 500n,
      payment_frequency: "Quarterly" as const,
      regulatory_status: "Approved" as const,
      created_at: currentTime,
      last_updated: currentTime
    };
    
    console.log("🔧 Testing basic bond data with KEL event...");
    const basicBondDatum = Data.to(basicBondData as any, CompleteBondDatumSchema);
    console.log("✅ Basic bond data with KEL event serialized successfully");
    
    console.log("🔧 Serializing complete bond datum...");
    const bondDatum = Data.to(completeBondDatumData as any, CompleteBondDatumSchema);
    console.log("✅ Complete bond datum serialized successfully\n");

    // 3. Test deserialization
    console.log("🔍 Testing deserialization...");
    const deserialized = Data.from(bondDatum, CompleteBondDatumSchema);
    console.log("✅ Complete bond datum deserialized successfully");
    console.log(`   Bond ID: ${deserialized.bond_id}`);
    console.log(`   Issuer Credential: ${deserialized.issuer_credential}`);
    console.log(`   Maturity: ${deserialized.maturity_timestamp}`);
    console.log(`   Face Value: ${deserialized.total_face_value}`);
    console.log(`   Status: ${deserialized.status}`);
    console.log(`   Coupon Rate: ${deserialized.coupon_rate} basis points`);
    console.log(`   Payment Frequency: ${deserialized.payment_frequency}`);
    console.log(`   Regulatory Status: ${deserialized.regulatory_status}`);
    console.log(`   KEL Event Present: ${deserialized.kel_event ? 'Yes' : 'No'}`);
    
    if (deserialized.kel_event) {
      const kel = deserialized.kel_event;
      console.log(`   KEL Event ID: ${kel.d}`);
      console.log(`   KEL Type: ${kel.x.t}`);
      console.log(`   Issuer: ${kel.x.issuer}`);
      console.log(`   Holder: ${kel.x.holder}`);
      console.log(`   Cardano Address: ${kel.x.cardanoAddress}`);
      console.log(`   Created At: ${kel.x.createdAt}`);
    }
    console.log("");

    console.log("🎉 Complete bond datum test completed successfully!");
    return bondDatum;
  } catch (error) {
    console.error("❌ Serialization failed:", error);
    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function run() {
  try {
    testCompleteBondDatum();
    console.log("\n🎯 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

run();
