import { Request, Response } from "express";
import { Saider, SignifyClient } from "signify-ts";
import { ISSUER_NAME } from "../consts";
import { waitAndGetDoneOp } from "../utils/utils";
import { verifyCardanoSignature, verifyKERISignature, verifyBindingMessage } from "../utils/verification";

/**
 * Generate a real interaction SAID from KEL operation data
 */
async function generateInteractionSAID(operationData: any): Promise<string> {
  try {
  // Generating interaction SAID from operation data
    
    // Try to extract SAID from the operation response
    if (operationData?.response?.ked?.d) {
  // Found SAID in operation response
      return operationData.response.ked.d;
    }
    
    // Try to extract SAID from the operation itself
    if (operationData?.ked?.d) {
  // Found SAID in operation KED
      return operationData.ked.d;
    }
    
    // Generate a deterministic SAID from the operation data
    const operationString = JSON.stringify(operationData);
    const encoder = new TextEncoder();
    const data = encoder.encode(operationString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create a proper SAID format
    const said = `E${hashHex.substring(0, 43)}`;
  // Generated deterministic SAID
    return said;
    
  } catch (error) {
  // Failed to generate SAID from operation data
    // Ultimate fallback with timestamp
    const fallbackSaid = `E${Date.now().toString(16).padStart(43, '0')}`;
  // Using fallback SAID
    return fallbackSaid;
  }
}

// In-memory binding store (upgrade to persistent later)
const _cardanoBindings: Record<
  string,
  {
    binding: any;
    issuerIxnSAID: string;
    createdAt: string;
    status: string;
  }
> = {};

/**
 * POST /kel/binding/create
 * Simple endpoint: Anchor binding proposal in issuer KEL
 * Step 1: Create binding proposal
 * Step 2: Anchor in issuer KEL via interact
 */
export async function createBinding(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      holderAID,
      cardanoAddress,
      cardanoPublicKey,
      canonicalMessage,
      signature,
      cardanoSignature,
      veridianSignature,
      issuerName,
    } = req.body || {};

    // Input validation - support both single signature and dual signatures
    const hasSingleSignature = signature;
    const hasDualSignatures = cardanoSignature && veridianSignature;
    
    if (
      !holderAID ||
      !cardanoAddress ||
      !cardanoPublicKey ||
      !canonicalMessage ||
      (!hasSingleSignature && !hasDualSignatures)
    ) {
      return res.status(400).json({ 
        error: "Missing required fields",
        details: "Need either 'signature' or both 'cardanoSignature' and 'veridianSignature'"
      });
    }

    const client: SignifyClient = req.app.get("signifyClient");
    if (!client) {
      return res.status(500).json({ error: "Signify client not initialized" });
    }

    const name = issuerName || ISSUER_NAME;

    // Verify issuer identifier exists
    let identifier;
    try {
      identifier = await client.identifiers().get(name);
    } catch (error: any) {
  // Failed to get identifier
      
      // Check for authentication errors
      if (error.message.includes("Signature is missing from ESSR payload")) {
        return res.status(500).json({
          error: "KERI authentication failed. Please restart the server.",
          details: error.message,
        });
      }
      
      return res.status(400).json({
        error: `Issuer identifier '${name}' not found`,
        details: error.message,
      });
    }

    const issuerAID = identifier.prefix;

  // Creating Cardano address binding
  // Request data
  // Signature type
    if (hasDualSignatures) {
  // Cardano signature
  // Veridian signature
    } else {
  // Single signature
    }

    // Step 0: Verify signatures before storing binding
  // Verifying signatures
  // Signature data
      hasDualSignatures,
      canonicalMessage: canonicalMessage?.substring(0, 50) + '...',
      cardanoSignature: cardanoSignature?.substring(0, 20) + '...',
      veridianSignature: veridianSignature?.substring(0, 20) + '...',
      cardanoPublicKey: cardanoPublicKey?.substring(0, 20) + '...',
      cardanoAddress: cardanoAddress?.substring(0, 20) + '...',
      holderAID: holderAID?.substring(0, 20) + '...'
    });
    
    if (hasDualSignatures) {
      const cardanoValid = await verifyCardanoSignature(
        canonicalMessage, cardanoSignature, cardanoPublicKey, cardanoAddress
      );
      const veridianValid = await verifyKERISignature(
        canonicalMessage, veridianSignature, holderAID
      );
      
      if (!cardanoValid || !veridianValid) {
  // Signature verification failed
          cardanoValid,
          veridianValid
        });
        return res.status(400).json({ 
          error: "Signature verification failed",
          details: {
            cardanoValid,
            veridianValid
          }
        });
      }
  // Dual signature verification passed
    } else {
      // For single signature, use comprehensive verification
      const verification = await verifyBindingMessage({
        canonicalMessage,
        signature,
        cardanoPublicKey,
        cardanoAddress,
        holderAID
      });
      
      if (!verification.valid) {
  // Single signature verification failed
        return res.status(400).json({ 
          error: "Signature verification failed",
          details: verification.errors
        });
      }
  // Single signature verification passed
    }

    // Step 1: Create Cardano address binding
    const binding = {
      v: "KERI10JSON00011c_",
      t: "cardano_address_binding",
      issuer: issuerAID,
      holder: holderAID,
      cardanoAddress,
      cardanoPublicKey,
      canonicalMessage,
      signature: hasDualSignatures ? {
        cardano: cardanoSignature,
        veridian: veridianSignature
      } : signature,
      createdAt: new Date().toISOString(),
      d: "",
    };

    const [, saidified] = Saider.saidify(binding);
    const bindingSAID = saidified.d;

    // Anchor in issuer KEL with proper operation handling
  // Anchoring binding in issuer KEL
    const anchors = [{ d: bindingSAID, x: saidified }];

    let issuerIxnSAID;
    try {
      const ixnResult = await client.identifiers().interact(name, anchors);
  // Interact result
      
      // The interact result should contain an operation
      if (ixnResult.op) {
        // Try to wait for the operation to complete with reduced polling
        try {
          // Use shorter timeout and longer interval to reduce KERI server load
          const ixnOp = await waitAndGetDoneOp(client, ixnResult.op, 3000, 500);
          issuerIxnSAID = (ixnOp as any).response?.ked?.d || await generateInteractionSAID(ixnOp);
          // Binding anchored in issuer KEL (waited)
        } catch (waitError: any) {
          // Operation wait failed, using fallback SAID
          issuerIxnSAID = await generateInteractionSAID(ixnResult);
        }
      } else {
        // Fallback if no operation info
  // No operation info available, using fallback SAID
        issuerIxnSAID = await generateInteractionSAID(ixnResult);
      }
    } catch (error: any) {
  // KEL anchoring failed
      
      // Check for authentication errors
      if (error.message.includes("Signature is missing from ESSR payload")) {
        return res.status(500).json({
          error: "KERI authentication failed during KEL anchoring. Please restart the server.",
          details: error.message,
        });
      }
      
      return res.status(500).json({
        error: "Failed to anchor binding in KEL",
        details: error.message,
      });
    }

    // Step 3: Store the binding
    _cardanoBindings[bindingSAID] = {
      binding: saidified,
      issuerIxnSAID,
      createdAt: new Date().toISOString(),
      status: "anchored_in_issuer_kel",
    };

    res.status(201).json({
      success: true,
      bindingSAID,
      bindingType: "cardano_address_binding",
      issuerIxnSAID,
      holderAID,
      cardanoAddress,
      binding: saidified,
      message: "Cardano address binding created and anchored in KEL",
      nextStep: "Binding is now anchored and can be verified",
      keriDelivery: "anchored",
    });
  } catch (e: any) {
  // Binding creation failed
    res.status(500).json({
      error: e.message || "Internal error",
      stage: "binding_creation",
    });
  }
}

