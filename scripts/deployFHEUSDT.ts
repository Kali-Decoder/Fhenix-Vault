import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying FHEUSDT...");
  console.log("Deployer:", deployer.address);

  // 🔥 DEPLOY (NO constructor args)
  const token = await ethers.deployContract("FHEUSDT");
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("FHEUSDT deployed at:", tokenAddress);

  // 🔥 MINT (uint64, NOT parseUnits)
  const mintTo = deployer.address;
  const mintAmount = 1_000_000; // 👈 simple number (uint64)

  const mintTx = await token.mint(mintTo, mintAmount);
  await mintTx.wait();

  console.log(`Minted ${mintAmount} tokens to ${mintTo}`);

  // ⚠️ FHERC20 NOTE
  console.log("⚠️ balanceOf is only indicator, not real balance");

  // Save deployment
  const network = await ethers.provider.getNetwork();

  const deployment = {
    contract: "FHEUSDT",
    address: tokenAddress,
    deployer: deployer.address,
    mintedTo: mintTo,
    mintAmount,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const dir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "fheusdt.json"),
    JSON.stringify(deployment, null, 2)
  );

  console.log("✅ Deployment complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});