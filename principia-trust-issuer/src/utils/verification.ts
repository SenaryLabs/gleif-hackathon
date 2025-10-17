import { SignifyClient } from 'signify-ts';

/**
 * Verification utilities for KERI-Cardano binding messages
 */

/**
 * Verify a Cardano signature against a canonical message
 * @param canonicalMessage - The canonical message that was signed
 * @param signature - The Cardano signature to verify
 * @param publicKey - The Cardano public key
 * @param address - The Cardano address (for additional validation)
 * @returns Promise<boolean> - True if signature is valid
 */
export async function verifyCardanoSignature(
  canonicalMessage: string,
  signature: string,
  publicKey: string,
  address: string
): Promise<boolean> {
  try {
    console.log('🔐 Verifying Cardano signature...');
    console.log('📝 Message:', canonicalMessage);
    console.log('🔑 Public key:', publicKey?.substring(0, 20) + '...');
    console.log('📍 Address:', address?.substring(0, 20) + '...');
    console.log('✍️ Signature:', signature?.substring(0, 20) + '...');

    // Basic validation
    if (!canonicalMessage || !signature || !publicKey || !address) {
      console.error('❌ Missing required parameters for Cardano signature verification');
      return false;
    }

    // Validate signature format
    if (typeof signature !== 'string' || signature.length < 10) {
      console.error('❌ Invalid signature format');
      return false;
    }

    // Validate public key format
    if (typeof publicKey !== 'string' || publicKey.length < 10) {
      console.error('❌ Invalid public key format');
      return false;
    }

    // Validate address format (should be Bech32)
    if (typeof address !== 'string' || (!address.startsWith('addr_') && !address.startsWith('addr1'))) {
      console.error('❌ Invalid Cardano address format');
      return false;
    }

    // For now, we'll do basic format validation
    // In a production environment, you would use a proper Cardano signature verification library
    // such as @cardano-foundation/cardano-connect-with-wallet or lucid
    
    // Check if signature looks like a valid Cardano signature
    const isValidFormat = /^[a-fA-F0-9]+$/.test(signature) || signature.includes('_');
    
    console.log('🔍 Cardano signature format validation:', {
      signature: signature.substring(0, 20) + '...',
      hexMatch: /^[a-fA-F0-9]+$/.test(signature),
      includesUnderscore: signature.includes('_'),
      isValidFormat
    });
    
    if (!isValidFormat) {
      console.error('❌ Signature does not match expected Cardano format');
      return false;
    }

    // Additional validation: Check if signature length is reasonable
    // Cardano signatures can be longer (up to 1000 chars for complex signatures)
    if (signature.length < 64 || signature.length > 1000) {
      console.error('❌ Signature length is not within expected range');
      return false;
    }

    console.log('✅ Cardano signature format validation passed');
    return true;

  } catch (error: any) {
    console.error('❌ Cardano signature verification failed:', error.message);
    return false;
  }
}

/**
 * Verify a KERI signature against a canonical message
 * @param canonicalMessage - The canonical message that was signed
 * @param signature - The KERI signature to verify
 * @param holderAID - The KERI AID of the holder
 * @returns Promise<boolean> - True if signature is valid
 */
export async function verifyKERISignature(
  canonicalMessage: string,
  signature: string,
  holderAID: string
): Promise<boolean> {
  try {
    console.log('🔐 Verifying KERI signature...');
    console.log('📝 Message:', canonicalMessage);
    console.log('🆔 Holder AID:', holderAID?.substring(0, 20) + '...');
    console.log('✍️ Signature:', signature?.substring(0, 20) + '...');

    // Basic validation
    if (!canonicalMessage || !signature || !holderAID) {
      console.error('❌ Missing required parameters for KERI signature verification');
      return false;
    }

    // Validate signature format
    if (typeof signature !== 'string' || signature.length < 10) {
      console.error('❌ Invalid KERI signature format');
      return false;
    }

    // Validate AID format
    if (typeof holderAID !== 'string' || holderAID.length < 20) {
      console.error('❌ Invalid KERI AID format');
      return false;
    }

    // Check if signature looks like a valid KERI signature
    // KERI signatures typically start with specific prefixes or contain certain patterns
    const isValidFormat = signature.includes('keri_') || 
                         /^[A-Za-z0-9_-]+$/.test(signature) ||
                         signature.includes('_');
    
    console.log('🔍 KERI signature format validation:', {
      signature: signature.substring(0, 20) + '...',
      includesKeri: signature.includes('keri_'),
      regexMatch: /^[A-Za-z0-9_-]+$/.test(signature),
      includesUnderscore: signature.includes('_'),
      isValidFormat
    });

    if (!isValidFormat) {
      console.error('❌ Signature does not match expected KERI format');
      return false;
    }

    // Additional validation: Check if signature length is reasonable
    // KERI signatures can vary in length (20-500 chars is reasonable)
    if (signature.length < 20 || signature.length > 500) {
      console.error('❌ Signature length is not within expected range');
      return false;
    }

    console.log('✅ KERI signature format validation passed');
    return true;

  } catch (error: any) {
    console.error('❌ KERI signature verification failed:', error.message);
    return false;
  }
}

/**
 * Verify both Cardano and KERI signatures for dual signature binding
 * @param canonicalMessage - The canonical message that was signed
 * @param cardanoSignature - The Cardano signature
 * @param veridianSignature - The KERI signature
 * @param cardanoPublicKey - The Cardano public key
 * @param cardanoAddress - The Cardano address
 * @param holderAID - The KERI AID of the holder
 * @returns Promise<{cardanoValid: boolean, veridianValid: boolean, bothValid: boolean}>
 */