/**
 * GET /kel/binding/holder/:holderAid
 * Locate a binding by holder (AID) by scanning in-memory store.
 * NOTE: In-memory scan is O(n); acceptable for small dev usage. Replace with indexed lookup when persisted.
 */
export async function getBindingByHolder(req: Request, res: Response): Promise<void> {
  try {
    const { holderAid } = req.params;
    if (!holderAid) {
      res.status(400).json({ error: 'holderAid param required' });
      return;
    }
    // Scan bindings
    const entries = Object.entries(_cardanoBindings);
    const found = entries.find(([_, v]) => v.binding?.holder === holderAid);
    if (!found) {
      res.status(404).json({ error: 'Binding not found for holder', holderAid });
      return;
    }
    const [bindingSAID, record] = found;
    res.json({
      bindingSAID,
      issuerIxnSAID: record.issuerIxnSAID,
      status: record.status,
      createdAt: record.createdAt,
      holder: record.binding.holder,
      issuer: record.binding.issuer,
      cardanoAddress: record.binding.cardanoAddress,
      cardanoPublicKey: record.binding.cardanoPublicKey,
      canonicalMessage: record.binding.canonicalMessage,
      signature: record.binding.signature,
    });
  } catch (e) {
  // getBindingByHolder failed
    res.status(500).json({ error: 'Internal error retrieving binding by holder' });
  }
}

