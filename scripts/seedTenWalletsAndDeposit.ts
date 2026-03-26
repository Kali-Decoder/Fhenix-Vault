import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { resolveVaultKeeperAddress } from "./vaultFHEHelpers";

type SeedWallet = {
  address: string;
  privateKey: string;
  vaultId: number;
  fundedNative: string;
  fundedUsdt: string;
  depositedUsdt: string;
};

const WALLET_COUNT = 10;
const MIN_USDT = 10;
const MAX_USDT = 20;

function randomIntInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const [admin] = await ethers.getSigners();
  const provider = ethers.provider;

  const vaultKeeperAddress = resolveVaultKeeperAddress();
  const usdtAddress = process.env.REWARD_TOKEN_ADDRESS || process.env.REWARD_TOKEN_ADDRESS;
  if (!usdtAddress || !ethers.isAddress(usdtAddress)) {
    throw new Error("Set REWARD_TOKEN_ADDRESS (or STABLE_VAULT_TOKEN_ADDRESS) in env");
  }

  const vaultKeeper = await ethers.getContractAt("VaultKeeper", vaultKeeperAddress, admin);
  const usdt = await ethers.getContractAt("USDT", usdtAddress, admin);

  const usdtDecimals = Number(await usdt.decimals());
  const nativeAmount = ethers.parseEther("0.1");

  const vaultCount = Number(await vaultKeeper.vaultCount());
  if (vaultCount === 0) {
    throw new Error("No vaults found. Create vaults before seeding wallets.");
  }

  const eligibleVaultIds: number[] = [];
  for (let i = 0; i < vaultCount; i++) {
    const vault = await vaultKeeper.vaults(i);
    if (vault.active && vault.tokenAddress.toLowerCase() === usdtAddress.toLowerCase()) {
      eligibleVaultIds.push(i);
    }
  }

  if (eligibleVaultIds.length === 0) {
    throw new Error(`No active vault is configured with USDT token address ${usdtAddress}`);
  }

  const adminUsdtBalance = await usdt.balanceOf(admin.address);
  const maxUsdtAmountPerWallet = ethers.parseUnits(String(MAX_USDT), usdtDecimals);
  const requiredUsdt = maxUsdtAmountPerWallet * BigInt(WALLET_COUNT);
  if (adminUsdtBalance < requiredUsdt) {
    throw new Error(
      `Admin USDT balance is low. Required ${ethers.formatUnits(requiredUsdt, usdtDecimals)}, available ${ethers.formatUnits(adminUsdtBalance, usdtDecimals)}`
    );
  }

  console.log(`Seeding ${WALLET_COUNT} wallets...`);
  console.log("VaultKeeper:", vaultKeeperAddress);
  console.log("USDT:", usdtAddress);
  console.log(`USDT transfer/deposit range per wallet: ${MIN_USDT}-${MAX_USDT} USDT`);
  console.log("Eligible vault IDs:", eligibleVaultIds.join(", "));

  const seededWallets: SeedWallet[] = [];

  for (let i = 0; i < WALLET_COUNT; i++) {
    const wallet = ethers.Wallet.createRandom().connect(provider);
    const randomVaultId = eligibleVaultIds[Math.floor(Math.random() * eligibleVaultIds.length)];
    const randomUsdtHuman = randomIntInRange(MIN_USDT, MAX_USDT);
    const randomUsdtAmount = ethers.parseUnits(String(randomUsdtHuman), usdtDecimals);

    const nativeTx = await admin.sendTransaction({
      to: wallet.address,
      value: nativeAmount,
    });
    await nativeTx.wait();

    const transferTx = await usdt.transfer(wallet.address, randomUsdtAmount);
    await transferTx.wait();

    const usdtAsWallet = usdt.connect(wallet);
    const approveTx = await usdtAsWallet.approve(vaultKeeperAddress, randomUsdtAmount);
    await approveTx.wait();

    const vaultAsWallet = vaultKeeper.connect(wallet);
    const depositTx = await vaultAsWallet.deposit(BigInt(randomVaultId), randomUsdtAmount);
    await depositTx.wait();

    seededWallets.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
      vaultId: randomVaultId,
      fundedNative: ethers.formatEther(nativeAmount),
      fundedUsdt: ethers.formatUnits(randomUsdtAmount, usdtDecimals),
      depositedUsdt: ethers.formatUnits(randomUsdtAmount, usdtDecimals),
    });

    console.log(
      `Wallet ${i + 1}/${WALLET_COUNT} => ${wallet.address} | vault ${randomVaultId} | deposited ${randomUsdtHuman} USDT`
    );
  }

  const network = await provider.getNetwork();
  const hardhatNetwork = process.env.HARDHAT_NETWORK || network.name;
  const output = {
    generatedAt: new Date().toISOString(),
    network: hardhatNetwork,
    chainId: network.chainId.toString(),
    admin: admin.address,
    vaultKeeperAddress,
    usdtAddress,
    nativeFundedPerWallet: ethers.formatEther(nativeAmount),
    usdtFundedPerWalletRange: `${MIN_USDT}-${MAX_USDT}`,
    walletCount: seededWallets.length,
    wallets: seededWallets,
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, `seed-wallets-10-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

  console.log("\n✅ Seeding completed");
  console.log("Output file:", outFile);
  console.log("Contains private keys. Keep it secure.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
