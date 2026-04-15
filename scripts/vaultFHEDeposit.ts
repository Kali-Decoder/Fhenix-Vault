import { ethers } from "hardhat";
import { Encryptable, FheTypes, TASK_MANAGER_ADDRESS } from "@cofhe/sdk";
import { getVaultKeeperContract } from "./vaultFHEHelpers";
import { getCofheClientForEthers6 } from "./cofheHardhat";

const FHERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function setOperator(address operator, uint48 until)",
  "function isOperator(address owner, address operator) view returns (bool)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function confidentialTransferFrom(address from, address to, (uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) inValue) returns (bytes32)",
];

function extractRevertData(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const anyErr = error as any;
  return (
    (typeof anyErr.data === "string" ? anyErr.data : null) ||
    (typeof anyErr.error?.data === "string" ? anyErr.error.data : null) ||
    (typeof anyErr.info?.error?.data === "string" ? anyErr.info.error.data : null) ||
    null
  );
}

async function main() {
  const { vaultKeeper, signerAddress } = await getVaultKeeperContract();
  const [signer] = await ethers.getSigners();
  const provider = signer.provider ?? ethers.provider;

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const vaultId = 0n;
  const amountRaw = "10";

  const vault = await vaultKeeper.vaults(vaultId);
  if (!vault.active) throw new Error("Vault inactive");

  const token = new ethers.Contract(vault.tokenAddress, FHERC20_ABI, signer);
  const decimals = await token.decimals();
  const amount = ethers.parseUnits(amountRaw, decimals);

  const vaultAddress = await vaultKeeper.getAddress();

  console.log("Vault:", vaultAddress);
  console.log("Token:", vault.tokenAddress);
  console.log("Signer:", signerAddress);
  console.log("Amount:", amountRaw);

  const cofheClient = await getCofheClientForEthers6({ provider, signer });

  // ✅ Check TaskManager (only for sanity)
  const code = await provider.getCode(TASK_MANAGER_ADDRESS);
  console.log("TaskManager:", code === "0x" ? "MISSING ❌" : "OK ✅");

  // ✅ STEP 1: Ensure operator FIRST
  let isOp = await token.isOperator(signerAddress, vaultAddress);
  console.log("isOperator:", isOp);

  if (!isOp) {
    const until = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    const tx = await token.setOperator(vaultAddress, until);
    await tx.wait();
    console.log("Operator set ✅");

    isOp = await token.isOperator(signerAddress, vaultAddress);
    console.log("isOperator (after set):", isOp);
  }

  // ✅ STEP 2: Encrypt AFTER operator is set
  const [encAmount] = await cofheClient
    .encryptInputs([Encryptable.uint64(amount)])
    .setChainId(chainId)
    .setAccount(signerAddress)
    .execute();

  console.log("Encryption OK ✅");

  // ✅ STEP 3: Balance check (optional but good)
  const ciphertext = await token.confidentialBalanceOf(signerAddress);

  const permit = await cofheClient.permits.getOrCreateSelfPermit(chainId, signerAddress, {
    issuer: signerAddress,
  });

  const balance = await cofheClient
    .decryptForView(ciphertext, FheTypes.Uint64)
    .setChainId(chainId)
    .setAccount(signerAddress)
    .withPermit(permit)
    .execute();

  console.log("Balance:", balance.toString());

  if (balance < amount) {
    throw new Error("Insufficient balance ❌");
  }

  // ✅ STEP 4: Execute deposit
  console.log("Sending deposit tx...");

  try {
    const tx = await vaultKeeper.deposit(vaultId, encAmount);
    console.log("TX Hash:", tx.hash);

    await tx.wait();

    console.log("✅ Deposit SUCCESS 🚀");
  } catch (error) {
    const data = extractRevertData(error);
    console.error("❌ TX FAILED");

    if (data) {
      console.error("Raw Revert Data:", data);
    }

    throw error;
  }
}

main().catch((e) => {
  console.error("❌ ERROR:", e);
  process.exit(1);
});