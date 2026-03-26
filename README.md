# VaultKeeper Platform

VaultKeeper is a privacy-first DeFi yield platform built on Fhenix FHE. Users deposit into risk-based vaults, earn yield,
and manage positions while balances, deposits, rewards, and TVL remain encrypted on-chain.

The repository contains:
- Smart contracts (`VaultKeeper`, confidential token)
- Hardhat deployment + owner operation scripts
- A Next.js frontend for encrypted vault UX (Vaults, Profile, Admin, Analytics)

## Why This Product Exists

Most DeFi platforms are fully transparent, exposing user balances, strategies, and financial behavior. This enables
copy-trading, privacy risks, and potential exploitation.

VaultKeeper addresses this by providing confidential DeFi where sensitive data stays private while still enabling
secure, composable on-chain computation.

## Product Goals

- Make yield participation private by default
- Keep all sensitive data encrypted on-chain
- Preserve composability and security while hiding values
- Deliver a strong UX with frontend encryption + decryption

## Core Features

### User Features
- Browse risk-based vaults without exposing user balances
- Deposit and withdraw with encrypted balances
- Claim rewards while keeping values private
- View decrypted balances and rewards in the UI only

### Admin Features
- Set platform reward token
- Create vaults dynamically (`name`, `risk`, `APY`, `token`)
- Update APY bands per vault
- Toggle vault active/paused status
- Emergency withdraw for vault operations

### Product UX Features
- Dedicated pages (`/vaults`, `/profile`, `/admin`, `/analytics`)
- Wallet-aware admin gating (admin actions appear only for owner wallet)
- Modal-driven transactional actions (deposit/withdraw/claim/admin actions)
- Success toasts + confetti feedback on successful operations
- Filtering/search/sort in vault listings (name, risk, APR, TVL)

## System Architecture

### Contracts
- `contracts/VaultKeeper.sol`
  - Multi-vault storage and lifecycle management
  - Encrypted deposit/withdraw/reward claim logic
  - APY updates, reward token config, vault status control
- Confidential token contract
  - Encrypted ERC-20-style transfers for testnet/local testing

### Backend/Tooling
- Hardhat + TypeScript scripts for deployment and owner operations
- TypeChain bindings for contract interaction safety

### Frontend
- Next.js app in `client` directory
- Shared hook-based contract integration (`useVaultKeeper`)
- Config-driven chain + contract addresses

## Smart Contract Mechanics (High Level)

1. Owner sets `rewardToken`
2. Owner creates vaults with:
   - Risk level (`Low/Medium/High`)
   - APY range (`minAPY`, `maxAPY` in basis points)
   - Deposit token address
3. Frontend encrypts user inputs
4. User deposits into selected vault with encrypted values
5. Yield accrues on encrypted balances
6. User decrypts rewards/positions client-side
7. Owner can adjust APY or pause vault if needed

## Network Configuration

Current target networks:
- Base Sepolia: Chain ID `84532`, RPC `https://sepolia.base.org`, Explorer `https://sepolia.basescan.org`
- Arbitrum Sepolia: Chain ID `421614`, RPC `https://sepolia-rollup.arbitrum.io/rpc`, Explorer `https://sepolia.arbiscan.io`

## Contract Addresses (Current)

Frontend currently points to:
- `VAULT_KEEPER_ADDRESS=0x68BB922f1c1466108206D873c370617697Cd4271`
- `REWARD_TOKEN_ADDRESS=0x1daBC80337bF2d85d496c4eD9cE63a1b16Fbd539`

Update these in:
- `frontend /app/config/vault_config.ts`

## Repository Structure

- `contracts/` smart contracts
- `scripts/` deployment and owner ops scripts
- `deployments/` JSON deployment records
- `client/` Next.js app
- `hardhat.config.ts` network + compiler config

## Owner Operation Scripts

### Deployment
- `npm run deploy:vault` - deploy VaultKeeper on testnet
- `npm run deploy:usdt` - deploy USDT and mint configured amount

### Vault Management
- `npm run vaults:status`
- `npm run vaults:set-reward-token`
- `npm run vaults:create`
- `npm run vaults:update-apy`
- `npm run vaults:toggle`
- `npm run vaults:emergency-withdraw`

### Ordered Owner Setup Flow
- `npm run owner:1:deploy`
- `npm run owner:2:set-reward-token`
- `npm run owner:3:create-stable`
- `npm run owner:4:create-growth`
- `npm run owner:5:create-turbo`
- `npm run owner:6:status`

## Required Environment Variables

At minimum (root `.env`):
- `PRIVATE_KEY`
- `POLKADOT_HUB_TESTNET_RPC_URL` (optional if using default)

For vault setup scripts:
- `REWARD_TOKEN_ADDRESS`
- `STABLE_VAULT_TOKEN_ADDRESS`
- `GROWTH_VAULT_TOKEN_ADDRESS`
- `TURBO_VAULT_TOKEN_ADDRESS`

Optional deploy controls:
- `INITIAL_OWNER_ADDRESS`
- `VAULT_KEEPER_ADDRESS` (override resolved deployment)
- `USDT_OWNER_ADDRESS`
- `USDT_MINT_TO`
- `USDT_MINT_AMOUNT`

## Local Development

### Contracts
```bash
npm install
npx hardhat compile
```

### Frontend
```bash
cd "frontend "
npm install
npm run dev
```

Open: `http://localhost:3000`

## Security Notes

- Do not commit production private keys
- Rotate keys immediately if exposed
- Restrict owner wallet usage to admin operations only
- Validate contract addresses before running owner scripts

## Product Status

VaultKeeper is structured as a full product stack (contracts + operational scripts + role-aware frontend), not a prototype dashboard.
# Fhenix-Vault
# Fhenix-Vault
# Fhenix-Vault
