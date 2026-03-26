import { ethers } from "hardhat";
import { getRequiredEnv, getVaultKeeperContract } from "./vaultFHEHelpers";

async function main() {
  const rewardTokenAddress = getRequiredEnv("REWARD_TOKEN_ADDRESS");
  if (!ethers.isAddress(rewardTokenAddress)) {
    throw new Error(`Invalid REWARD_TOKEN_ADDRESS: ${rewardTokenAddress}`);
  }

  const { vaultKeeper } = await getVaultKeeperContract();
  const tx = await vaultKeeper.setRewardToken(rewardTokenAddress);
  await tx.wait();
  console.log(`Reward token set: ${rewardTokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
