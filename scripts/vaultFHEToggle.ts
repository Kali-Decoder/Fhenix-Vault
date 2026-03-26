import { getRequiredEnv, getVaultKeeperContract } from "./vaultFHEHelpers";

async function main() {
  const vaultId = BigInt(getRequiredEnv("VAULT_ID"));
  const { vaultKeeper } = await getVaultKeeperContract();
  const tx = await vaultKeeper.toggleVaultActive(vaultId);
  await tx.wait();
  const vault = await vaultKeeper.vaults(vaultId);
  console.log(`Vault ${vaultId.toString()} active status: ${vault.active}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
