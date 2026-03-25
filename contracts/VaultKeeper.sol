// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VaultKeeper is Ownable {
    using SafeERC20 for IERC20;

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
        uint256 totalValueLocked;
        address tokenAddress;
        bool active;
    }

    struct UserDeposit {
        uint256 amount;
        uint256 timestamp;
    }

    uint256 public vaultCount;
    uint256 public constant BASIS_POINTS = 10000;

    address public rewardToken;

    mapping(uint256 => Vault) public vaults;
    mapping(uint256 => mapping(address => UserDeposit)) public userDeposits;
    mapping(uint256 => address[]) public vaultDepositors;
    mapping(uint256 => mapping(address => uint256)) public rewardsClaimed;

    event VaultCreated(uint256 indexed vaultId, string name, RiskLevel riskLevel);
    event DepositMade(uint256 indexed vaultId, address indexed user, uint256 amount, uint256 newTVL);
    event WithdrawalMade(uint256 indexed vaultId, address indexed user, uint256 amount, uint256 newTVL);
    event APYUpdated(uint256 indexed vaultId, uint256 minAPY, uint256 maxAPY);
    event TokenAddressUpdated(uint256 indexed vaultId, address indexed oldTokenAddress, address indexed newTokenAddress);
    event VaultStatusChanged(uint256 indexed vaultId, bool active);
    event EmergencyWithdrawal(uint256 indexed vaultId, address indexed recipient, uint256 amount);
    event TVLUpdated(uint256 indexed vaultId, uint256 newTVL);

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

        uint256 vaultId = vaultCount;

        vaults[vaultId] = Vault({
            name: name,
            riskLevel: riskLevel,
            minAPY: minAPY,
            maxAPY: maxAPY,
            totalValueLocked: 0,
            tokenAddress: tokenAddress,
            active: true
        });

        vaultCount++;

        emit VaultCreated(vaultId, name, riskLevel);
    }

    function setRewardToken(address _rewardToken) external onlyOwner {
        require(_rewardToken != address(0), "Invalid token");
        rewardToken = _rewardToken;
    }

    function updateAPY(uint256 vaultId, uint256 minAPY, uint256 maxAPY) external onlyOwner {
        require(vaultId < vaultCount, "Invalid vault ID");
        require(minAPY <= maxAPY, "Min APY must be <= Max APY");

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

    function deposit(uint256 vaultId, uint256 amount) external {

        require(vaultId < vaultCount, "Invalid vault ID");
        require(vaults[vaultId].active, "Vault not active");
        require(amount > 0, "Amount must be > 0");

        address tokenAddr = vaults[vaultId].tokenAddress;
        require(tokenAddr != address(0), "Token not set");

        IERC20 token = IERC20(tokenAddr);

        token.safeTransferFrom(msg.sender, address(this), amount);

        if (userDeposits[vaultId][msg.sender].amount == 0) {
            vaultDepositors[vaultId].push(msg.sender);
        }

        userDeposits[vaultId][msg.sender].amount += amount;
        userDeposits[vaultId][msg.sender].timestamp = block.timestamp;

        vaults[vaultId].totalValueLocked += amount;

        emit DepositMade(vaultId, msg.sender, amount, vaults[vaultId].totalValueLocked);
        emit TVLUpdated(vaultId, vaults[vaultId].totalValueLocked);
    }

    function withdraw(uint256 vaultId, uint256 amount) external {

        require(vaultId < vaultCount, "Invalid vault ID");
        require(amount > 0, "Invalid amount");

        UserDeposit storage user = userDeposits[vaultId][msg.sender];
        require(user.amount >= amount, "Insufficient balance");

        IERC20 token = IERC20(vaults[vaultId].tokenAddress);

        user.amount -= amount;
        user.timestamp = block.timestamp;

        vaults[vaultId].totalValueLocked -= amount;

        token.safeTransfer(msg.sender, amount);

        emit WithdrawalMade(vaultId, msg.sender, amount, vaults[vaultId].totalValueLocked);
        emit TVLUpdated(vaultId, vaults[vaultId].totalValueLocked);
    }

    function calculateYield(uint256 vaultId, address userAddr) public view returns (uint256) {

        require(vaultId < vaultCount, "Invalid vault");

        UserDeposit memory user = userDeposits[vaultId][userAddr];
        if (user.amount == 0) return 0;

        Vault memory vault = vaults[vaultId];

        uint256 avgAPY = (vault.minAPY + vault.maxAPY) / 2;

        uint256 timeElapsed = block.timestamp - user.timestamp;

        uint256 yearlyReward = (user.amount * avgAPY) / BASIS_POINTS;

        uint256 reward = (yearlyReward * timeElapsed) / 365 days;

        return reward;
    }

    function claimRewards(uint256 vaultId) external {

        require(vaultId < vaultCount, "Invalid vault");
        require(rewardToken != address(0), "Reward token not set");

        uint256 reward = calculateYield(vaultId, msg.sender);
        require(reward > 0, "No rewards");

        userDeposits[vaultId][msg.sender].timestamp = block.timestamp;

        rewardsClaimed[vaultId][msg.sender] += reward;

        IERC20(rewardToken).safeTransfer(msg.sender, reward);
    }

    /* ========== GETTERS ========== */

    function getPendingRewards(uint256 vaultId, address user) external view returns (uint256) {
        return calculateYield(vaultId, user);
    }

    function getUserDeposit(uint256 vaultId, address user)
        external
        view
        returns (uint256 amount, uint256 timestamp)
    {
        UserDeposit memory d = userDeposits[vaultId][user];
        return (d.amount, d.timestamp);
    }

    function getUserShare(uint256 vaultId, address user) external view returns (uint256) {

        uint256 userAmount = userDeposits[vaultId][user].amount;
        uint256 tvl = vaults[vaultId].totalValueLocked;

        if (tvl == 0) return 0;

        return (userAmount * BASIS_POINTS) / tvl;
    }

    function getVaultAPY(uint256 vaultId) external view returns (uint256, uint256) {
        Vault memory v = vaults[vaultId];
        return (v.minAPY, v.maxAPY);
    }

    function getVaultTVL(uint256 vaultId) external view returns (uint256) {
        return vaults[vaultId].totalValueLocked;
    }

    function getUserVaultSummary(uint256 vaultId, address user)
        external
        view
        returns (
            uint256 deposit,
            uint256 pendingRewards,
            uint256 vaultTVL
        )
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

    function getDepositorCount(uint256 vaultId) external view returns (uint256) {
        return vaultDepositors[vaultId].length;
    }

    /* ========== EMERGENCY ========== */

    function emergencyWithdraw(uint256 vaultId, uint256 amount) external onlyOwner {

        require(vaultId < vaultCount, "Invalid vault");

        IERC20 token = IERC20(vaults[vaultId].tokenAddress);

        token.safeTransfer(owner(), amount);

        vaults[vaultId].totalValueLocked -= amount;

        emit EmergencyWithdrawal(vaultId, owner(), amount);
        emit TVLUpdated(vaultId, vaults[vaultId].totalValueLocked);
    }
}