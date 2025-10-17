const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const endpoint = process.env.ENDPOINT ?? `http://127.0.0.1:${port}`;
const oobiEndpoint = process.env.OOBI_ENDPOINT ?? endpoint;
export const KERIA_URL = process.env.KERIA_ENDPOINT || "your-keria-endpoint-here";
export const KERIA_BOOT_URL = process.env.KERIA_BOOT_ENDPOINT || "your-keria-boot-endpoint-here";

export const config = {
  endpoint: endpoint,
  oobiEndpoint: oobiEndpoint,
  port,
  keria: {
    url: KERIA_URL,
    bootUrl: KERIA_BOOT_URL,
  },
  path: {
    ping: "/ping",
    keriOobi: "/keriOobi",
    issueAcdcCredential: "/issueAcdcCredential",
    contacts: "/contacts",
    contactCredentials: "/contactCredentials",
    resolveOobi: "/resolveOobi",
    requestDisclosure: "/requestDisclosure",
    revokeCredential: "/revokeCredential",
    deleteContact: "/deleteContact",
    schemas: "/schemas",
    // NEW: KEL-based Identity Binding endpoints
    createIdentityBinding: "/createIdentityBinding",
    discoverIdentityBindings: "/discoverIdentityBindings/:aid",
    verifyIdentityBinding: "/verifyIdentityBinding",
  },
};
