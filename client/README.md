# VaultKeeper Privacy Frontend

Next.js frontend for the privacy-first VaultKeeper experience on Base Sepolia and Arbitrum Sepolia.

## Network
- Base Sepolia: Chain ID `84532`, RPC `https://sepolia.base.org`, Explorer `https://sepolia.basescan.org`
- Arbitrum Sepolia: Chain ID `421614`, RPC `https://sepolia-rollup.arbitrum.io/rpc`, Explorer `https://sepolia.arbiscan.io`

## Integrated Contracts
- VaultKeeper (confidential vaults)
- Confidential reward token (FHE-enabled ERC-20)

## Features
- Wallet connect
- Base Sepolia + Arbitrum Sepolia network switch/add in wallet
- Encrypted inputs and decrypted outputs via Fhenix SDK
- Private deposits, withdrawals, and rewards
- Admin vault management with confidentiality

## Run
```bash
npm install
npm run dev
```

## Main Files
- `app/page.tsx`: privacy-first landing + overview copy
- `app/config/chains.ts`: Base Sepolia + Arbitrum Sepolia network config
- `app/config/vault_config.ts`: contract addresses + ABI
- `app/components/Navigation.tsx`: top navigation and contract explorer link
