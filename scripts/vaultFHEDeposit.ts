import { ethers } from "hardhat";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import { getVaultKeeperContract } from "./vaultFHEHelpers";

const FHERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function setOperator(address operator, uint48 until)",
  "function isOperator(address owner, address operator) view returns (bool)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
];

async function main() {
  const { vaultKeeper, signerAddress } = await getVaultKeeperContract();
  const [signer] = await ethers.getSigners();
  const provider = signer.provider ?? ethers.provider;

  const vaultId = 0n;
  const amountRaw = "10";

  const vault = await vaultKeeper.vaults(vaultId);
  if (!vault.active) throw new Error("Vault inactive");

  const token = new ethers.Contract(vault.tokenAddress, FHERC20_ABI, signer);
  const decimals = await token.decimals();
  const amount = ethers.parseUnits(amountRaw, decimals);
  const vaultAddress = await vaultKeeper.getAddress();

  console.log("Vault:", vaultAddress);
  console.log("Amount:", amountRaw);

  // ✅ INIT (USER SIGNER)
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: signer,
    environment: "TESTNET",
  });

  // ✅ SET OPERATOR
  const isOp = await token.isOperator(signerAddress, vaultAddress);
  if (!isOp) {
    const tx = await token.setOperator(
      vaultAddress,
      Math.floor(Date.now() / 1000) + 3600
    );
    await tx.wait();
    console.log("Operator set");
  }

  // 🔥🔥 CRITICAL FIX: PERMIT FOR CONTRACT (NOT USER)
  const permit = await cofhejs.createPermit({
    type: "self",
    issuer: vaultAddress, // ✅ THIS IS THE FIX
  });

  // 🔐 ENCRYPT USING CONTRACT PERMISSION
  const encrypted = await cofhejs.encrypt(
    [Encryptable.uint64(amount)],
    { permit }
  );

  const encAmount = encrypted.data[0];
  console.log("Encrypted OK");
  console.log("EncAmount:", encAmount);

  // ✅ BALANCE CHECK (USER CONTEXT)
  try {
    const ciphertext = await token.confidentialBalanceOf(signerAddress);

    const userPermit = await cofhejs.createPermit({
      type: "self",
      issuer: signerAddress,
    });

    const unsealed = await cofhejs.unseal(
      ciphertext,
      FheTypes.Uint64,
      userPermit.data.issuer,
      userPermit.data.getHash()
    );

    const balance =
      typeof unsealed === "bigint"
        ? unsealed
        : unsealed?.data ?? 0n;

    console.log("Balance:", balance.toString());

    if (balance < amount) {
      throw new Error("Insufficient balance");
    }
  } catch (err) {
    console.log("Balance check failed:", err);
    throw err;
  }

  // ✅ PRECHECK
  await vaultKeeper.deposit.staticCall(vaultId, encAmount);

  // ✅ EXECUTE
  const tx = await vaultKeeper.deposit(vaultId, encAmount);
  console.log("TX:", tx.hash);

  await tx.wait();

  console.log("✅ Deposit SUCCESS 🚀");
}

main().catch((e) => {
  console.error("❌ ERROR:", e);
  process.exit(1);
});