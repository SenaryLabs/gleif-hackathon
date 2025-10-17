# GLIEF Hackathon: Digital Assets and Financial Infrastructure

## Principia: A Trust Engine for Bond Tokenization, Leveraging Veridian and vLEI

### Overview
The Principia Trust Engine is the compliance and identity framework of the Principia ecosystem. Its purpose is to create a cryptographically-enforced, auditable link between real-world identity verification and on-chain actions. It moves beyond simple wallet whitelists to a dynamic, cryptographically secure system built on Decentralized Identifiers (DIDs), Verifiable Credentials (VCs), and Verifiable Smart Contracts. Its primary goal is to provide a practical, scalable, and auditable solution for meeting the stringent requirements of financial regulators.

### Architecture

**Layer 1: Identity & Credentialing Infrastructure**
This layer is responsible for all off-chain identity operations and the issuance of standards-compliant Verifiable Credentials.
- Principia Trust Issuer: A deployed service that functions as a Qualified vLEI Issuer (QVI) within a sandbox environment. It holds the logic for the eKYB/vLEI onboarding workflow and is the authoritative issuer of all credentials in the demonstration.
- Remote KERIA Sandbox: A managed KERI Agent service (provided by the Cardano Foundation) that acts as the cryptographic workhorse. The Principia Trust Issuer connects to this sandbox via API to execute all KERI-based operations.

**Layer 2: User & Application**
This is the user-facing layer where participants control their identities and construct transactions.
- Principia DApp: A web-based application that serves as the primary user interface and orchestration engine.
- Veridian-Style Identity Wallet: A user-controlled application that securely stores the user's private KERI keys, their DID, and all Verifiable Credentials.

**Layer 3: On-Chain Enforcement (Cardano Testnet)**
This is the immutable, decentralized environment where compliance rules are ultimately and deterministically enforced.
- Verifiable Smart Contracts: A suite of Plutus smart contracts written in Aiken, primarily the BondMintingPolicy. These contracts are the ultimate enforcement points, containing the "VC-in-Redeemer" logic.

## Learn More
See project documentation in `/docs` for architecture, compliance, and integration details.


# Setup

To run the Principia Trust Issuer service and Console:

1. **Issuer Service**
	 - Go to `principia-trust-issuer` directory.
	 - Install dependencies:
		 ```bash
		 npm install
		 cp env.example .env
		 # Edit .env with your configuration
		 npm run build
		 ./run.sh   # for development
		 npm start  # for production
		 ```

2. **Principia Console (Web App)**
	 - Go to `principia-console` directory.
	 - Install dependencies:
		 ```bash
		 npm install
		 cp .env.example .env
		 # Edit .env with your configuration
		 npm run dev   # for development
		 npm run build && npm start  # for production
		 ```

3. **Veridian Wallet**
	 - For identity management and credential storage, use the Veridian Wallet:
		 [cardano-foundation/veridian-wallet](https://github.com/cardano-foundation/veridian-wallet/tree/main)

Ensure all services are configured to use the correct KERI endpoints and public URLs.
docker run -p 3001:3001 -e KERIA_ENDPOINT=... sandbox-credserver
