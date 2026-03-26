import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function deployVaultKeeper() {
  const CONTRACT_NAME = "VaultKeeper";

  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying VaultKeeper...");
  console.log("Deployer:", deployer.address);

  /* ========== CONFIG ========== */

  const initialOwner =
    process.env.INITIAL_OWNER_ADDRESS || deployer.address;

  if (!ethers.isAddress(initialOwner)) {
    throw new Error(`Invalid owner: ${initialOwner}`);
  }

  // 🔥 IMPORTANT: your FHERC20 token address
  const tokenAddress = process.env.FHE_TOKEN_ADDRESS;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    throw new Error("Set FHE_TOKEN_ADDRESS in .env");
  }

  console.log("Owner:", initialOwner);
  console.log("Token:", tokenAddress);

  /* ========== DEPLOY ========== */

  const vault = await ethers.deployContract(CONTRACT_NAME, [initialOwner]);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("VaultKeeper deployed:", vaultAddress);

  /* ========== VERIFY OWNER ========== */

  const owner = await vault.owner();
  if (owner.toLowerCase() !== initialOwner.toLowerCase()) {
    throw new Error("Owner mismatch!");
  }

  /* ========== SET REWARD TOKEN ========== */

  console.log("Setting reward token...");
  const setRewardTx = await vault.setRewardToken(tokenAddress);
  await setRewardTx.wait();

  console.log("✅ Reward token set");

  /* ========== CREATE VAULTS ========== */

  console.log("Creating vaults...");

  const vaultConfigs = [
    {
      name: "Stable",
      risk: 0, // Low
      min: 500,
      max: 800,
    },
    {
      name: "Growth",
      risk: 1, // Medium
      min: 1200,
      max: 1800,
    },
    {
      name: "Turbo",
      risk: 2, // High
      min: 2500,
      max: 4000,
    },
  ];

  for (let i = 0; i < vaultConfigs.length; i++) {
    const v = vaultConfigs[i];

    const tx = await vault.createVault(
      v.name,
      v.risk,
      v.min,
      v.max,
      tokenAddress
    );
    await tx.wait();

    console.log(`✅ Vault created: ${v.name}`);
  }

  const vaultCount = await vault.vaultCount();
  console.log("Total vaults:", vaultCount.toString());

  /* ========== SAVE DEPLOYMENT ========== */

  const network = await ethers.provider.getNetwork();

  const deployment = {
    contract: "VaultKeeper",
    address: vaultAddress,
    owner,
    token: tokenAddress,
    chainId: network.chainId.toString(),
    vaultCount: vaultCount.toString(),
    deployedAt: new Date().toISOString(),
  };

  const dir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `vault-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(deployment, null, 2));

  fs.writeFileSync(
    path.join(dir, `latest-vault.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("📄 Saved deployment:", file);

  console.log("\n🎉 DONE!");
  console.log("Vault:", vaultAddress);
  console.log("Token:", tokenAddress);

  return vaultAddress;
}

async function main() {
  await deployVaultKeeper();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});