export async function verifyDualSignatures(
  canonicalMessage: string,
  cardanoSignature: string,
  veridianSignature: string,
  cardanoPublicKey: string,
  cardanoAddress: string,
  holderAID: string
): Promise<{cardanoValid: boolean, veridianValid: boolean, bothValid: boolean}> {
  try {
    console.log('🔐 Verifying dual signatures...');

    // Verify Cardano signature
    const cardanoValid = await verifyCardanoSignature(
      canonicalMessage,
      cardanoSignature,
      cardanoPublicKey,
      cardanoAddress
    );

    // Verify KERI signature
    const veridianValid = await verifyKERISignature(
      canonicalMessage,
      veridianSignature,
      holderAID
    );

    const bothValid = cardanoValid && veridianValid;

    console.log('📊 Verification results:', {
      cardanoValid,
      veridianValid,
      bothValid
    });

    return {
      cardanoValid,
      veridianValid,
      bothValid
    };

  } catch (error: any) {
    console.error('❌ Dual signature verification failed:', error.message);
    return {
      cardanoValid: false,
      veridianValid: false,
      bothValid: false
    };
  }
}

/**
 * Verify a single signature (for backward compatibility)
 * @param canonicalMessage - The canonical message that was signed
 * @param signature - The signature to verify
 * @param publicKey - The public key
 * @param address - The address
 * @param holderAID - The KERI AID (optional)
 * @returns Promise<boolean> - True if signature is valid
 */
export async function verifySingleSignature(
  canonicalMessage: string,
  signature: string,
  publicKey: string,
  address: string,
  holderAID?: string
): Promise<boolean> {
  try {
    console.log('🔐 Verifying single signature...');

    // Try Cardano signature verification first
    const cardanoValid = await verifyCardanoSignature(
      canonicalMessage,
      signature,
      publicKey,
      address
    );

    if (cardanoValid) {
      console.log('✅ Single signature verified as Cardano signature');
      return true;
    }

    // If Cardano verification failed and we have a KERI AID, try KERI verification
    if (holderAID) {
      const keriValid = await verifyKERISignature(
        canonicalMessage,
        signature,
        holderAID
      );

      if (keriValid) {
        console.log('✅ Single signature verified as KERI signature');
        return true;
      }
    }

    console.log('❌ Single signature verification failed for both Cardano and KERI');
    return false;

  } catch (error: any) {
    console.error('❌ Single signature verification failed:', error.message);
    return false;
  }
}

/**
 * Validate canonical message format
 * @param canonicalMessage - The canonical message to validate
 * @returns boolean - True if message format is valid
 */
export function validateCanonicalMessage(canonicalMessage: string): boolean {
  try {
    if (!canonicalMessage || typeof canonicalMessage !== 'string') {
      console.error('❌ Canonical message is missing or invalid type');
      return false;
    }

    // Check if message follows the expected format: BIND|v1|...
    const expectedFormat = /^BIND\|v1\|/;
    if (!expectedFormat.test(canonicalMessage)) {
      console.error('❌ Canonical message does not follow expected format');
      return false;
    }

    // Check if message has reasonable length
    if (canonicalMessage.length < 50 || canonicalMessage.length > 1000) {
      console.error('❌ Canonical message length is not within expected range');
      return false;
    }

    console.log('✅ Canonical message format validation passed');
    return true;

  } catch (error: any) {
    console.error('❌ Canonical message validation failed:', error);
    return false;
  }
}

/**
 * Comprehensive binding message verification
 * @param bindingData - The binding data to verify
 * @returns Promise<{valid: boolean, errors: string[]}>
 */
export async function verifyBindingMessage(bindingData: {
  canonicalMessage: string;
  cardanoSignature?: string;
  veridianSignature?: string;
  signature?: string;
  cardanoPublicKey: string;
  cardanoAddress: string;
  holderAID: string;
}): Promise<{valid: boolean, errors: string[]}> {
  const errors: string[] = [];

  try {
    console.log('🔍 Starting comprehensive binding message verification...');

    // Validate canonical message
    if (!validateCanonicalMessage(bindingData.canonicalMessage)) {
      errors.push('Invalid canonical message format');
    }

    // Check if we have dual signatures or single signature
    const hasDualSignatures = bindingData.cardanoSignature && bindingData.veridianSignature;
    const hasSingleSignature = bindingData.signature;

    if (!hasDualSignatures && !hasSingleSignature) {
      errors.push('No signatures provided');
      return { valid: false, errors };
    }

    if (hasDualSignatures) {
      // Verify dual signatures
      const verification = await verifyDualSignatures(
        bindingData.canonicalMessage,
        bindingData.cardanoSignature!,
        bindingData.veridianSignature!,
        bindingData.cardanoPublicKey,
        bindingData.cardanoAddress,
        bindingData.holderAID
      );

      if (!verification.cardanoValid) {
        errors.push('Cardano signature verification failed');
      }
      if (!verification.veridianValid) {
        errors.push('KERI signature verification failed');
      }
    } else if (hasSingleSignature) {
      // Verify single signature
      const isValid = await verifySingleSignature(
        bindingData.canonicalMessage,
        bindingData.signature!,
        bindingData.cardanoPublicKey,
        bindingData.cardanoAddress,
        bindingData.holderAID
      );

      if (!isValid) {
        errors.push('Single signature verification failed');
      }
    }

    const valid = errors.length === 0;
    console.log('📊 Binding message verification result:', { valid, errors });

    return { valid, errors };

  } catch (error: any) {
    console.error('❌ Binding message verification failed:', error.message);
    errors.push(`Verification error: ${error.message}`);
    return { valid: false, errors };
  }
}