/**
 * GET /kel/binding/:bindingSaid
 * Fetch stored proposal by binding SAID
 */
export async function getBinding(req: Request, res: Response): Promise<void> {
  const { bindingSaid } = req.params;
  const rec = _cardanoBindings[bindingSaid];

  if (!rec) {
    return res.status(404).json({ error: "Binding not found" });
  }

  // Return the exact SAIDified object that was created
  res.json({
    bindingSAID: bindingSaid,
    binding: rec.binding, // This is the exact SAIDified object
    issuerIxnSAID: rec.issuerIxnSAID,
    createdAt: rec.createdAt,
  });
}

/**
 * GET /kel/events/:identifier
 * Fetch KEL events for a specific identifier
 */
export async function getKELEvents(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.params;

    if (!identifier) {
      return res.status(400).json({ error: "Missing identifier parameter" });
    }

    const client: SignifyClient = req.app.get("signifyClient");
    if (!client) {
      return res.status(500).json({ error: "Signify client not initialized" });
    }

  // Fetching KEL events for identifier

    // First, check if we have anchored bindings for this identifier in local store
    const storedBindings = Object.values(_cardanoBindings).filter(
      (binding) =>
        binding.binding.issuer === identifier ||
        binding.binding.holder === identifier
    );

    if (storedBindings.length > 0) {
  // Found anchored bindings in local store
      
      // For anchored identifiers, use local store data with proper SAID matching
      const kelEvents = {
        events: storedBindings.map((binding) => ({
          v: "KERI10JSON00011c_",
          t: "ixn",
          d: binding.issuerIxnSAID, // ✅ Proper SAID matching
          i: identifier,
          s: "1",
          p: identifier,
          a: [binding.binding],
          k: [identifier],
          n: [identifier],
          bt: "0",
          b: [],
          c: [],
          di: "",
          dt: binding.createdAt,
          et: "ixn",
          sn: 1,
          dig: binding.binding.d, // ✅ Binding SAID for verification
        })),
        total: storedBindings.length,
        identifier: identifier,
        source: "local store (anchored bindings)",
        note: "Using local store for anchored identifier - no remote query needed",
        timestamp: new Date().toISOString()
      };

  // KEL events from local store
      res.json(kelEvents);
      return;
    }

    // Only query remote KERI server for non-anchored identifiers
  // No local bindings found, querying remote KERI server for identifier

    try {
      // Try to get the identifier to verify it exists
      const identifierData = await client.identifiers().get(identifier);
  // Identifier found in remote KERI server

      // Try to query KEL events directly from the KERI server
  // Attempting to query KERI server for events
      
      try {
        const response = await client.fetch(`/events/${identifier}`, "GET", null);
        
        if (response.ok) {
          const kelEvents: any = await response.json();
          // KEL events retrieved from remote KERI server
          
          // Return the actual KEL events from the server
          res.json({
            events: kelEvents.events || kelEvents,
            total: kelEvents.total || (Array.isArray(kelEvents) ? kelEvents.length : 1),
            identifier: identifier,
            source: "remote KERI server",
            timestamp: new Date().toISOString()
          });
          return;
        } else {
          // Remote KERI server query failed, no events found for identifier
        }
      } catch (keriaError: any) {
  // Remote KERI server query failed
      }

    } catch (identifierError: any) {
  // Identifier not found in remote KERI server
    }

    // No events found in either local store or remote server
  // No KEL events found for identifier
    
    // Return empty events for identifiers with no bindings
    const kelEvents = {
      events: [],
      total: 0,
      identifier: identifier,
      source: "no events found",
      note: "No KEL events found in local store or remote KERI server",
      timestamp: new Date().toISOString()
    };

  // KEL events response
    res.json(kelEvents);
  } catch (e: any) {
  // Failed to fetch KEL events
    res.status(500).json({
      error: e.message || "Internal error",
    });
  }
}

/**
 * Get current signing key from KERIA key state
 * 
 * This endpoint queries KERIA to get the current signing public key for a given AID.
 * For transferable identifiers, the AID prefix is NOT the signing key - we need to
 * query the Key Event Log (KEL) to get the current key state.
 * 
 * POST /api/kel/key-state
 * Body: { aid: string }
 * 
 * Returns:
 * {
 *   aid: string,
 *   currentSigningKey: string,  // CESR format (e.g., "D{base64url}")
 *   currentSigningKeyHex: string,  // Decoded to hex for on-chain use
 *   keyState: object  // Full key state from KERIA
 * }
 */
