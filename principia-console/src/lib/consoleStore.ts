import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error';

export interface IdentityWalletState {
  status: ConnectionStatus;
  lastAttempt?: Date;
  error?: string;
  aid?: string;
  oobi?: string;
  name?: string;
  organizationName?: string;
  vlei?: {
    acquired: boolean;
    role?: string;
    lei?: string;
  };
  credentials?: Array<{
    said: string;
    schema: string;
    issuer: string;
    issuanceDate: string;
    status: 'issued' | 'revoked'; // ACDC spec compliant status values
  }>;
  walletBinding?: {
    cardanoAddress: string;
    cardanoPublicKey?: string;
    bindingSAID: string;
    verified: boolean;
    linkedAt: string;
  };
  organizationDetails?: {
    name?: string;
    lei?: string;
    jurisdiction?: string;
    issuanceDate?: string;
    status?: 'issued' | 'revoked';
  };
}

export interface CardanoWalletState {
  injected: boolean;
  name?: string;
  address?: string;
  api?: any; // CIP-30 wallet API object
}

export interface Contact {
  aid: string;
  alias: string;
  addedAt: Date;
  credentials?: any[];
}

export interface PersistedOrganizationDetails {
  holderAid: string;
  organizationDetails: {
    name?: string;
    lei?: string;
    jurisdiction?: string;
    issuanceDate?: string;
    status?: 'issued' | 'revoked';
  };
  qviDetails?: {
    name?: string;
    said?: string;
    lei?: string;
    issuanceDate?: string;
    status?: 'issued' | 'revoked';
  };
  lastUpdated: string;
}

export interface IssuedLeiRecord {
  lei: string;
  legalEntityName: string;
  jurisdiction?: string;
  holderAid: string;
  issuedAt: string;
  status: 'active' | 'revoked';
}

export interface ParsedBinding {
  holderAID?: string;
  cardanoAddress?: string;
  cardanoPublicKey?: string;
  kelSigningKey?: string;
  bindingSAID?: string;
  valid: boolean;
  errors: string[];
}

export interface CredentialChainStatus {
  qvi?: { present: boolean; said?: string };
  le?: { present: boolean; said?: string };
  role?: { present: boolean; said?: string };
  valid: boolean;
  errors: string[];
}

export interface ConsoleState {
  // Connections
  identityWallet: IdentityWalletState;
  cardanoWallet: CardanoWalletState;
  setIdentityWalletStatus: (status: ConnectionStatus, error?: string) => void;
  setIdentityDetails: (details: Partial<IdentityWalletState>) => void;
  setWalletBinding: (binding: IdentityWalletState['walletBinding']) => void;
  setOrganizationDetails: (details: IdentityWalletState['organizationDetails'] | null) => void;
  detectCardanoWallet: () => void;
  
  // Persisted Organization Details
  persistedOrganizations: PersistedOrganizationDetails[];
  persistOrganizationDetails: (holderAid: string, orgDetails: any, qviDetails?: any) => void;
  loadPersistedOrganizationDetails: (holderAid: string) => PersistedOrganizationDetails | null;
  
  // Issued LEI Records
  issuedLeiRecords: IssuedLeiRecord[];
  addIssuedLeiRecord: (record: Omit<IssuedLeiRecord, 'issuedAt'>) => void;
  getIssuedLeiRecord: (lei: string) => IssuedLeiRecord | null;
  updateIssuedLeiRecord: (lei: string, updates: Partial<IssuedLeiRecord>) => void;
  
