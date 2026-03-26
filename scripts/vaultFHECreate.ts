import { ethers } from "hardhat";
import { getRequiredEnv, getVaultKeeperContract, parseRiskLevel } from "./vaultFHEHelpers";

async function main() {

  console.log("🚀 Creating Vault...");

  const name = getRequiredEnv("VAULT_NAME");
  const riskLevel = parseRiskLevel(getRequiredEnv("VAULT_RISK_LEVEL"));

  const minApy = Number(getRequiredEnv("VAULT_MIN_APY_BPS"));
  const maxApy = Number(getRequiredEnv("VAULT_MAX_APY_BPS"));

  const tokenAddress = getRequiredEnv("VAULT_TOKEN_ADDRESS");

  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(`Invalid VAULT_TOKEN_ADDRESS: ${tokenAddress}`);
  }

  if (minApy > maxApy) {
    throw new Error("minAPY must be <= maxAPY");
  }

  console.log("Vault Config:");
  console.log("Name:", name);
  console.log("Risk:", riskLevel);
  console.log("APY:", minApy, "-", maxApy);
  console.log("Token:", tokenAddress);

  const { vaultKeeper } = await getVaultKeeperContract();

  const tx = await vaultKeeper.createVault(
    name,
    riskLevel,
    minApy,
    maxApy,
    tokenAddress
  );

  console.log("⏳ Tx sent:", tx.hash);

  await tx.wait();

  const vaultCount = await vaultKeeper.vaultCount();
  const vaultId = Number(vaultCount) - 1;

  console.log("✅ Vault created!");
  console.log("Vault ID:", vaultId);
  console.log("Total vaults:", vaultCount.toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});