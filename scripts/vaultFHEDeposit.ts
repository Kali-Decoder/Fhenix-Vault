import { ethers } from "hardhat";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import { getVaultKeeperContract } from "./vaultFHEHelpers";

const FHERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function balanceOfIsIndicator() view returns (bool)",
  "function confidentialTransferFrom(address from, address to, (uint256,uint8,uint8,bytes) value) returns (bytes32)",
  "function setOperator(address operator, uint48 until)",
  "function isOperator(address owner, address operator) view returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
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
  try {
    const [indicator, plainBal] = await Promise.all([
      token.balanceOfIsIndicator(),
      token.balanceOf(signerAddress),
    ]);
    console.log("balanceOfIsIndicator:", indicator);
    console.log("balanceOf (raw):", plainBal.toString());
    console.log("balanceOf (formatted):", ethers.formatUnits(plainBal, decimals));
  } catch {
    console.log("balanceOf info unavailable (non-standard token)");
  }

  const env = (process.env.COFHE_ENV || "TESTNET").toUpperCase();
  console.log("CoFHE env:", env);
  // First init with the user signer to decrypt their balance.
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

  // Re-init with a vault-address signer so encrypted inputs are valid for msg.sender=VaultKeeper.
  const cofheSigner = {
    getAddress: async () => vaultAddress,
    signTypedData: async (...args: any[]) => signer.signTypedData(...args),
    _signTypedData: (signer as any)._signTypedData
      ? async (...args: any[]) => (signer as any)._signTypedData(...args)
      : undefined,
    sendTransaction: async (tx: any) => signer.sendTransaction(tx),
  };
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: cofheSigner,
    environment: env,
  });

  const encrypted = await cofhejs.encrypt([Encryptable.uint64(amount)]);
  const encAmount = encrypted.data[0];
  console.log(
    "Encrypted amount:",
    JSON.stringify(encAmount, (_, value) => (typeof value === "bigint" ? value.toString() : value))
  );
  const encAmountTuple = [
    encAmount.ctHash,
    encAmount.securityZone,
    encAmount.utype,
    encAmount.signature,
  ];

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
    throw error;
  }

  // Preflight to surface revert reasons early.
  try {
    const transferFn = token["confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))"];
    await transferFn.staticCall(signerAddress, vaultAddress, encAmountTuple);
    console.log("Token transfer preflight: ok");
    const data = token.interface.encodeFunctionData(
      "confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))",
      [signerAddress, vaultAddress, encAmountTuple]
    );
    await provider.call({ to: tokenAddress, data, from: vaultAddress });
    console.log("Token transfer preflight (as vault): ok");
  } catch (error) {
    console.log("Token transfer preflight failed:", error);
    throw error;
  }
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