  // Contacts
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'addedAt'>) => void;
  removeContact: (aid: string) => void;
  updateContactCredentials: (aid: string, credentials: any[]) => void;
  
  // Verification
  bindingInput: string;
  bindingParsed?: ParsedBinding;
  credentialChain?: CredentialChainStatus;
  setBindingInput: (input: string) => void;
  parseBinding: () => void;
  setCredentialChain: (chain: CredentialChainStatus) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  identityWallet: { status: 'disconnected' as ConnectionStatus },
  cardanoWallet: { injected: false },
  contacts: [],
  persistedOrganizations: [],
  issuedLeiRecords: [],
  bindingInput: `Binding complete\n{\n  "success": true,\n  "bindingSAID": "EIpC_Qe93ofKWBf_1hv0JENm1GyTGtfen_dNFKsOG8PT",\n  "bindingType": "cardano_address_binding",\n  "issuerIxnSAID": "E335bd9301cc472303daface28963a8a8ac443ae6f36",\n  "holderAID": "EIk0F5px0GHvyw-bFvW7FAbGHz82fDx5VSGg77K-lEgB",\n  "cardanoAddress": "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",\n  "binding": {\n    "v": "KERI10JSON00057d_",\n    "t": "cardano_address_binding",\n    "issuer": "EHtHel57-67z7KMGXKanDuoI-IsD_kcCv6iYmiLS6VPG",\n    "holder": "EIk0F5px0GHvyw-bFvW7FAbGHz82fDx5VSGg77K-lEgB",\n    "cardanoAddress": "addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",\n    "cardanoPublicKey": "eda779b2c99f5915fe4841ca35017a41be5fd79046ebb87e02a0988f6f5550b2",\n    "canonicalMessage": "BIND|v1|EIk0F5px0GHvyw-bFvW7FAbGHz82fDx5VSGg77K-lEgB|addr_test1qrcsss93xau2p8dq8gkuu5mtpk7cl74glpaxat74gr6l8r0lxt23ydw4myntryvlrzunyunqy5k2rxglzwsywrtdj6wscz2xf5",\n    "signature": {\n      "cardano": "845846a201276761646472657373583900f10840b13778a09da03a2dce536b0dbd8ffaa8f87a6eafd540f5f38dff32d51235d5d926b1919f18b9327260252ca1991f13a0470d6d969da166686173686564f458a142494e447c76317c45496b30463570783047487679772d624676573746416247487a3832664478355653476737374b2d6c4567427c616464725f74657374317172637373733933786175327038647138676b7575356d74706b37636c3734676c706178617437346772366c3872306c78743233796477346d796e747279766c727a756e79756e7179356b327278676c7a777379777274646a367773637a327866355840331983fb9a18b749c7b1d896205075e8865fafeb4d45810c9ddc5196aab63502b2b0ebca043e545ac678cd4c4c03f733a742db6196ae1f60ba911b76ff2c0b09",\n      "veridian": "0BDjMaC3zPZV8OfS1KNiQKUYbA_Ms3ICW42f-mvNMTcJAbUapEI_4mWNQ3YvMLZxPB39c1hZqJLlQkBIRVTi7LMO"\n    },\n    "createdAt": "2025-10-15T11:33:36.199Z",\n    "d": "EIpC_Qe93ofKWBf_1hv0JENm1GyTGtfen_dNFKsOG8PT"\n  },\n  "message": "Cardano address binding created and anchored in KEL",\n  "nextStep": "Binding is now anchored and can be verified",\n  "keriDelivery": "anchored"\n}`,
  bindingParsed: undefined,
  credentialChain: undefined,
};