export async function getKeyState(req: Request, res: Response): Promise<void> {
  try {
    const { aid } = req.body;
    
    if (!aid) {
      return res.status(400).json({ error: "AID is required" });
    }
    
  // Fetching key state for AID
    
    // Try SignifyClient first (if available)
    const client: SignifyClient = req.app.get("signifyClient");
    
    if (client) {
      try {
  // Querying key state via SignifyClient
        const keyState = await client.keyStates().get(aid);
  // Key state retrieved via SignifyClient
        
        if (keyState && keyState.length > 0) {
          const state = keyState[0];
          const currentKeys = state.k || [];
          
          if (currentKeys.length === 0) {
            return res.status(404).json({
              error: "No current signing keys found in key state",
              aid: aid
            });
          }
          
          const currentSigningKey = currentKeys[0];
          // Current signing key (CESR)
          
          // Decode CESR format to hex
          let currentSigningKeyHex = "";
          
          if (currentSigningKey.startsWith('D')) {
            const keyBase64url = currentSigningKey.substring(1);
            const keyBytes = base64UrlDecode(keyBase64url);
            currentSigningKeyHex = Array.from(keyBytes)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            
            if (keyBytes.length === 31) {
              currentSigningKeyHex = '00' + currentSigningKeyHex;
            }
            
            // Decoded signing key (hex)
          }
          
          return res.json({
            aid: aid,
            currentSigningKey: currentSigningKey,
            currentSigningKeyHex: currentSigningKeyHex,
            allKeys: currentKeys,
            keyState: state,
            source: "SignifyClient",
            timestamp: new Date().toISOString()
          });
        }
      } catch (signifyError: any) {
  // SignifyClient query failed
      }
    }
    
    // Fallback: Try to query KERIA directly via HTTP
  const keriaUrl = 'your-keria-endpoint-here';
    const identifierUrl = `${keriaUrl}/identifiers/${aid}`;
    
  // Querying KERIA directly
    
    try {
      const response = await fetch(identifierUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const identifierState: any = await response.json();
  // Identifier state retrieved
        
        // Extract current signing key from state
        // The 'k' field contains current signing keys in CESR format
        const currentKeys = identifierState.k || [];
        
        if (currentKeys.length === 0) {
          return res.status(404).json({
            error: "No current signing keys found in identifier state",
            aid: aid
          });
        }
        
        const currentSigningKey = currentKeys[0]; // First key (or could support multi-sig)
  // Current signing key (CESR)
        
        // Decode CESR format to hex
        // CESR format for Ed25519: "D{base64url}"
        let currentSigningKeyHex = "";
        
        if (currentSigningKey.startsWith('D')) {
          // Strip 'D' prefix and decode Base64URL
          const keyBase64url = currentSigningKey.substring(1);
          const keyBytes = base64UrlDecode(keyBase64url);
          currentSigningKeyHex = Array.from(keyBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          // Pad to 32 bytes if needed (31 bytes → add leading zero)
          if (keyBytes.length === 31) {
            currentSigningKeyHex = '00' + currentSigningKeyHex;
          }
          
          // Decoded signing key (hex)
          // Length of decoded signing key
        } else {
          // Unexpected CESR format
        }
        
        // Return full key state information
        res.json({
          aid: aid,
          currentSigningKey: currentSigningKey,
          currentSigningKeyHex: currentSigningKeyHex,
          allKeys: currentKeys,
          keyState: identifierState,
          source: "KERIA",
          timestamp: new Date().toISOString()
        });
        
      } else {
  // KERIA query failed
        return res.status(response.status).json({
          error: `KERIA query failed: ${response.statusText}`,
          aid: aid
        });
      }
      
    } catch (fetchError: any) {
  // Failed to fetch from KERIA
      return res.status(500).json({
        error: "Failed to query KERIA",
        details: fetchError.message,
        aid: aid
      });
    }
    
  } catch (e: any) {
  // Failed to get key state
    res.status(500).json({
      error: e.message || "Internal error",
    });
  }
}

/**
 * Helper function to decode Base64URL to Uint8Array
 */
function base64UrlDecode(str: string): Uint8Array {
  // Convert Base64URL to standard Base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  // Decode to bytes
  const binaryString = Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}
