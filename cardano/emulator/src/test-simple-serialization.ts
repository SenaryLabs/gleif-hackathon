import { 
    Lucid, 
    generateEmulatorAccount, 
    Emulator, 
    Data,
    fromText,
    fromHex,
    TxHash,
    Script,
    validatorToAddress,
    signData,
    SignedMessage
  } from "@evolution-sdk/lucid";
  import { readValidator } from "./utils.ts";
  
  // Simple redeemer schema - just needs the public key
  const SimpleRedeemerSchema = Data.Object({
    message: Data.Bytes(),
    public_key: Data.Bytes(),
    signature: Data.Bytes(),
  });
  
  type SimpleRedeemer = Data.Static<typeof SimpleRedeemerSchema>;
  const SimpleRedeemer = SimpleRedeemerSchema as unknown as SimpleRedeemer;
  
  async function simpleSignAndValidate() {
    console.log("🔐 Simple Sign & Validate Test");
    console.log("==============================\n");
  
    // 1. Setup emulator with account
    const account = generateEmulatorAccount({ lovelace: 100_000_000n });
    const emulator = new Emulator([account]);
    const lucid = await Lucid(emulator, "Custom");
    lucid.selectWallet.fromSeed(account.seedPhrase);
  
    console.log("✅ Emulator setup complete");
    console.log(`   Account: ${account.address}\n`);
  
    // 2. Get the wallet's payment credential (contains public key hash)
    const paymentCredential = lucid.utils.getAddressDetails(account.address).paymentCredential;
    
    if (!paymentCredential || paymentCredential.type !== "Key") {
      throw new Error("No payment key found in address");
    }
  
    // The payment credential hash (this is hash(publicKey), not the full public key)
    const pubKeyHash = paymentCredential.hash;
    console.log("🔑 Payment Key Hash:", pubKeyHash);
    
    // 3. Create a simple message to sign
    const message = "BIND|v1|test|addr123|1234567890";
    const messageBytes = fromText(message);
    
    console.log("\n📝 Message to sign:", message);
    console.log(`   Message bytes length: ${messageBytes.length}\n`);
  
    // 4. Sign the message using the wallet
    // Note: In the emulator, we'll simulate this since signData isn't available
    // In a real wallet, you'd do: const signed = await wallet.signData(address, messageHex);
    
    console.log("✍️  Signing message with wallet...");
    
    // For emulator testing, we'll create a mock signature structure
    // In production, the wallet returns a CIP-8 CBOR structure with:
    // - The signature (64 bytes for Ed25519)
    // - The public key (32 bytes for Ed25519)
    
    // Mock Ed25519 signature (64 bytes = 128 hex chars)
    const mockSignature = "a".repeat(128);
    const signatureBytes = fromHex(mockSignature);
    
    // Mock Ed25519 public key (32 bytes = 64 hex chars)
    // In reality, this would be extracted from the wallet's signing response
    const mockPublicKey = "b".repeat(64);
    const publicKeyBytes = fromHex(mockPublicKey);
    
    console.log("✅ Message signed (mock)");
    console.log(`   Public Key: ${mockPublicKey.substring(0, 16)}...`);
    console.log(`   Signature: ${mockSignature.substring(0, 16)}...\n`);
  
    // 5. Create the redeemer
    console.log("🔧 Creating redeemer with signature data...");
    
    const redeemer = Data.to({
      message: messageBytes,          // The original message
      public_key: publicKeyBytes,     // 32 bytes
      signature: signatureBytes,      // 64 bytes
    }, SimpleRedeemer);
    
    console.log("✅ Redeemer created\n");
  
    // 6. Load the validator
    const validatorCode = await readValidator(
      "../aiken/plutus.json",
      "binding_validator.binding_validator.spend"
    );
    const validator: Script = {
      type: "PlutusV3",
      script: validatorCode
    };
    
    const network = lucid.config().network;
    if (!network) throw new Error("Network not configured");
    const validatorAddress = validatorToAddress(network, validator);
    
    console.log("📍 Validator address:", validatorAddress);
  
    // 7. Create a UTxO at the validator
    console.log("\n📤 Creating UTxO at validator...");
    
    const createTx = await lucid
      .newTx()
      .pay.ToContract(
        validatorAddress,
        { kind: "inline", value: Data.void() },
        { lovelace: 5_000_000n }
      )
      .complete();
  
    const createSigned = await createTx.sign.withWallet().complete();
    const createTxHash = await createSigned.submit();
    await emulator.awaitBlock(1);
    
    console.log(`✅ UTxO created: ${createTxHash}\n`);
  
    // 8. Spend the UTxO with the signed message
    console.log("🔐 Spending UTxO with validator (checking signature)...");
    
    const validatorUtxos = await lucid.utxosAt(validatorAddress);
    if (validatorUtxos.length === 0) {
      throw new Error("No UTxOs found at validator");
    }
  
    const spendTx = await lucid
      .newTx()
      .collectFrom([validatorUtxos[0]], redeemer)
      .attach.SpendingValidator(validator)
      .pay.ToAddress(account.address, { lovelace: 4_000_000n })
      .complete();
  
    const spendSigned = await spendTx.sign.withWallet().complete();
    const spendTxHash = await spendSigned.submit();
    await emulator.awaitBlock(1);
  
    console.log(`✅ Transaction confirmed: ${spendTxHash}`);
    console.log("✅ Validator accepted the signature!\n");
  
    return spendTxHash;
  }
  
  // Example showing the real CIP-8 structure
  function showRealCIP8Structure() {
    console.log("\n📚 Real CIP-8 Signature Structure");
    console.log("===================================\n");
    
    console.log("When you call wallet.signData(address, messageHex), you get:");
    console.log(`
  {
    signature: "845846a201276761646472657373583900f1084...",  // CBOR-encoded
    key: "a4010103272006215820b2c3d4e5f6789012345..."      // CBOR-encoded COSE_Key
  }
    `);
    
    console.log("\nThe 'signature' field contains:");
    console.log("  - CBOR Map with:");
    console.log("    - 'address': Your Cardano address");
    console.log("    - 'signature': The actual Ed25519 signature (64 bytes)");
    console.log("    - 'key': Reference to the public key\n");
    
    console.log("The 'key' field contains (COSE_Key structure):");
    console.log("  - kty (1): 1 (OKP - Octet Key Pair)");
    console.log("  - alg (3): -8 (EdDSA)");
    console.log("  - crv (-1): 6 (Ed25519)");
    console.log("  - x (-2): <32 bytes> THE PUBLIC KEY ✅");
    
    console.log("\n🔍 To extract the public key:");
    console.log("  1. Look for CBOR pattern in 'key' field");
    console.log("  2. Find: 0x21 0x58 0x20 (byte string marker)");
    console.log("  3. Next 64 hex chars = 32-byte Ed25519 public key\n");
  }
  
  // Run the test
  async function run() {
    try {
      await simpleSignAndValidate();
      showRealCIP8Structure();
      
      console.log("🎉 All tests completed successfully!");
    } catch (error) {
      console.error("❌ Test failed:", error);
      process.exit(1);
    }
  }
  
  run();