export const useConsoleStore = create<ConsoleState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // IMPORTANT: Merge status updates so we don't drop existing AID / credentials / organization data
      setIdentityWalletStatus: (status, error) =>
        set(state => ({
          identityWallet: {
            ...state.identityWallet,
            status,
            lastAttempt: new Date(),
            error,
          },
        })),
      
      setIdentityDetails: (details) =>
        set(state => ({ 
          identityWallet: { ...state.identityWallet, ...details } 
        })),

      setWalletBinding: (binding) =>
        set(state => ({
          identityWallet: { ...state.identityWallet, walletBinding: binding }
        })),

      setOrganizationDetails: (details) =>
        set(state => ({
          identityWallet: { ...state.identityWallet, organizationDetails: details || undefined }
        })),

      persistOrganizationDetails: (holderAid, orgDetails, qviDetails) =>
        set(state => {
          const existingIndex = state.persistedOrganizations.findIndex(org => org.holderAid === holderAid);
          const persistedOrg: PersistedOrganizationDetails = {
            holderAid,
            organizationDetails: orgDetails,
            qviDetails,
            lastUpdated: new Date().toISOString()
          };
          
          const updatedOrganizations = existingIndex >= 0 
            ? state.persistedOrganizations.map((org, index) => index === existingIndex ? persistedOrg : org)
            : [...state.persistedOrganizations, persistedOrg];
          
          console.log('💾 Persisting organization details for holder:', holderAid, persistedOrg);
          return { persistedOrganizations: updatedOrganizations };
        }),

      loadPersistedOrganizationDetails: (holderAid) => {
        const state = get();
        const persisted = state.persistedOrganizations.find(org => org.holderAid === holderAid);
        console.log('📂 Loading persisted organization details for holder:', holderAid, persisted);
        return persisted || null;
      },

      addIssuedLeiRecord: (record) =>
        set(state => {
          const newRecord: IssuedLeiRecord = {
            ...record,
            issuedAt: new Date().toISOString(),
          };
          console.log('📝 Adding issued LEI record:', newRecord);
          return { issuedLeiRecords: [...state.issuedLeiRecords, newRecord] };
        }),

      getIssuedLeiRecord: (lei) => {
        const state = get();
        const record = state.issuedLeiRecords.find(r => r.lei === lei);
        console.log('🔍 Looking up issued LEI record for:', lei, record);
        return record || null;
      },

      updateIssuedLeiRecord: (lei, updates) =>
        set(state => {
          const updatedRecords = state.issuedLeiRecords.map(record => 
            record.lei === lei ? { ...record, ...updates } : record
          );
          console.log('📝 Updating issued LEI record for:', lei, updates);
          return { issuedLeiRecords: updatedRecords };
        }),
      
      detectCardanoWallet: async () => {
        // Prevent SSR issues
        if (typeof window === 'undefined') return;

        const log = (...args: any[]) => console.debug('[CARDANO-DETECT]', ...args);
        const w = window as any;

        // Helper to convert hex string -> Uint8Array without relying on Buffer polyfill
        const hexToBytes = (hex: string): Uint8Array => {
          if (!hex) return new Uint8Array();
            const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
            const out = new Uint8Array(clean.length / 2);
            for (let i = 0; i < clean.length; i += 2) {
              out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
            }
            return out;
        };

        const attemptEnable = async (providerKey: string) => {
          try {
            log('Attempt enabling provider', providerKey);
            const api = await w.cardano[providerKey].enable?.();
            if (!api) throw new Error('enable() returned undefined');
            
            // Log API methods for debugging
            log('Enabled API methods:', Object.keys(api));
            
            const changeAddressHex = await api.getChangeAddress();
            let bech32: string | undefined;
            try {
              const { Address } = await import('@emurgo/cardano-serialization-lib-browser');
              bech32 = Address.from_bytes(hexToBytes(changeAddressHex)).to_bech32();
            } catch (addrErr) {
              log('Address conversion failed, keep hex fallback', addrErr);
            }
            set({ cardanoWallet: { injected: true, name: providerKey, address: bech32 ?? changeAddressHex, api } });
            log('Provider enabled & address resolved', providerKey, bech32 ?? changeAddressHex);
            log('Stored API in state');
            return true;
          } catch (err) {
            log('Provider enable failed', providerKey, err);
            return false;
          }
        };

        const detect = async (retry = false) => {
          if (!w.cardano) {
            log('window.cardano not yet present', { retry });
            if (!retry) {
              // Some wallets inject slightly after DOM ready; retry once after a short delay.
              setTimeout(() => detect(true), 800);
            } else {
              set({ cardanoWallet: { injected: false } });
            }
            return;
          }

            const rawKeys = Object.keys(w.cardano || {});
            // Filter to objects exposing enable()
            const providerKeys = rawKeys.filter(k => typeof w.cardano[k]?.enable === 'function');
            log('Discovered potential providers', providerKeys);

            if (providerKeys.length === 0) {
              set({ cardanoWallet: { injected: false } });
              return;
            }

            // Priority ordering of popular wallets
            const priority = ['nami', 'eternl', 'flint', 'lace', 'typhoncip30', 'gerowallet'];
            providerKeys.sort((a, b) => {
              const ia = priority.indexOf(a);
              const ib = priority.indexOf(b);
              return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
            });

            // Try each provider until one succeeds
            for (const key of providerKeys) {
              const ok = await attemptEnable(key);
              if (ok) return;
            }

            // If all enable attempts failed, still mark as injected with first provider name (no API)
            set({ cardanoWallet: { injected: true, name: providerKeys[0], api: undefined } });
        };

        detect();
      },
      
      addContact: (contact) => {
        const exists = get().contacts.find(c => c.aid === contact.aid);
        if (exists) return;
        set(state => ({
          contacts: [...state.contacts, { ...contact, addedAt: new Date() }],
        }));
      },
      
      removeContact: (aid) =>
        set(state => ({ contacts: state.contacts.filter(c => c.aid !== aid) })),
      
      updateContactCredentials: (aid, credentials) =>
        set(state => ({
          contacts: state.contacts.map(c =>
            c.aid === aid ? { ...c, credentials } : c
          ),
        })),
      
      setBindingInput: (input) => set({ bindingInput: input }),
      
      parseBinding: () => {
        let raw = get().bindingInput.trim();
        if (!raw) {
          set({ bindingParsed: { valid: false, errors: ['Empty input'] } });
          return;
        }
        // If input starts with a non-json line like 'Binding complete', drop first line
        if (!raw.startsWith('{')) {
          const firstBrace = raw.indexOf('{');
          if (firstBrace !== -1) raw = raw.slice(firstBrace);
        }
        try {
          const parsed = JSON.parse(raw);
          // Support nested binding object (as per sample)
          const holderAID = parsed.holderAID || parsed.binding?.holder;
          const cardanoAddress = parsed.cardanoAddress || parsed.binding?.cardanoAddress;
          const cardanoPublicKey = parsed.cardanoPublicKey || parsed.binding?.cardanoPublicKey;
          const bindingSAID = parsed.bindingSAID || parsed.binding?.d;
          // Dual signature object
          const cardanoSignature = parsed.cardanoSignature || parsed.binding?.signature?.cardano || parsed.signature?.cardano;
          const veridianSignature = parsed.veridianSignature || parsed.binding?.signature?.veridian || parsed.signature?.veridian;
          // Metrics (length in bytes when hex looking)
          const isHex = (s?: string) => typeof s === 'string' && /^[0-9a-fA-F]+$/.test(s);
          const hexBytes = (s?: string) => (s && isHex(s) ? Math.floor(s.length / 2) : undefined);
          const metrics = {
            cardanoSignatureBytes: hexBytes(cardanoSignature),
            veridianSignatureBytes: hexBytes(veridianSignature),
            cardanoPublicKeyBytes: hexBytes(cardanoPublicKey),
          };
          const valid = !!(holderAID && cardanoAddress);
          const errors: string[] = [];
            if (!holderAID) errors.push('holderAID missing');
            if (!cardanoAddress) errors.push('cardanoAddress missing');
          set({
            bindingParsed: {
              holderAID,
              cardanoAddress,
              cardanoPublicKey,
              bindingSAID,
              kelSigningKey: parsed.kelSigningKey,
              valid,
              errors: valid ? [] : errors.length ? errors : ['Missing required fields'],
            },
          });
          // Attach metrics into console for now
          console.debug('[BINDING-PARSE]', { holderAID, cardanoAddress, bindingSAID, metrics });
        } catch (e) {
          set({
            bindingParsed: {
              valid: false,
              errors: ['Invalid JSON: ' + (e as Error).message],
            },
          });
        }
      },
      
      setCredentialChain: (chain) => set({ credentialChain: chain }),
      
      reset: () => set(initialState),
    }),
    { 
      name: 'console-store',
      // Exclude wallet API from persistence (it can't be serialized)
      partialize: (state) => ({
        ...state,
        cardanoWallet: {
          ...state.cardanoWallet,
          api: undefined, // Don't persist the wallet API object
        },
      }),
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          try {
            const str = window.sessionStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch (e) {
            return null;
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          try {
            window.sessionStorage.setItem(name, JSON.stringify(value));
          } catch {}
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          try { window.sessionStorage.removeItem(name); } catch {}
        },
      },
    }
  )
);
