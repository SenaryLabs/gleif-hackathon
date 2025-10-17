import * as React from 'react';

export interface StepDescriptor { key: string; label: string; }

const DEFAULT_STEPS: StepDescriptor[] = [
  { key: 'company', label: 'Company Info' },
  { key: 'ekyb', label: 'eKYB Verification' },
  { key: 'credentials', label: 'vLEI Credentials' },
  { key: 'complete', label: 'Completion' },
];

export interface ProgressHeaderProps {
  currentKey?: string;
  steps?: StepDescriptor[];
}

export function ProgressHeader({ currentKey = 'company', steps = DEFAULT_STEPS }: ProgressHeaderProps) {
  return (
    <div className="steps border-b border-[var(--border)] mb-6">
      {steps.map((s, i) => {
        const currentIndex = steps.findIndex(st => st.key === currentKey);
        const state = i < currentIndex ? 'step-complete' : i === currentIndex ? 'step-current' : '';
        return (
          <div key={s.key} className={`step ${state}`}>
            <div className="step-indicator">{i < currentIndex ? '✓' : i + 1}</div>
            <div className="step-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ProgressHeader;
