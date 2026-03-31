import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { getDefaultChain } from "../../../config/chains";
import { REWARD_TOKEN_ADDRESS } from "../../../config/vault_config";

const FAUCET_AMOUNT = "100";
const TOKEN_DECIMALS = 6;
const FHEUSDT_ABI = [
  "function owner() view returns (address)",
  "function mint(address to, uint64 amount)",
];

type MintRequestBody = {
  address?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MintRequestBody;
    const userAddress = body.address?.trim();

    if (!userAddress || !ethers.isAddress(userAddress)) {
      return NextResponse.json({ error: "Valid user address is required." }, { status: 400 });
    }

    const privateKeyRaw = process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKeyRaw) {
      return NextResponse.json(
        { error: "Server wallet private key is missing. Set ADMIN_PRIVATE_KEY or PRIVATE_KEY." },
        { status: 500 }
      );
    }
    const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;

    const rpcUrl = getDefaultChain().rpcUrls.default.http[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const adminWallet = new ethers.Wallet(privateKey, provider);
    const usdt = new ethers.Contract(REWARD_TOKEN_ADDRESS, FHEUSDT_ABI, adminWallet);

    const onchainOwner = (await usdt.owner()) as string;
    if (onchainOwner.toLowerCase() !== adminWallet.address.toLowerCase()) {
      return NextResponse.json(
        {
          error: `Mint failed. Server wallet ${adminWallet.address} is not token owner ${onchainOwner}.`,
        },
        { status: 403 }
      );
    }

    const amount = ethers.parseUnits(FAUCET_AMOUNT, TOKEN_DECIMALS);
    const tx = await usdt.mint(userAddress, amount);
    await tx.wait();

    return NextResponse.json({
      success: true,
      amount: FAUCET_AMOUNT,
      tokenAddress: REWARD_TOKEN_ADDRESS,
      to: userAddress,
      txHash: tx.hash,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Faucet transfer failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
