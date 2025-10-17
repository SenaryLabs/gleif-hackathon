/**
 * Lucid Evolution Integration
 *
 * Centralized Lucid client management and transaction building utilities
 */

// Dynamic imports to prevent WASM loading during SSR
import { config } from "./config";

// Global Lucid instance
let lucidInstance: any | null = null;

/**
 * Initialize Lucid client with Blockfrost
 */
export async function initializeLucid(): Promise<any> {
  try {
    // Dynamic imports to prevent WASM loading during SSR
    const { Lucid, Blockfrost } = await import("@evolution-sdk/lucid");
    
    // Defensive checks: ensure required Blockfrost configuration is present
    if (!config.blockfrost.projectId) {
      throw new Error(
        "Missing Blockfrost projectId. Set your Blockfrost project id in the configuration or environment."
      );
    }
    if (!config.blockfrost.baseUrl) {
      console.warn(
        "Blockfrost baseUrl missing - using default public Blockfrost API endpoint"
      );
    }
    if (!config.network) {
      throw new Error("Missing network name in config.network");
    }

  // Create Blockfrost provider and initialize Lucid
  // Blockfrost is a runtime value import; use typeof for type annotation when available.
  let provider: InstanceType<any>;
    try {
      provider = new Blockfrost(
        config.blockfrost.baseUrl,
        config.blockfrost.projectId
      );
    } catch (err) {
      console.error("Failed to construct Blockfrost provider with", {
        blockfrost: config.blockfrost,
      });
      throw err;
    }

    // Resolve network name to the format expected by Evolution Lucid
    const networkArg = (() => {
      const n = config.network;
      if (n === "preprod") return "Preprod";
      if (n === "preview") return "Preview";
      if (n === "mainnet") return "Mainnet";
      if (n === "testnet") return "Testnet";
      return "Preprod";
    })();

    // Try initialization using available Lucid API surface
    let lucid: any;
    try {
      if (typeof (Lucid as any).new === "function") {
        lucid = await (Lucid as any).new(provider, networkArg);
      } else if (typeof (Lucid as any) === "function") {
        lucid = await (Lucid as any)(provider, networkArg);
      } else {
        throw new Error(
          "Unsupported Lucid import shape - neither Lucid.new nor Lucid() are callable"
        );
      }
    } catch (err) {
      console.error(
        "Lucid initialization failed using provider and networkArg",
        { provider: !!provider, networkArg, err }
      );
      throw err;
    }

    lucidInstance = lucid;
    return lucid;
  } catch (error) {
    console.error("Failed to initialize Lucid:", error);
    throw new Error(
      `Lucid initialization failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get the current Lucid instance
 */
export function getLucid(): any {
  if (!lucidInstance) {
    throw new Error("Lucid not initialized. Call initializeLucid() first.");
  }
  return lucidInstance;
}

/**
 * Initialize Lucid and connect to a CIP-30 wallet API
 */
export async function initializeLucidWithWallet(
  walletAPI: unknown
): Promise<any> {
  const lucid = await initializeLucid();
  
  console.log('[LUCID] Connecting wallet to Lucid instance...');
  console.log('[LUCID] Wallet API type:', typeof walletAPI);
  console.log('[LUCID] Wallet API methods:', walletAPI ? Object.keys(walletAPI as any) : 'null');
  
  // Evolution Lucid exposes selectWallet.fromAPI for CIP-30 integration
  if (walletAPI && (lucid as any).selectWallet?.fromAPI) {
    try {
      await (lucid as any).selectWallet.fromAPI(walletAPI);
      console.log('[LUCID] Wallet connected successfully');
    } catch (err) {
      console.error('[LUCID] Failed to connect wallet:', err);
      throw err;
    }
  } else {
    console.warn('[LUCID] selectWallet.fromAPI not available or walletAPI is null');
  }
  
  return lucid;
}

/**
 * Get wallet UTxOs
 */
export async function getWalletUTxOs(address: string): Promise<any[]> {
  try {
    const lucid = getLucid();
    return await lucid.provider.getUtxos(address);
  } catch (error) {
    console.error("Failed to get wallet UTxOs:", error);
    return [];
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  address: string
): Promise<{ lovelace: bigint; assets: Record<string, bigint> }> {
  try {
    const lucid = getLucid();
    const utxos = await getWalletUTxOs(address);

    let lovelace = BigInt(0);
    const assets: Record<string, bigint> = {};

    for (const utxo of utxos) {
      lovelace += utxo.assets.lovelace;
      for (const [unit, amount] of Object.entries(utxo.assets)) {
        if (unit !== "lovelace") {
          assets[unit] = (assets[unit] || BigInt(0)) + (amount as bigint);
        }
      }
    }

    return { lovelace, assets };
  } catch (error) {
    console.error("Failed to get wallet balance:", error);
    return { lovelace: BigInt(0), assets: {} };
  }
}

/**
 * Cleanup Lucid instance
 */
export function cleanupLucid(): void {
  lucidInstance = null;
}
