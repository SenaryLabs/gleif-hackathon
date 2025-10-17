import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompanyInfo {
  name?: string;
  lei?: string;
  jurisdiction?: string;
  registrationNumber?: string;
  representativeName?: string;
  representativeEmail?: string;
  officialRole?: string;
}

export interface CredentialsState {
  qvi?: any; // placeholder types for now
  le?: any;
  role?: any;
}

export interface WalletBindingState {
  cardanoAddress?: string;
  cardanoPublicKey?: string;
  bindingSAID?: string;
}

export interface OnboardingState {
  currentStep: string;
  company: CompanyInfo;
  credentials: CredentialsState;
  walletBinding: WalletBindingState;
  keriAID?: string;
  setStep: (s: string) => void;
  updateCompany: (c: Partial<CompanyInfo>) => void;
  setKeriAID: (aid: string) => void;
  setBinding: (b: Partial<WalletBindingState>) => void;
  setCredentials: (c: Partial<CredentialsState>) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'company',
  company: {},
  credentials: {},
  walletBinding: {},
  keriAID: undefined,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (s) => set({ currentStep: s }),
      updateCompany: (c) => set((st) => ({ company: { ...st.company, ...c } })),
      setKeriAID: (aid) => set({ keriAID: aid }),
      setBinding: (b) => set((st) => ({ walletBinding: { ...st.walletBinding, ...b } })),
      setCredentials: (c) => set((st) => ({ credentials: { ...st.credentials, ...c } })),
      reset: () => set(initialState),
    }),
    { 
      name: 'onboarding-store',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
