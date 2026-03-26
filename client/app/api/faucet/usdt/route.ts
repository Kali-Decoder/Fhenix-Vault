import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { getDefaultChain } from "../../../config/chains";
import { ERC20_ABI, REWARD_TOKEN_ADDRESS } from "../../../config/vault_config";

const FAUCET_AMOUNT = "100";

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
    const usdt = new ethers.Contract(REWARD_TOKEN_ADDRESS, ERC20_ABI, adminWallet);

    const decimals = Number(await usdt.decimals());
    const amount = ethers.parseUnits(FAUCET_AMOUNT, decimals);
    const tx = await usdt.transfer(userAddress, amount);
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
