// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import {
    FHE,
    euint64,
    ebool,
    InEuint64
} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/* ========== FHERC20 INTERFACE ========== */
interface IFHERC20 {
    function confidentialTransfer(address to, InEuint64 memory value) external returns (euint64);
    function confidentialTransfer(address to, euint64 value) external returns (euint64);

    function confidentialTransferFrom(
        address from,
        address to,
        InEuint64 memory value
    ) external returns (euint64);

    function confidentialTransferFrom(
        address from,
        address to,
        euint64 value
    ) external returns (euint64);

    function setOperator(address operator, uint48 until) external;
}

/* ========== CONTRACT ========== */
contract VaultKeeper is Ownable {

    enum RiskLevel { Low, Medium, High }

    struct Vault {
        string name;
        RiskLevel riskLevel;
        uint256 minAPY;
        uint256 maxAPY;
        euint64 totalValueLocked;
        address tokenAddress;
        bool active;
    }

    struct UserDeposit {
        euint64 amount;
        uint256 timestamp;
    }

    uint256 public vaultCount;
    uint256 public constant BASIS_POINTS = 10000;

    address public rewardToken;

    mapping(uint256 => Vault) public vaults;
    mapping(uint256 => mapping(address => UserDeposit)) public userDeposits;
    mapping(uint256 => mapping(address => euint64)) public rewardsClaimed;
    mapping(uint256 => address[]) public vaultDepositors;

    /* ========== EVENTS ========== */
    event VaultCreated(uint256 indexed vaultId, string name, RiskLevel riskLevel);
    event DepositMade(uint256 indexed vaultId, address indexed user);
    event WithdrawalMade(uint256 indexed vaultId, address indexed user);

    constructor(address _owner) Ownable(_owner) {}

    /* ========== OWNER FUNCTIONS ========== */

    function createVault(
        string memory name,
        RiskLevel riskLevel,
        uint256 minAPY,
        uint256 maxAPY,
        address tokenAddress
    ) external onlyOwner {

        vaults[vaultCount] = Vault({
            name: name,
            riskLevel: riskLevel,
            minAPY: minAPY,
            maxAPY: maxAPY,
            totalValueLocked: FHE.asEuint64(0),
            tokenAddress: tokenAddress,
            active: true
        });

        emit VaultCreated(vaultCount, name, riskLevel);
        vaultCount++;
    }

    function setRewardToken(address _token) external onlyOwner {
        rewardToken = _token;
    }

    /* ========== USER FUNCTIONS ========== */

    function deposit(uint256 vaultId, InEuint64 calldata encAmount) external {

        Vault storage v = vaults[vaultId];
        require(v.active, "Inactive vault");

        IFHERC20 token = IFHERC20(v.tokenAddress);

        token.confidentialTransferFrom(msg.sender, address(this), encAmount);

        euint64 amount = FHE.asEuint64(encAmount);

        if (userDeposits[vaultId][msg.sender].timestamp == 0) {
            vaultDepositors[vaultId].push(msg.sender);
        }

        userDeposits[vaultId][msg.sender].amount =
            FHE.add(userDeposits[vaultId][msg.sender].amount, amount);

        v.totalValueLocked =
            FHE.add(v.totalValueLocked, amount);

        userDeposits[vaultId][msg.sender].timestamp = block.timestamp;

        emit DepositMade(vaultId, msg.sender);
    }

    function withdraw(uint256 vaultId, InEuint64 calldata encAmount) external {

        Vault storage v = vaults[vaultId];
        UserDeposit storage user = userDeposits[vaultId][msg.sender];

        IFHERC20 token = IFHERC20(v.tokenAddress);

        euint64 amount = FHE.asEuint64(encAmount);

        ebool canWithdraw = amount.lte(user.amount);

        user.amount = FHE.select(
            canWithdraw,
            FHE.sub(user.amount, amount),
            user.amount
        );

        v.totalValueLocked = FHE.select(
            canWithdraw,
            FHE.sub(v.totalValueLocked, amount),
            v.totalValueLocked
        );

        token.confidentialTransfer(msg.sender, encAmount);

        emit WithdrawalMade(vaultId, msg.sender);
    }

    function calculateYield(uint256 vaultId, address userAddr)
        public returns (euint64)
    {
        UserDeposit memory user = userDeposits[vaultId][userAddr];

        uint256 avgAPY =
            (vaults[vaultId].minAPY + vaults[vaultId].maxAPY) / 2;

        return FHE.div(
            FHE.mul(user.amount, FHE.asEuint64(avgAPY)),
            FHE.asEuint64(BASIS_POINTS)
        );
    }

    function claimRewards(uint256 vaultId) external {

        IFHERC20 token = IFHERC20(rewardToken);

        euint64 reward = calculateYield(vaultId, msg.sender);

        rewardsClaimed[vaultId][msg.sender] =
            FHE.add(rewardsClaimed[vaultId][msg.sender], reward);

        token.confidentialTransfer(msg.sender, reward);
    }

    /* ========== GETTERS (ALL INCLUDED) ========== */

    function getPendingRewards(uint256 vaultId, address user)
        external returns (euint64)
    {
        return calculateYield(vaultId, user);
    }

    function getUserDeposit(uint256 vaultId, address user)
        external view
        returns (euint64 amount, uint256 timestamp)
    {
        UserDeposit memory d = userDeposits[vaultId][user];
        return (d.amount, d.timestamp);
    }

    function getVaultAPY(uint256 vaultId)
        external view returns (uint256, uint256)
    {
        return (
            vaults[vaultId].minAPY,
            vaults[vaultId].maxAPY
        );
    }

    function getVaultTVL(uint256 vaultId)
        external view returns (euint64)
    {
        return vaults[vaultId].totalValueLocked;
    }

    function getUserVaultSummary(uint256 vaultId, address user)
        external 
        returns (
            euint64 userDeposit,
            euint64 pendingRewards,
            euint64 vaultTVL
        )
    {
        userDeposit = userDeposits[vaultId][user].amount;
        pendingRewards = calculateYield(vaultId, user);
        vaultTVL = vaults[vaultId].totalValueLocked;
    }

    function getAllVaults() external view returns (Vault[] memory) {
        Vault[] memory allVaults = new Vault[](vaultCount);

        for (uint256 i = 0; i < vaultCount; i++) {
            allVaults[i] = vaults[i];
        }

        return allVaults;
    }

    function getDepositorCount(uint256 vaultId)
        external view returns (uint256)
    {
        return vaultDepositors[vaultId].length;
    }

    /* ========== EMERGENCY ========== */

    function emergencyWithdraw(uint256 vaultId) external onlyOwner {

        Vault storage v = vaults[vaultId];
        IFHERC20 token = IFHERC20(v.tokenAddress);

        euint64 amount = v.totalValueLocked;

        v.totalValueLocked = FHE.asEuint64(0);

        token.confidentialTransfer(owner(), amount);
    }
}