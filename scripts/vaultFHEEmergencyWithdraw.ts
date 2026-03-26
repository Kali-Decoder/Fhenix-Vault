import { getRequiredEnv, getVaultKeeperContract } from "./vaultFHEHelpers";

async function main() {
  const vaultId = BigInt(getRequiredEnv("VAULT_ID"));
  const amount = BigInt(getRequiredEnv("EMERGENCY_WITHDRAW_AMOUNT"));

  const { vaultKeeper } = await getVaultKeeperContract();
  const tx = await vaultKeeper.emergencyWithdraw(vaultId, amount);
  await tx.wait();

  console.log(`Emergency withdrawal done for vault ${vaultId.toString()} amount ${amount.toString()} raw units`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
