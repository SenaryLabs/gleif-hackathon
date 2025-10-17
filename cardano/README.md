# Cardano Smart Contracts - Principia Bond MVP

This directory contains the Aiken implementation of verifiable smart contracts for the Principia ecosystem.

## Overview
Principia leverages Cardano's Plutus and Aiken frameworks to enforce compliance and identity on-chain. The smart contracts here implement the "VC-in-Redeemer" pattern, allowing on-chain logic to verify off-chain credentials (DIDs, VCs) as part of transaction validation.

## Key Components
- **BondMintingPolicy**: Main contract enforcing bond issuance rules, requiring valid verifiable credentials in the redeemer.
- **Verifiable Smart Contracts**: All contracts are written in Aiken for clarity, auditability, and security.
- **Test Scripts**: Emulator and test scripts demonstrate contract logic and credential verification.

## Learn More
See project documentation in `/docs` for architecture, compliance, and integration details.
