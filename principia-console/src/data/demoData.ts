export interface DemoCompany {
  name: string;
  lei: string;
  jurisdiction: string;
  representative: {
    name: string;
    email: string;
    role: string;
  };
}

export const demoCompanies: DemoCompany[] = [
  {
    name: "Senary Labs",
    lei: "549300V082XBE1L6B495",
    jurisdiction: "Dubai International Financial Centre (DIFC)",
    representative: {
      name: "Mohamed Elshami",
      email: "mohamed@principia.io",
      role: "CEO"
    }
  }
];

/**
 * Get the demo company (Senary Labs)
 */
export function getRandomDemoCompany(): DemoCompany {
  return demoCompanies[0];
}
