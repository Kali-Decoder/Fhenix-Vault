import { ethers } from "hardhat";
import { FHEUSDT__factory } from "../typechain-types";
import { FheTypes } from "@cofhe/sdk";
import * as fs from "fs";
import * as path from "path";
import { getCofheClientForEthers6 } from "./cofheHardhat";

function resolveTokenAddress(): string {
  const envAddress =
    process.env.REWARD_TOKEN_ADDRESS ||
    process.env.FHE_TOKEN_ADDRESS ||
    process.env.USDT_ADDRESS ||
    "";

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
  const provider = signer.provider ?? ethers.provider;
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (!Number.isSafeInteger(chainId)) {
    throw new Error(`Invalid chainId: ${network.chainId.toString()}`);
  }

  const target = (process.env.USER_ADDRESS || process.argv[2] || signer.address).trim();
  if (!ethers.isAddress(target)) {
    throw new Error(`Invalid user address: ${target}`);
  }

  if (target.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      `Target ${target} does not match signer ${signer.address}. ` +
        "Decrypting requires the target wallet's private key to create a permit."
    );
  }

  const cofheClient = await getCofheClientForEthers6({ provider, signer });

  const token = FHEUSDT__factory.connect(tokenAddress, signer);
  const [decimals, isIndicator, indicator, ciphertext] = await Promise.all([
    token.decimals(),
    token.balanceOfIsIndicator(),
    token.balanceOf(target),
    token.confidentialBalanceOf(target),
  ]);

  const permit = await cofheClient.permits.getOrCreateSelfPermit(chainId, signer.address, {
    issuer: signer.address,
  });
  const decrypted = await cofheClient
    .decryptForView(ciphertext, FheTypes.Uint64)
    .setChainId(chainId)
    .setAccount(signer.address)
    .withPermit(permit)
    .execute();

  console.log("FHEUSDT address:", tokenAddress);
  console.log("User:", target);
  console.log("balanceOfIsIndicator:", isIndicator);
  console.log("balanceOf (indicator raw):", indicator.toString());
  console.log("balanceOf (indicator formatted):", ethers.formatUnits(indicator, decimals));
  console.log("confidentialBalanceOf (ciphertext):", ciphertext);
  console.log("confidentialBalanceOf (decrypted raw):", decrypted.toString());
  console.log("confidentialBalanceOf (decrypted formatted):", ethers.formatUnits(decrypted, decimals));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
