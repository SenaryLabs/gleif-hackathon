

# Principia Trust Issuer Service

_This service is a fork and extension of [cardano-foundation/veridian-wallet/services](https://github.com/cardano-foundation/veridian-wallet/tree/main/services)._

A Node.js/Express service for issuing vLEI and compliance credentials, integrated with KERI and Veridian wallet workflows.

## Features
- Qualified vLEI Issuer (QVI) logic for sandbox/demo
- KERI agent integration (remote KERIA endpoint)
- REST API for credential issuance, OOBI resolution, and contact management
- Schema-based credential support
- Docker-ready for easy deployment

## Quick Start

### Prerequisites
- Node.js 21.5.0+
- Access to KERI agent endpoints (KERIA)

### Installation & Run
```bash
npm install
cp env.example .env
# Edit .env with your configuration
npm run build
./run.sh   # for development
npm start  # for production
```

### Environment Variables
Copy `env.example` to `.env` and configure:
- `PORT`: Service port (default: 3001)
- `ENDPOINT`: Service URL
- `OOBI_ENDPOINT`: Public OOBI URL
- `KERIA_ENDPOINT`: KERI agent API URL
- `KERIA_BOOT_ENDPOINT`: KERI boot API URL

### API Endpoints
- `GET /ping` — Health check
- `GET /keriOobi` — Get server OOBI
- `GET /schemas` — List available schemas
- `GET /contacts` — List connected contacts
- `POST /issueAcdcCredential` — Issue credential
- `POST /resolveOobi` — Resolve wallet OOBI
- `DELETE /deleteContact` — Remove contact

### Schemas
- Foundation Employee
- Qualified vLEI Issuer
- Rare EVO 2024 Attendee
- Legal Entity vLEI
- Principia Business Card

### Docker
```bash
docker build -t sandbox-credserver .
docker run -p 3001:3001 -e KERIA_ENDPOINT=... sandbox-credserver
```

### Reference
- For Veridian wallet integration, see: [cardano-foundation/veridian-wallet](https://github.com/cardano-foundation/veridian-wallet/tree/main)
