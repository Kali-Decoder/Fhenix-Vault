import { ethers } from "hardhat";
import { FHEUSDT__factory } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";

function resolveTokenAddress(): string {
  const envAddress = process.env.FHE_TOKEN_ADDRESS 

  if (envAddress) {
    if (!ethers.isAddress(envAddress)) {
      throw new Error(`Invalid token address in env: ${envAddress}`);
    }
    return envAddress;
  }

  const deploymentFile = path.join(__dirname, "../deployments/fheusdt.json");
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(
      `Token address not found. Set REWARD_TOKEN_ADDRESS/FHE_TOKEN_ADDRESS or create ${deploymentFile}`
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8")) as { address?: string };
  if (!deployment.address || !ethers.isAddress(deployment.address)) {
    throw new Error(`Invalid deployment file: ${deploymentFile}`);
  }

  return deployment.address;
}

async function main() {
  const tokenAddress = resolveTokenAddress();

  const [signer] = await ethers.getSigners();
  const target = signer.address;
  const amountRaw = "1000000"

  if (!target || !ethers.isAddress(target)) {
    throw new Error("Provide a valid target address (env USER_ADDRESS or first CLI arg)");
  }

  if (!amountRaw || Number.isNaN(Number(amountRaw))) {
    throw new Error(`Invalid amount: ${amountRaw}`);
  }

  const token = FHEUSDT__factory.connect(tokenAddress, signer);
  const decimals = await token.decimals();
  const amount = ethers.parseUnits(amountRaw, decimals);

  console.log("FHEUSDT address:", tokenAddress);
  console.log("Mint to:", target);
  console.log("Amount:", amountRaw);

  const tx = await token.mint(target, amount);
  console.log("tx:", tx.hash);
  await tx.wait();

  console.log("Mint complete");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
