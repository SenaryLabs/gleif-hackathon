/**
 * Global Configuration
 * 
 * Simple config with environment variable overrides
 */

export const config = {
  // Network configuration
  network: process.env.NEXT_PUBLIC_NETWORK || 'preprod',
  
  // Blockfrost configuration
  blockfrost: {
  projectId: process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID,
    baseUrl: process.env.NEXT_PUBLIC_BLOCKFROST_BASE_URL || 'https://cardano-preprod.blockfrost.io/api/v0',
  },
  
  // Issuer configuration
  issuer: {
    name: process.env.NEXT_PUBLIC_ISSUER_NAME || 'principia1-issuer',
    apiUrl: process.env.NEXT_PUBLIC_ISSUER_API || 'http://localhost:3001',
  },
} as const;
