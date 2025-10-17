import * as React from 'react';

/**
 * Principia wordmark logo (Trust Engine) rendered as inline SVG.
 * Responsive: shrink letter spacing slightly on very small screens.
 */
export const PrincipiaLogo: React.FC<{ className?: string; title?: string }> = ({ className, title = 'Principia Trust Engine' }) => (
  <svg
    viewBox="0 0 320 70"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label={title}
    className={className}
  >
    <text x="0" y="38" fontFamily="Helvetica, Arial, sans-serif" fontSize="32" fontWeight={200} fill="#1e293b" letterSpacing={14}>
      PRINCIPIA
    </text>
    <text x="2" y="54" fontFamily="Helvetica, Arial, sans-serif" fontSize="7" fontWeight={300} fill="#94a3b8" letterSpacing={14}>
      TRUST ENGINE
    </text>
  </svg>
);

export default PrincipiaLogo;
