// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { FHERC20 } from "fhenix-confidential-contracts/contracts/FHERC20.sol";

contract FHEUSDT is FHERC20 {

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() FHERC20("FHE USDT", "fUSDT", 6) {
        owner = msg.sender;
    }

    /* ========== MINT ========== */

    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, amount);
    }
}