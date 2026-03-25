// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

// Fhenix Imports (LATEST API)
import { FHE, euint32, ebool, inEuint32 } from "@fhenixprotocol/contracts/FHE.sol";

contract FHEUSDT {

    string public name = "FHE USDT";
    string public symbol = "fUSDT";
    uint8 public decimals = 6;

    address public owner;

    // 🔐 Encrypted balances
    mapping(address => euint32) private balances;

    // 🔐 Encrypted allowances
    mapping(address => mapping(address => euint32)) private allowances;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /* ========== MINT ========== */

    function mint(address to, inEuint32 calldata encAmount) external onlyOwner {
        euint32 amount = FHE.asEuint32(encAmount);

        balances[to] = FHE.add(balances[to], amount);
    }

    /* ========== TRANSFER ========== */

    function transfer(address to, inEuint32 calldata encAmount) external {

        euint32 amount = FHE.asEuint32(encAmount);

        ebool canTransfer = FHE.gte(balances[msg.sender], amount);

        balances[msg.sender] = FHE.select(
            canTransfer,
            FHE.sub(balances[msg.sender], amount),
            balances[msg.sender]
        );

        balances[to] = FHE.select(
            canTransfer,
            FHE.add(balances[to], amount),
            balances[to]
        );
    }

    /* ========== APPROVE ========== */

    function approve(address spender, inEuint32 calldata encAmount) external {

        euint32 amount = FHE.asEuint32(encAmount);

        allowances[msg.sender][spender] = amount;
    }

    /* ========== TRANSFER FROM (VAULT COMPATIBLE) ========== */

    function transferFrom(
        address from,
        address to,
        inEuint32 calldata encAmount
    ) external {

        euint32 amount = FHE.asEuint32(encAmount);

        // Check allowance
        ebool canSpend = FHE.gte(allowances[from][msg.sender], amount);

        // Check balance
        ebool canTransfer = FHE.gte(balances[from], amount);

        // Combine both conditions
        ebool finalCond = FHE.and(canSpend, canTransfer);

        // Deduct balance from sender
        balances[from] = FHE.select(
            finalCond,
            FHE.sub(balances[from], amount),
            balances[from]
        );

        // Add to receiver
        balances[to] = FHE.select(
            finalCond,
            FHE.add(balances[to], amount),
            balances[to]
        );

        // Reduce allowance
        allowances[from][msg.sender] = FHE.select(
            finalCond,
            FHE.sub(allowances[from][msg.sender], amount),
            allowances[from][msg.sender]
        );
    }

    /* ========== VIEW FUNCTIONS (ENCRYPTED) ========== */

    function balanceOf(address user) external view returns (euint32) {
        return balances[user];
    }

    function allowance(address ownerAddr, address spender)
        external
        view
        returns (euint32)
    {
        return allowances[ownerAddr][spender];
    }
}