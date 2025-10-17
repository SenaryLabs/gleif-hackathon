"use client";
import { BondIssuanceForm } from './components/BondIssuanceForm';

export default function BondIssuancePage() {
  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="h1">Bond Issuance</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">Mint a bond token using on-chain minting policy parameters and validated wallet binding credentials.</p>
      </div>
      <BondIssuanceForm />
    </div>
  );
}
