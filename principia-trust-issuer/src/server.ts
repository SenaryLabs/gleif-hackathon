import "dotenv/config";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { join } from "path";
import { SignifyClient, ready as signifyReady, Tier } from "signify-ts";
import { config } from "./config";
import { ACDC_SCHEMAS_ID, ISSUER_NAME, QVI_NAME } from "./consts";
import { log } from "./log";
import { router } from "./routes";
import { EndRole } from "./server.types";
import { PollingService } from "./services/pollingService";
import {
  createQVICredential,
  getEndRoles,
  getRegistry,
  isKERIAuthenticated,
  loadBrans,
  REGISTRIES_NOT_FOUND,
  reauthenticateKERI,
  resolveOobi,
  waitAndGetDoneOp,
} from "./utils/utils";

async function getSignifyClient(bran: string): Promise<SignifyClient> {
  const client = new SignifyClient(
    config.keria.url,
    bran,
    Tier.low,
    config.keria.bootUrl
  );

  try {
    console.log(`🔗 Connecting to KERIA at ${config.keria.url}...`);
    await client.connect();
    console.log("✅ Connected to KERIA successfully");
  } catch (err) {
    console.log("⚠️ Initial connection failed, booting KERIA...");
    try {
      await client.boot();
      await client.connect();
      console.log("✅ Booted and connected to KERIA successfully");
    } catch (bootErr: any) {
      console.error("❌ Failed to boot KERIA:", bootErr);
      throw new Error(`KERIA connection failed: ${bootErr.message}`);
    }
  }

  // Verify client is properly authenticated
  try {
    const state = await client.state();
    console.log("🔍 KERI client state:", JSON.stringify(state, null, 2));
    
    // Check client agent properties
    console.log("🔍 KERI client agent:", JSON.stringify(client.agent, null, 2));
    
    // Try different ways to get the AID
    const aid = (state as any).i || 
                (state as any).aid || 
                (state as any).prefix || 
                (state as any).identifier ||
                (client.agent as any)?.pre ||
                (client.agent as any)?.aid ||
                'unknown';
    
    console.log(`🔐 Client authenticated with AID: ${aid}`);
  } catch (authErr: any) {
    console.error("❌ Client authentication failed:", authErr);
    throw new Error(`KERI authentication failed: ${authErr.message}`);
  }

  // Resolve OOBIs with better error handling
  console.log("🔍 Resolving OOBIs...");
  const oobiPromises = ACDC_SCHEMAS_ID.map(async (schemaId) => {
    try {
      await resolveOobi(client, `${config.oobiEndpoint}/oobi/${schemaId}`);
      console.log(`✅ Resolved OOBI for schema: ${schemaId}`);
    } catch (err: any) {
      console.warn(`⚠️ Failed to resolve OOBI for schema ${schemaId}:`, err.message);
    }
  });

  await Promise.allSettled(oobiPromises);

  return client;
}

async function ensureIdentifierExists(
  client: SignifyClient,
  aidName: string
): Promise<void> {
  try {
    await client.identifiers().get(aidName);
  } catch (e: any) {
    const status = e.message.split(" - ")[1];
    if (/404/gi.test(status)) {
      const result = await client.identifiers().create(aidName);
      await waitAndGetDoneOp(client, await result.op());
      await client.identifiers().get(aidName);
    } else {
      throw e;
    }
  }
}

async function ensureEndRoles(
  client: SignifyClient,
  aidName: string
): Promise<void> {
  const roles = await getEndRoles(client, aidName);

  const hasDefaultRole = roles.some((role) => role.role === EndRole.AGENT);
  console.log("hasDefaultRole", hasDefaultRole);

  if (!hasDefaultRole) {
    await client
      .identifiers()
      .addEndRole(aidName, EndRole.AGENT, client.agent!.pre);
  }
  console.log("aidName", aidName);
  console.log("issuerName", ISSUER_NAME);

  if (
    aidName === ISSUER_NAME &&
    !roles.some((role) => role.role === EndRole.INDEXER)
  ) {
    console.log("adding indexer");
    const prefix = (await client.identifiers().get(aidName)).prefix;
    const endResult = await client
      .identifiers()
      .addEndRole(aidName, "indexer", prefix);
  
    await waitAndGetDoneOp(client, await endResult.op());
    const locRes = await client.identifiers().addLocScheme(aidName, {
      url: config.oobiEndpoint,
      scheme: new URL(config.oobiEndpoint).protocol.replace(":", ""),
    });
    await waitAndGetDoneOp(client, await locRes.op());
  }
}

async function ensureRegistryExists(
  client: SignifyClient,
  aidName: string
): Promise<void> {
  try {
    await getRegistry(client, aidName);
  } catch (e: any) {
    if (e.message.includes(REGISTRIES_NOT_FOUND)) {
      const result = await client
        .registries()
        .create({ name: aidName, registryName: "vLEI" });
      await waitAndGetDoneOp(client, await result.op());
    } else {
      throw e;
    }
  }
}

async function initializeCredentials(
  client: SignifyClient,
  issuerClient: SignifyClient
): Promise<string> {
  const issuerRegistry = await getRegistry(issuerClient, QVI_NAME);

  const qviCredentialId = await createQVICredential(
    client,
    issuerClient,
    issuerRegistry
  ).catch((e) => {
    console.error(e);
    return "";
  });

  console.log("qviCredentialId", qviCredentialId);
  const pollingService = new PollingService(client);
  pollingService.start();

  return qviCredentialId;
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use("/static", express.static("static"));
  app.use(
    "/oobi",
    express.static(join(__dirname, "schemas"), {
      setHeaders: (res) => {
        res.setHeader("Content-Type", "application/schema+json");
      },
    })
  );
  app.use(bodyParser.json());
  app.use(router);
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: err.message,
    });
  });

  app.listen(config.port, async () => {
    await signifyReady();
    const brans = await loadBrans();

    const signifyClient = await getSignifyClient(brans.bran);
    const signifyClientIssuer = await getSignifyClient(brans.issuerBran);

    // Ensure identifiers exist first
    await ensureIdentifierExists(signifyClient, ISSUER_NAME);
    await ensureIdentifierExists(signifyClientIssuer, QVI_NAME);

    // Add end roles before creating registries (KERIA bug workaround)
    await ensureEndRoles(signifyClient, ISSUER_NAME);
    await ensureEndRoles(signifyClientIssuer, QVI_NAME);

    // Now create registries
    await ensureRegistryExists(signifyClient, ISSUER_NAME);
    await ensureRegistryExists(signifyClientIssuer, QVI_NAME);

    app.set("signifyClient", signifyClient);
    app.set("signifyClientIssuer", signifyClientIssuer);
    app.set("keriaUrl", config.keria.url);

    // Add health check endpoint for KERI authentication
    app.get("/health/keri", async (req, res) => {
      try {
        const clientAuth = await isKERIAuthenticated(signifyClient);
        const issuerAuth = await isKERIAuthenticated(signifyClientIssuer);
        
        res.json({
          status: "ok",
          keri: {
            client: clientAuth ? "authenticated" : "not authenticated",
            issuer: issuerAuth ? "authenticated" : "not authenticated",
            timestamp: new Date().toISOString()
          }
        });
      } catch (error: any) {
        res.status(500).json({
          status: "error",
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    const qviCredentialId = await initializeCredentials(
      signifyClient,
      signifyClientIssuer
    );
    app.set("qviCredentialId", qviCredentialId);

    log(`Listening on port ${config.port}`);
  });
}

void startServer();
