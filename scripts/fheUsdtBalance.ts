import { ethers } from "hardhat";
import { FHEUSDT__factory } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";

function resolveTokenAddress(): string {
  const envAddress =
    process.env.FHE_TOKEN_ADDRESS ;

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
  const target = (process.env.USER_ADDRESS || process.argv[2] || signer.address).trim();

  if (!ethers.isAddress(target)) {
    throw new Error(`Invalid user address: ${target}`);
  }

  const token = FHEUSDT__factory.connect(tokenAddress, signer);

  const [decimals, isIndicator, balance, confidential] = await Promise.all([
    token.decimals(),
    token.balanceOfIsIndicator(),
    token.balanceOf(target),
    token.confidentialBalanceOf(target),
  ]);

  console.log("FHEUSDT address:", tokenAddress);
  console.log("decimals",decimals);
  console.log("User:", target);
  console.log("balanceOfIsIndicator:", isIndicator);
  console.log("balanceOf (raw):", balance.toString());
  console.log("balanceOf (formatted):", ethers.formatUnits(balance, decimals));
  console.log("confidentialBalanceOf (ciphertext):", confidential);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
