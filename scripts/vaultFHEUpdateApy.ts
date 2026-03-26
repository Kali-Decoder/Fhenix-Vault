import { getRequiredEnv, getVaultKeeperContract } from "./vaultFHEHelpers";

async function main() {
  const vaultId = BigInt(getRequiredEnv("VAULT_ID"));
  const minApy = BigInt(getRequiredEnv("VAULT_MIN_APY_BPS"));
  const maxApy = BigInt(getRequiredEnv("VAULT_MAX_APY_BPS"));

  const { vaultKeeper } = await getVaultKeeperContract();
  const tx = await vaultKeeper.updateAPY(vaultId, minApy, maxApy);
  await tx.wait();

  console.log(`APY updated for vault ${vaultId.toString()}: ${minApy.toString()}-${maxApy.toString()} bps`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
