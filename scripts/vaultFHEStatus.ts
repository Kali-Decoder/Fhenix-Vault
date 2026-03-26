import { getVaultKeeperContract } from "./vaultFHEHelpers";

async function main() {
  const { vaultKeeper, signerAddress } = await getVaultKeeperContract();
  const vaultCount = await vaultKeeper.vaultCount();
  const owner = await vaultKeeper.owner();
  const rewardToken = await vaultKeeper.rewardToken();

  console.log("VaultKeeper:", await vaultKeeper.getAddress());
  console.log("Owner:", owner);
  console.log("Caller:", signerAddress);
  console.log("Reward Token:", rewardToken);
  console.log("Vault Count:", vaultCount.toString());

  const count = Number(vaultCount);
  for (let i = 0; i < count; i++) {
    const vault = await vaultKeeper.vaults(i);
    const depositors = await vaultKeeper.getDepositorCount(i);

    console.log(`\nVault ${i}: ${vault.name}`);
    console.log(`  Risk Level: ${Number(vault.riskLevel)}`);
    console.log(`  APY Range: ${Number(vault.minAPY) / 100}% - ${Number(vault.maxAPY) / 100}%`);
    console.log(`  TVL: ${vault.totalValueLocked.toString()} raw units`);
    console.log(`  Token Address: ${vault.tokenAddress}`);
    console.log(`  Active: ${vault.active}`);
    console.log(`  Depositor Count: ${depositors.toString()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
