// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import {
    FHE,
    euint32,
    ebool,
    inEuint32
} from "@fhenixprotocol/contracts/FHE.sol";

/* ========== FHE TOKEN INTERFACE ========== */
interface IFHEUSDT {
    function transfer(address to, inEuint32 calldata amount) external;
    function transferFrom(
        address from,
        address to,
        inEuint32 calldata amount
    ) external;

    // 🔥 NEW (IMPORTANT)
    function transferEncrypted(address to, euint32 amount) external;
}

/* ========== CONTRACT ========== */
contract VaultKeeper is Ownable {
    enum RiskLevel {
        Low,
        Medium,
        High
    }

    struct Vault {
        string name;
        RiskLevel riskLevel;
        uint256 minAPY;
        uint256 maxAPY;
        euint32 totalValueLocked; // 🔐 encrypted
        address tokenAddress;
        bool active;
    }

    struct UserDeposit {
        euint32 amount; // 🔐 encrypted
        uint256 timestamp;
    }

    uint256 public vaultCount;
    uint256 public constant BASIS_POINTS = 10000;

    address public rewardToken;

    mapping(uint256 => Vault) public vaults;
    mapping(uint256 => mapping(address => UserDeposit)) public userDeposits;
    mapping(uint256 => address[]) public vaultDepositors;
    mapping(uint256 => mapping(address => euint32)) public rewardsClaimed;

    /* ========== EVENTS (amounts removed for privacy) ========== */
    event VaultCreated(
        uint256 indexed vaultId,
        string name,
        RiskLevel riskLevel
    );
    event DepositMade(uint256 indexed vaultId, address indexed user);
    event WithdrawalMade(uint256 indexed vaultId, address indexed user);
    event APYUpdated(uint256 indexed vaultId, uint256 minAPY, uint256 maxAPY);
    event VaultStatusChanged(uint256 indexed vaultId, bool active);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    /* ========== OWNER FUNCTIONS ========== */

    function createVault(
        string memory name,
        RiskLevel riskLevel,
        uint256 minAPY,
        uint256 maxAPY,
        address tokenAddress
    ) external onlyOwner {
        require(minAPY <= maxAPY, "Invalid APY");
        require(tokenAddress != address(0), "Invalid token");

        vaults[vaultCount] = Vault({
            name: name,
            riskLevel: riskLevel,
            minAPY: minAPY,
            maxAPY: maxAPY,
            totalValueLocked: FHE.asEuint32(0),
            tokenAddress: tokenAddress,
            active: true
        });

        vaultCount++;

        emit VaultCreated(vaultCount - 1, name, riskLevel);
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        require(_rewardToken != address(0), "Invalid token");
        rewardToken = _rewardToken;
    }

    function updateAPY(
        uint256 vaultId,
        uint256 minAPY,
        uint256 maxAPY
    ) external onlyOwner {
        require(vaultId < vaultCount, "Invalid vault ID");

        vaults[vaultId].minAPY = minAPY;
        vaults[vaultId].maxAPY = maxAPY;

        emit APYUpdated(vaultId, minAPY, maxAPY);
    }

    function toggleVaultActive(uint256 vaultId) external onlyOwner {
        require(vaultId < vaultCount, "Invalid vault ID");

        vaults[vaultId].active = !vaults[vaultId].active;

        emit VaultStatusChanged(vaultId, vaults[vaultId].active);
    }

    /* ========== USER FUNCTIONS ========== */

    function deposit(uint256 vaultId, inEuint32 calldata encAmount) external {
        require(vaultId < vaultCount, "Invalid vault ID");
        require(vaults[vaultId].active, "Vault not active");

        IFHEUSDT token = IFHEUSDT(vaults[vaultId].tokenAddress);

        // 🔐 transfer encrypted tokens
        token.transferFrom(msg.sender, address(this), encAmount);

        euint32 amount = FHE.asEuint32(encAmount);

        if (userDeposits[vaultId][msg.sender].timestamp == 0) {
            vaultDepositors[vaultId].push(msg.sender);
        }

        userDeposits[vaultId][msg.sender].amount = FHE.add(
            userDeposits[vaultId][msg.sender].amount,
            amount
        );

        userDeposits[vaultId][msg.sender].timestamp = block.timestamp;

        vaults[vaultId].totalValueLocked = FHE.add(
            vaults[vaultId].totalValueLocked,
            amount
        );

        emit DepositMade(vaultId, msg.sender);
    }

    function withdraw(uint256 vaultId, inEuint32 calldata encAmount) external {
        require(vaultId < vaultCount, "Invalid vault ID");

        IFHEUSDT token = IFHEUSDT(vaults[vaultId].tokenAddress);

        UserDeposit storage user = userDeposits[vaultId][msg.sender];

        euint32 amount = FHE.asEuint32(encAmount);

        ebool canWithdraw = FHE.gte(user.amount, amount);

        user.amount = FHE.select(
            canWithdraw,
            FHE.sub(user.amount, amount),
            user.amount
        );

        vaults[vaultId].totalValueLocked = FHE.select(
            canWithdraw,
            FHE.sub(vaults[vaultId].totalValueLocked, amount),
            vaults[vaultId].totalValueLocked
        );

        user.timestamp = block.timestamp;

        token.transfer(msg.sender, encAmount);

        emit WithdrawalMade(vaultId, msg.sender);
    }

    function calculateYield(
        uint256 vaultId,
        address userAddr
    ) public view returns (euint32) {
        UserDeposit memory user = userDeposits[vaultId][userAddr];

        uint256 avgAPY = (vaults[vaultId].minAPY + vaults[vaultId].maxAPY) / 2;

        euint32 encAPY = FHE.asEuint32(avgAPY);
        euint32 encBasis = FHE.asEuint32(BASIS_POINTS);

        return FHE.div(FHE.mul(user.amount, encAPY), encBasis);
    }

    function claimRewards(uint256 vaultId) external {
        require(vaultId < vaultCount, "Invalid vault");
        require(rewardToken != address(0), "Reward token not set");

        IFHEUSDT token = IFHEUSDT(rewardToken);

        euint32 reward = calculateYield(vaultId, msg.sender);

        rewardsClaimed[vaultId][msg.sender] = FHE.add(
            rewardsClaimed[vaultId][msg.sender],
            reward
        );

        // ✅ FIX: use encrypted transfer
        token.transferEncrypted(msg.sender, reward);
    }

    /* ========== GETTERS ========== */

    function getPendingRewards(
        uint256 vaultId,
        address user
    ) external view returns (euint32) {
        return calculateYield(vaultId, user);
    }

    function getUserDeposit(
        uint256 vaultId,
        address user
    ) external view returns (euint32 amount, uint256 timestamp) {
        UserDeposit memory d = userDeposits[vaultId][user];
        return (d.amount, d.timestamp);
    }

    function getVaultAPY(
        uint256 vaultId
    ) external view returns (uint256, uint256) {
        return (vaults[vaultId].minAPY, vaults[vaultId].maxAPY);
    }

    function getVaultTVL(uint256 vaultId) external view returns (euint32) {
        return vaults[vaultId].totalValueLocked;
    }

    function getUserVaultSummary(
        uint256 vaultId,
        address user
    )
        external
        view
        returns (euint32 deposit, euint32 pendingRewards, euint32 vaultTVL)
    {
        deposit = userDeposits[vaultId][user].amount;
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

    function getDepositorCount(
        uint256 vaultId
    ) external view returns (uint256) {
        return vaultDepositors[vaultId].length;
    }

    /* ========== EMERGENCY ========== */

    function emergencyWithdraw(uint256 vaultId) external onlyOwner {
        require(vaultId < vaultCount, "Invalid vault");

        Vault storage v = vaults[vaultId];
        IFHEUSDT token = IFHEUSDT(v.tokenAddress);

        // 🔐 Get full encrypted TVL
        euint32 amount = v.totalValueLocked;

        // 🔐 Reset vault TVL
        v.totalValueLocked = FHE.asEuint32(0);

        // ✅ CORRECT CALL
        token.transferEncrypted(owner(), amount);
    }
}
