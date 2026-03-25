import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

function getAddressFromEnv(key: string, fallback: string): string {
  const value = process.env[key] || fallback;
  if (!ethers.isAddress(value)) {
    throw new Error(`Invalid ${key}: ${value}`);
  }
  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = deployer.address;
  const deployerBalance = await ethers.provider.getBalance(deployerAddress);

  console.log("Deploying USDT...");
  console.log("Deployer:", deployerAddress);
  console.log("Deployer balance:", ethers.formatEther(deployerBalance), "ETH");

  const initialOwner = getAddressFromEnv("USDT_OWNER_ADDRESS", deployerAddress);
  const mintTo = getAddressFromEnv("USDT_MINT_TO", initialOwner);
  const mintAmountHuman = process.env.USDT_MINT_AMOUNT || "1000000";

  const usdt = await ethers.deployContract("USDT", [initialOwner]);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();

  console.log("USDT deployed at:", usdtAddress);

  const owner = await usdt.owner();
  if (owner.toLowerCase() !== initialOwner.toLowerCase()) {
    throw new Error(`Owner mismatch: expected ${initialOwner}, got ${owner}`);
  }

  const decimals = Number(await usdt.decimals());
  const mintAmountRaw = ethers.parseUnits(mintAmountHuman, decimals);

  const mintTx = await usdt.mint(mintTo, mintAmountRaw);
  await mintTx.wait();

  const balanceAfterMint = await usdt.balanceOf(mintTo);
  console.log(`Minted ${mintAmountHuman} USDT to ${mintTo}`);
  console.log("Minted raw amount:", mintAmountRaw.toString());
  console.log("Recipient balance:", ethers.formatUnits(balanceAfterMint, decimals), "USDT");

  const network = await ethers.provider.getNetwork();
  const hardhatNetwork = process.env.HARDHAT_NETWORK || network.name;
  const deploymentInfo = {
    contractName: "USDT",
    address: usdtAddress,
    deployer: deployerAddress,
    owner,
    mintedTo: mintTo,
    mintedAmount: mintAmountHuman,
    mintedAmountRaw: mintAmountRaw.toString(),
    decimals,
    network: hardhatNetwork,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `USDT-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentFile);

  const latestDeploymentFile = path.join(deploymentsDir, `latest-usdt-${hardhatNetwork}.json`);
  fs.writeFileSync(latestDeploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("Latest USDT pointer saved to:", latestDeploymentFile);
  console.log(`Set this in env if needed: STABLE_VAULT_TOKEN_ADDRESS=${usdtAddress}`);

  console.log("✅ USDT deployment + mint complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
