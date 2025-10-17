#!/usr/bin/env ts-node

/**
 * Persistent Test Agent
 * 
 * This script runs a persistent KERI agent for our test wallet
 * that can receive IPEX notifications and messages.
 * 
 * Features:
 * - Resolves issuer OOBIs automatically
 * - Receives and processes credential notifications
 * - Debugs vLEI credential acceptance errors
 * - Shows detailed error messages for debugging
 */

import { SignifyClient, ready as signifyReady, Tier, randomPasscode, Saider } from "signify-ts";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

// Import EndRole enum for getting agent OOBIs
const EndRole = {
  AGENT: "agent",
  CONTROLLER: "controller", 
  WITNESS: "witness",
  WATCHER: "watcher"
};

const KERIA_URL = "your-keria-endpoint-here";
const KERIA_BOOT_URL = "your-keria-boot-endpoint-here";
const TEST_WALLET_FILE = join(__dirname, "../data/test-wallet-bran.json");

async function main() {
  console.log("🤖 Starting Persistent Test Agent");
  console.log("🔗 KERIA URL:", KERIA_URL);
  
  // Initialize signify FIRST (needed for randomPasscode)
  await signifyReady();
  
  let data: any;
  let isNewWallet = false;
  
  if (!existsSync(TEST_WALLET_FILE)) {
    console.log("🆕 No saved wallet found. Creating new test wallet...");
    data = {
      bran: randomPasscode(),
      name: "test-vlei-wallet"
    };
    isNewWallet = true;
  } else {
    data = JSON.parse(readFileSync(TEST_WALLET_FILE, "utf8"));
    console.log("🔑 Using existing wallet");
  }
  
  const client = new SignifyClient(KERIA_URL, data.bran, Tier.low, KERIA_BOOT_URL);
  
  try {
    if (isNewWallet) {
      console.log("🔗 Booting new KERIA client...");
      await client.boot();
    }
    await client.connect();
    console.log("✅ Connected to KERIA");
    
    let identifier;
    
    if (isNewWallet) {
      console.log("📋 Creating new identifier...");
      const result = await client.identifiers().create(data.name);
      const op = await result.op();
      
      // Wait for operation to complete
      let operation = await client.operations().get(op.name);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 250));
        operation = await client.operations().get(op.name);
      }
      
      identifier = await client.identifiers().get(data.name);
      data.aid = identifier.prefix;
      
      // Save wallet info
      writeFileSync(TEST_WALLET_FILE, JSON.stringify(data, null, 2));
      console.log("✅ Created identifier:", identifier.prefix);
      console.log("💾 Saved wallet info");
    } else {
      identifier = await client.identifiers().get(data.name);
      console.log("📋 Loaded identifier:", identifier.prefix);
    }
    
    if (isNewWallet) {
      console.log("\n⚠️ IMPORTANT: Use this AID when issuing credentials:");
      console.log(`   ${identifier.prefix}`);
    }
    console.log("📋 Agent running for:", identifier.prefix);
    
    // Resolve issuer OOBIs
    // Note: This is the issuer's contact OOBI (served from keria-ext)
    // The ngrok endpoint (https://9c864798302b.ngrok-free.app) is for schemas/static content
    console.log("\n🔍 Resolving issuer OOBIs...");
    try {
  await client.oobis().resolve("your-oobi-endpoint-here", "Principia Trust Issuer");
      console.log("✅ Resolved Principia Trust Issuer OOBI (Issuer AID: EGrnSMKOerbf53LmKdz_d9fpGNz3T3cWGxzBuNzEcYqD)");
    } catch (e: any) {
      console.log("⚠️ Failed to resolve Principia Trust Issuer OOBI:", e.message);
    }
    
    try {
  await client.oobis().resolve("your-oobi-endpoint-here", "Principia QVI");
      console.log("✅ Resolved Principia QVI OOBI");
    } catch (e: any) {
      console.log("⚠️ Failed to resolve Principia QVI OOBI:", e.message);
    }
    
    // Check contacts
    const contacts = await client.contacts().list();
    console.log(`\n📋 Found ${contacts.length} contacts:`);
    for (const contact of contacts) {
      console.log(`  - ${contact.alias}: ${contact.id}`);
    }
    
    // Get the agent OOBI with explicit AGENT role
    const { SignifyClient: SC } = await import("signify-ts");
    const EndRole = (SC as any).EndRole || { AGENT: "agent" };
    
    let agentOobi;
    try {
      agentOobi = await client.oobis().get(identifier.prefix, EndRole.AGENT);
    } catch (e) {
      // Fallback to getting without role
      agentOobi = await client.oobis().get(identifier.prefix);
    }
    
    console.log("\n🔗 Agent OOBI:");
    console.log("   Raw OOBI object:", JSON.stringify(agentOobi, null, 2));
    
    // Construct the full OOBI URL with agent endpoint
    // Format: {KERIA_URL}/oobi/{AID}/agent/{agentAID}?name={name}
    let fullOobiUrl = `${KERIA_URL}/oobi/${identifier.prefix}`;
    
    // Check if agentOobi has the agent ID (endpoint role)
    if (agentOobi?.oobis && agentOobi.oobis.length > 0) {
      // The first OOBI should be the full URL with agent endpoint
      const firstOobi = agentOobi.oobis[0];
      console.log("   First OOBI:", firstOobi);
      
      // Use the first OOBI directly and add the name parameter
      fullOobiUrl = firstOobi.includes('?') 
        ? `${firstOobi}&name=test-vlei-wallet`
        : `${firstOobi}?name=test-vlei-wallet`;
    } else {
      // Fallback: just use the basic OOBI
      console.log("   ⚠️  No agent OOBI found in response, using basic URL");
      fullOobiUrl += `?name=test-vlei-wallet`;
    }
    
    console.log("\n🌐 Full OOBI URL:");
    console.log(`   ${fullOobiUrl}`);
    
    // Generate the complete curl command
    const curlCommand = `curl -X POST http://localhost:3001/resolveOobi -H "Content-Type: application/json" -d '{"oobi":"${fullOobiUrl}"}'`;
    
    console.log("\n📋 COPY AND RUN THIS COMMAND to make this agent visible in issuer contacts:");
    console.log("\n" + "=".repeat(80));
    console.log(curlCommand);
    console.log("=".repeat(80));
    console.log(`\n⚠️  IMPORTANT: Run the command above so the issuer can see this contact!`);
    console.log(`   After resolving, AID ${identifier.prefix} will appear in issuer's contacts.`);
    
    console.log("\n🔄 Agent is now running and listening for notifications...");
    console.log("   Press Ctrl+C to stop");
    
    const processedNotifications = new Set<string>();
    
    // Poll for notifications every 5 seconds
    setInterval(async () => {
      try {
        const notifications = await client.notifications().list();
        
        if (notifications.notes.length > 0) {
          const newNotes = notifications.notes.filter((note: any) => !processedNotifications.has(note.i));
          
          if (newNotes.length > 0) {
            console.log(`\n📬 Received ${newNotes.length} new notification(s):`);
          }
          
          for (const note of newNotes) {
            console.log(`   - ${note.a.r} (${note.a.d})`);
            processedNotifications.add(note.i);
            
            // Process IPEX Grant notifications (credential offers)
            if (note.a.r === "/exn/ipex/grant") {
              console.log("   🎫 Processing credential grant...");
              
              try {
                const exchange = await client.exchanges().get(note.a.d);
                const credential = exchange.exn.e.acdc;
                
                console.log("   📋 Credential details:");
                console.log(`      Schema: ${credential.s}`);
                console.log(`      Subject: ${credential.a.i}`);
                console.log(`      SAID: ${credential.d}`);
                
                // Check if it's a vLEI credential
                if (credential.s === "ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY") {
                  console.log("   🏛️ This is a vLEI credential!");
                  
                  // Check for QVI reference in edges
                  if (credential.e && credential.e.qvi) {
                    console.log(`   🔗 QVI Reference: ${credential.e.qvi.n}`);
                    console.log(`   🔗 QVI Schema: ${credential.e.qvi.s}`);
                    
                    // Try to access the QVI credential
                    try {
                      const qviCredential = await client.credentials().get(credential.e.qvi.n);
                      console.log("   ✅ QVI credential found and accessible");
                      console.log(`      QVI SAID: ${qviCredential.sad.d}`);
                      console.log(`      QVI Schema: ${qviCredential.sad.s}`);
                    } catch (e: any) {
                      console.log("   ❌ QVI credential not accessible:", e.message);
                      console.log("   💡 This is the exact error Veridian encounters!");
                    }
                  } else {
                    console.log("   ⚠️ No QVI reference found in credential edges");
                  }
                }
                
                // Try to accept the credential
                console.log("   🤝 Attempting to accept credential...");
                
                const dt = new Date().toISOString().replace("Z", "000+00:00");
                const [admit, sigs, aend] = await client.ipex().admit({
                  senderName: identifier.name,
                  message: "",
                  grantSaid: note.a.d,
                  datetime: dt,
                  recipient: exchange.exn.i,
                });
                
                await client.ipex().submitAdmit(identifier.name, admit, sigs, aend, [exchange.exn.i]);
                console.log("   ✅ Credential accepted successfully!");
                
              } catch (e: any) {
                console.log("   ❌ Failed to accept credential:", e.message);
                console.log("   💡 This shows the exact error Veridian encounters!");
                console.log("   📝 Error details:", e);
              }
            }
            
            // Mark notification as read
            await client.notifications().mark(note.i);
          }
        }
      } catch (e: any) {
        console.log("⚠️ Error checking notifications:", e.message);
        if (e.message.includes("401") || e.message.includes("Unauthorized")) {
          console.log("🔐 Authentication issue detected. Client may need to reconnect.");
        }
      }
    }, 5000);
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log("\n👋 Shutting down agent...");
      process.exit(0);
    });
    
    // Keep alive
    await new Promise(() => {});
    
  } catch (error: any) {
    console.error("❌ Agent failed:", error.message);
    process.exit(1);
  }
}

main();

