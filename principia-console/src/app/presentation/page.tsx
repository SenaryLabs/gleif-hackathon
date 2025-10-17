"use client";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrincipiaLogo } from '@/components/PrincipiaLogo';

export default function PresentationPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 px-4">
      <header className="space-y-6">
        <div className="flex items-start justify-between">
          <PrincipiaLogo className="h-10 w-auto" />
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-primary mt-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] text-slate-900">Global vLEI Hackathon 2025</h1>
  <p className="text-lg text-slate-600 max-w-3xl font-medium leading-relaxed">Theme 1: Digital Assets & Financial Infrastructures</p>

      </header>

      <div className="space-y-14">
        {/* Executive Summary */}
        <section id="executive-summary" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Executive Summary</h2>
          <p className="text-base text-slate-700 leading-relaxed max-w-3xl">
            The <strong>Principia</strong> is an institutional-grade framework for the issuance, management, and trading of tokenized bonds on the Cardano blockchain. The protocol's primary value proposition is the creation of a more efficient, accessible, and liquid market for debt capital formation. By representing bonds as programmable, on-chain assets, Principia unlocks benefits such as fractionalization, automated lifecycle management, enhanced transparency, and faster settlement.
          </p>
          <p className="text-base text-slate-700 leading-relaxed max-w-3xl">
            This is enabled by a <em>compliance-by-design</em> architecture. This modular framework facilitates automated compliance by cryptographically linking on-chain identity via DIDs to real-world legal entities. Core innovations include: (1) the Modular Debt Instrument Design; (2) the Verifiable Indenture, a DID-anchored representation of a bond's legal terms; and (3) the Principia Trust Engine, a reusable compliance framework that enforces verifiable corporate authority using Verifiable Credentials and the GLEIF vLEI standard. By providing the foundational identity layer required for regulated finance, Principia provides a secure and compliant gateway for unlocking the vast potential of on-chain capital markets.
          </p>
          <p className="text-base text-slate-700 leading-relaxed max-w-3xl">
            The <strong>Trust Engine</strong> is the compliance and identity framework of the Principia ecosystem. Its purpose is to create a cryptographically-enforced, auditable link between real-world identity verification and on-chain actions. It moves beyond simple wallet whitelists to a dynamic, cryptographically secure system built on Decentralized Identifiers (DIDs), Verifiable Credentials (VCs), and Verifiable Smart Contracts. Its primary goal is to provide a practical, scalable, and auditable solution for meeting the stringent requirements of financial regulators like VARA, DIFC and ADGM.
          </p>
        </section>

        {/* Immediate Hackathon Objectives */}
        <section id="hackathon-objectives" className="space-y-5">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-slate-900">Immediate Hackathon Objectives</h1>
          <p className="text-base text-slate-700 leading-relaxed max-w-3xl">Deliver a functional, end-to-end MVP on the Cardano testnet demonstrating the complete <em>Flow of Verifiable Trust</em>:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 max-w-3xl">
            <li>Issue a vLEI credential chain to a business entity off-chain.</li>
            <li>Verify the credential on-chain within a smart contract to initiate bond issuance.</li>
            <li>Create a compliant, identity-verified digital asset upon successful verification.</li>
          </ul>
        </section>

        {/* Core Goals */}
        <section id="core-goals" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Core Goals of On-Chain Proof</h2>
          <p className="text-base text-slate-700 leading-relaxed max-w-3xl">Principia embeds a compliance-by-design framework: modular components cryptographically link decentralized identifiers to real-world legal entity credentials.</p>
          <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-600 max-w-3xl">
            <li>
              <span className="font-semibold text-slate-900">Control:</span> “I control the keys behind this DID.” Establishes root of trust via KERI key event continuity & signed challenges.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Issuance:</span> “This credential or binding was signed by the DID’s authorized key.” Confirms authentic origin of claims & bindings (SAIDs, signatures).
            </li>
            <li>
              <span className="font-semibold text-slate-900">Integrity:</span> “This exact Verifiable Credential hasn’t been tampered with.” Content-addressed SAIDs & hash chaining provide immutability guarantees.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Authorization:</span> “This transaction is allowed: bound wallet, verified DID & required permissions align.” Policy evaluation gates execution.
            </li>
          </ol>
        </section>

        {/* Architecture */}
        <section id="architecture" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">High-Level Architecture</h2>
          <p className="text-base text-slate-700 leading-relaxed max-w-3xl">A modular trust stack linking credential issuance, decentralized identifiers, and on-chain execution.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 max-w-3xl">
            <li><strong>Principia Trust Issuer</strong>: Holds QVI credentials; issues & validates derivative credentials.</li>
            <li><strong>KERIA Sandbox</strong>: Remote key event log & OOBI resolution (Cardano Foundation environment).</li>
            <li><strong>Principia Trust Console</strong>: Operator UI for onboarding, linking, validation & bond issuance.</li>
            <li><strong>Veridian Wallet</strong>: Holder identity wallet performing signature & credential receipt operations.</li>
            <li><strong>Cardano Network</strong>: On-chain settlement for asset issuance referencing identity proofs.</li>
          </ul>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 flex justify-center">
            {/* Static architecture image (replace /architecture.png with actual path) */}
            <img
              src="/architecture.png"
              alt="Principia high-level architecture diagram"
              className="max-w-full h-auto"
              loading="lazy"
            />
          </div>
        </section>

        {/* Demo Overview */}


        {/* Consolidated Demo Summary */}
        <section id="whats-in-the-demo" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">What’s in the Demo</h2>
          <p className="text-base text-slate-700 leading-relaxed max-w-3xl">A streamlined flow showing how verifiable trust moves from off-chain identity & credentials to on-chain asset creation.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 max-w-3xl">
            <li><strong>Identity Onboarding</strong>: Resolve OOBI, connect Veridian wallet, obtain vLEI/QVI credential chain, persist organization profile.</li>
            <li><strong>Wallet Binding</strong>: Dual-sign canonical message (Cardano address + AID + timestamp) to link off-ledger identity to chain; store binding SAID.</li>
            <li><strong>Organisation vLEI Onboarding</strong>: Associate legal entity credentials with issuer context for downstream compliance workflows.</li>
            <li><strong>Credential Chain Check</strong>: Surface QVI + Legal Entity presence & status heuristics for quick trust posture assessment.</li>
            <li><strong>Bond Issuance (Verifiable Smart Contract)</strong>: Demonstrate mint via BondMintPolicy which accepts a redeemer containing financial terms, the verifiable indenture referencing vLEI, and binding proof verified on-chain.</li>
          </ul>
        </section>

        {/* Current Status: Achievements & Gaps (moved to bottom, neutral styling) */}
        <section id="current-status" className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Current Status: Achievements & Gaps</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Achieved</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li>Trust Issuer service stood up holding QVI credentials & issuance / validation APIs.</li>
                <li>Remote KERIA sandbox integrated for AID creation & OOBI resolution.</li>
                <li>Veridian wallet flows enabled for credential acquisition & control proofs.</li>
                <li>Wallet binding implemented (dual-signed canonical message + persisted binding SAID).</li>
                <li>Basic on-chain credential verification & chain heuristics (QVI + Legal Entity presence + status).</li>
                <li>Bond issuance PoC delivered referencing credential proofs (tx hash, policy ID, datum).</li>
                <li>Operator console operational for onboarding, linking, validation & issuance tasks.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Gaps / In Progress</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li>Verifiable smart contracts only partially implemented; wallet binding offers minimal security layer today.</li>
                <li>Full credential chain on-chain validation pending deeper parsing of CESR & VC structures.</li>
                <li>Capture of key proof metadata incomplete (full KEL continuity, timestamps, SAIDs catalog).</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-500">(Roadmap: strengthen smart contract verification, extend on-chain credential parsing, finalize audit-grade metadata capture.)</p>
        </section>

        <footer className="text-center text-xs text-slate-500 pt-6">
          <p>Questions? Reach out to the demo maintainers or explore the source repository.</p>
        </footer>
      </div>
    </div>
  );
}
