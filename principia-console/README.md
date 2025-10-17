# Principia Console (Phase A – Theme & Shell)

This package is the beginning of the *Principia Console* rewrite extracted from the prior `principia-trust-ui` application. Phase A focuses solely on visual design tokens, structural layout, navigation, and placeholder routes—no backend or wallet logic yet.

## Implemented (Acceptance for Phase A)
- Design tokens + CSS variables (`src/app/globals.css`) aligned with PRD palette.
- Typography scale (H1–H4, small, meta) & base component styles (cards, buttons, inputs, nav, progress steps).
- Global layout + Inter font via Next Font API (`src/app/layout.tsx`).
- Primary navigation bar with routes: Dashboard (/), Onboarding, Wallet Binding, Console, Settings.
- Route skeleton pages with placeholder descriptive copy.
- Onboarding progress header component stub (`ProgressHeader`).
- Zustand onboarding store stub with persisted shape (`useOnboardingStore`).
- Basic UI primitives: Button + Card.

## Next Phases
| Phase | Scope | Key Artifacts |
|-------|-------|---------------|
| B | Console instrumentation (Connections, Contacts, Verification) | CIP-45 connect test harness, OOBI resolve form, binding + credential verification views |
| C | Onboarding wizard integration | Step forms, validations, simulated eKYB + credential issuance hooks |
| D | Wallet Binding end-to-end | CIP-45 + CIP-30 + Veridian sign + KEL state retrieval and submit binding |
| E | Hardening & Docs | Error states, loading skeletons, Storybook, README updates |

## Dev Scripts
```
yarn dev
# or
npm run dev
```

## File Map (Key)
- `src/app/layout.tsx` – Root layout & Navigation injection.
- `src/app/globals.css` – Theme tokens & core component styles.
- `src/components/Navigation.tsx` – Top navigation bar.
- `src/components/onboarding/ProgressHeader.tsx` – Wizard progress stub.
- `src/lib/onboardingStore.ts` – Persisted state shape.
- `src/components/ui/*` – UI primitives.

## Design Tokens (Excerpt)
```
--background: #F8F9FA;
--foreground: #212529;
--muted-foreground: #6C757D;
--tertiary-foreground: #ADB5BD;
--border: #DEE2E6;
--primary: #007BFF;
--success: #28A745; --destructive: #DC3545; --warning: #FFC107;
```
Dark mode variants supplied via `prefers-color-scheme: dark`.

## Planned Enhancements
- Replace placeholder Sign In with wallet / identity status indicators.
- Add command palette (CMD+K) with fuzzy navigation.
- Introduce semantic alert + toast layer.
- Accessible skip links + ARIA roles.

---
Phase A complete. Proceed to Phase B once backend endpoints and wallet connectors are ready.
