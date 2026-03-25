# VaultKeeper Platform

VaultKeeper is a multi-vault yield platform on **Base Sepolia** and **Arbitrum Sepolia**.
It enables users to deposit into risk-segmented vaults, earn token rewards, and manage positions with clear transparency.

The repository contains:
- Smart contracts (`VaultKeeper`, `USDT` mock)
- Hardhat deployment + owner operation scripts
- A production-oriented Next.js frontend with separate pages for Vaults, Profile, Admin, and Analytics

## Why This Product Exists

Most yield products are either:
- Too opaque for users (unclear APY/reward mechanics), or
- Too manual for operators (hard to manage vault parameters safely), or
- Too fragmented (users/admins need different tools)

VaultKeeper addresses this by providing:
- Structured vaults by risk profile
- On-chain APY + deposit/reward accounting
- Built-in owner controls for lifecycle management
- A unified frontend for users and admins

## Product Goals

- Make yield participation straightforward for users
- Make vault operations controlled and auditable for admins
- Keep all critical financial actions on-chain
- Expose real-time operational status (TVL, deposits, rewards, activity)

## Core Features

### User Features
- Browse all vaults with risk/APY/TVL/token details
- Deposit into any active vault (with ERC-20 approval flow)
- Withdraw deposited tokens
- View pending rewards per vault
- Claim rewards from vaults
- See personal balances, deposits, and share

### Admin Features
- Set platform reward token
- Create vaults dynamically (`name`, `risk`, `APY`, `token`)
- Update APY bands per vault
- Toggle vault active/paused status
- Emergency withdraw for vault operations

### Product UX Features
- Dedicated pages (not a single overloaded dashboard):
  - `/vaults`
  - `/profile`
  - `/admin`
  - `/analytics`
- Wallet-aware admin gating (admin actions appear only for owner wallet)
- Modal-driven transactional actions (deposit/withdraw/claim/admin actions)
- Success toasts + confetti feedback on successful operations
- Filtering/search/sort in vault listings (name, risk, APR, TVL)

## System Architecture

### Contracts
- `contracts/VaultKeeper.sol`
  - Multi-vault storage and lifecycle management
  - Deposit/withdraw/reward claim logic
  - APY updates, reward token config, vault status control
- `contracts/USDT.sol`
  - Mintable ERC-20 mock token for testnet/local testing

### Backend/Tooling
- Hardhat + TypeScript scripts for deployment and owner operations
- TypeChain bindings for contract interaction safety

### Frontend
- Next.js app in `frontend ` directory
- Shared hook-based contract integration (`useVaultKeeper`)
- Config-driven chain + contract addresses

## Smart Contract Mechanics (High Level)

1. Owner sets `rewardToken`
2. Owner creates vaults with:
   - Risk level (`Low/Medium/High`)
   - APY range (`minAPY`, `maxAPY` in basis points)
   - Deposit token address
3. User deposits token into selected vault
4. Yield accrues over time
5. User claims rewards and/or withdraws principal
6. Owner can adjust APY or pause vault if needed

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
- `frontend /` Next.js app
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
