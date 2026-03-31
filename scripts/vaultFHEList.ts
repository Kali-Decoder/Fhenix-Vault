import { getVaultKeeperContract } from "./vaultFHEHelpers";

async function main() {
  const { vaultKeeper } = await getVaultKeeperContract();
  const vaultCount = await vaultKeeper.vaultCount();
  const count = Number(vaultCount);

  console.log("VaultKeeper:", await vaultKeeper.getAddress());
  console.log("Vault Count:", count);

  for (let i = 0; i < count; i++) {
    const vault = await vaultKeeper.vaults(i);
    const depositorCount = await vaultKeeper.getDepositorCount(i);

    console.log(`\nVault ${i}: ${vault.name}`);
    console.log(`  Risk Level: ${Number(vault.riskLevel)}`);
    console.log(`  APY Range: ${Number(vault.minAPY) / 100}% - ${Number(vault.maxAPY) / 100}%`);
    console.log(`  TVL (encrypted raw): ${vault.totalValueLocked.toString()}`);
    console.log(`  Token Address: ${vault.tokenAddress}`);
    console.log(`  Active: ${vault.active}`);
    console.log(`  Depositor Count: ${depositorCount.toString()}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
