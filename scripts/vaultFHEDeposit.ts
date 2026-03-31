import { ethers } from "hardhat";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import { getVaultKeeperContract } from "./vaultFHEHelpers";

const FHERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function setOperator(address operator, uint48 until)",
  "function isOperator(address owner, address operator) view returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

async function main() {
  const { vaultKeeper, signerAddress } = await getVaultKeeperContract();
  const [signer] = await ethers.getSigners();
  const provider = signer.provider ?? ethers.provider;

  const vaultIdRaw = "0";
  const amountRaw = "10";

  if (!vaultIdRaw) {
    throw new Error("Provide VAULT_ID (env or argv[2])");
  }
  if (!amountRaw || Number.isNaN(Number(amountRaw))) {
    throw new Error("Provide DEPOSIT_AMOUNT (env or argv[3])");
  }

  const vaultId = BigInt(vaultIdRaw);
  const vault = await vaultKeeper.vaults(vaultId);

  if (!vault.active) {
    throw new Error(`Vault ${vaultId} is inactive`);
  }

  const tokenAddress = vault.tokenAddress;
  const token = new ethers.Contract(tokenAddress, FHERC20_ABI, signer);
  const decimals: number = await token.decimals();
  const amount = ethers.parseUnits(amountRaw, decimals);
  const vaultAddress = await vaultKeeper.getAddress();

  console.log("VaultKeeper:", vaultAddress);
  console.log("Vault ID:", vaultId.toString());
  console.log("Token:", tokenAddress);
  console.log("Amount:", amountRaw, `(raw: ${amount.toString()})`);

  const env = (process.env.COFHE_ENV || "TESTNET").toUpperCase();
  console.log("CoFHE env:", env);
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: signer,
    environment: env,
  });

  // Prefer operator flow; fallback to approve if unsupported.
  try {
    const before = await token.isOperator(signerAddress, vaultAddress);
    console.log("Operator before:", before);
    const operatorUntil = Math.floor(Date.now() / 1000) + 60 * 60;
    const tx = await token.setOperator(vaultAddress, operatorUntil);
    await tx.wait();
    const after = await token.isOperator(signerAddress, vaultAddress);
    console.log("Operator after:", after);
  } catch {
    const allowance: bigint = await token.allowance(signerAddress, vaultAddress);
    console.log("Allowance:", allowance.toString());
    if (allowance < amount) {
      const tx = await token.approve(vaultAddress, amount);
      await tx.wait();
    }
  }

  const encrypted = await cofhejs.encrypt([Encryptable.uint64(amount)]);
  const encAmount = encrypted.data[0];
  console.log(
    "Encrypted amount:",
    JSON.stringify(encAmount, (_, value) => (typeof value === "bigint" ? value.toString() : value))
  );

  // Check decrypted balance before attempting deposit (helps explain reverts).
  try {
    const ciphertext = await token.confidentialBalanceOf(signerAddress);
    const permit = await cofhejs.createPermit({ type: "self", issuer: signerAddress });
    const unsealed = await cofhejs.unseal(
      ciphertext,
      FheTypes.Uint64,
      permit.data.issuer,
      permit.data.getHash()
    );
    const current =
      typeof unsealed === "bigint"
        ? unsealed
        : (unsealed as { data?: bigint }).data ?? 0n;
    console.log("Decrypted balance (raw):", current.toString());
    console.log("Decrypted balance (formatted):", ethers.formatUnits(current, decimals));
    if (current < amount) {
      throw new Error(
        `Insufficient balance. Need ${amountRaw} but have ${ethers.formatUnits(current, decimals)}`
      );
    }
  } catch (error) {
    console.log("Balance decrypt check failed:", error);
  }

  // Preflight to surface revert reasons early.
  await vaultKeeper.deposit.staticCall(vaultId, encAmount);

  const tx = await vaultKeeper.deposit(vaultId, encAmount);
  console.log("Deposit tx:", tx.hash);
  await tx.wait();
  console.log("Deposit complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
