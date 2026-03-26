import { ethers } from "hardhat";
import { VaultKeeper } from "../typechain-types/contracts/VaultKeeper";
import * as fs from "fs";
import * as path from "path";

type DeploymentInfo = {
  address: string;
};

export function resolveVaultKeeperAddress(): string {
  const envAddress = process.env.VAULT_KEEPER_ADDRESS;
  if (envAddress) {
    if (!ethers.isAddress(envAddress)) {
      throw new Error(`Invalid VAULT_KEEPER_ADDRESS: ${envAddress}`);
    }
    return envAddress;
  }

  const hardhatNetwork = process.env.HARDHAT_NETWORK || "unknown";
  const latestDeploymentFile = path.join(__dirname, "../deployments", `latest-${hardhatNetwork}.json`);
  if (!fs.existsSync(latestDeploymentFile)) {
    throw new Error(
      `VaultKeeper address not found. Set VAULT_KEEPER_ADDRESS or deploy first to create ${latestDeploymentFile}`
    );
  }

  const deployment = JSON.parse(fs.readFileSync(latestDeploymentFile, "utf8")) as DeploymentInfo;
  if (!deployment.address || !ethers.isAddress(deployment.address)) {
    throw new Error(`Invalid deployment file: ${latestDeploymentFile}`);
  }

  return deployment.address;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function parseRiskLevel(raw: string): number {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "0" || normalized === "low") return 0;
  if (normalized === "1" || normalized === "medium") return 1;
  if (normalized === "2" || normalized === "high") return 2;
  throw new Error(`Invalid VAULT_RISK_LEVEL: ${raw}. Use 0/1/2 or low/medium/high`);
}

export async function getVaultKeeperContract(): Promise<{
  vaultKeeper: VaultKeeper;
  signerAddress: string;
}> {
  const vaultKeeperAddress = resolveVaultKeeperAddress();
  const [signer] = await ethers.getSigners();
  const VaultKeeperFactory = await ethers.getContractFactory("VaultKeeper");
  const vaultKeeper = VaultKeeperFactory.attach(vaultKeeperAddress) as VaultKeeper;
  return { vaultKeeper, signerAddress: signer.address };
}
