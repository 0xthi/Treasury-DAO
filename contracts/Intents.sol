// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./MultiSig.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Intents is MultiSig {
    using SafeERC20 for IERC20;

    struct Intent {
        address user;
        address to;
        uint128 amount;
        uint32 timestamp;
        uint8 signaturesCount;
        bool executed;
    }

    uint256 public nextIntentId;
    uint256 public immutable threshold;
    uint32 public immutable timeLock;

    mapping(uint256 => Intent) public intents;
    mapping(address => uint32) public lastIntentTimestamp;
    mapping(uint256 => mapping(address => bool)) public signatures;

    error IntentAlreadyExecuted();
    error ExecutionTimeNotReached();
    error NotEnoughSignatures();
    error AlreadySigned();
    error AmountMustBeGreaterThanZero();

    event IntentCreated(uint256 indexed intentId, address indexed user, address indexed to, uint128 amount, uint32 timestamp);
    event IntentApproved(uint256 indexed intentId, address indexed owner);
    event IntentExecuted(uint256 indexed intentId, address indexed to, uint128 amount);

    constructor(
        address[] memory _owners,
        uint256 _requiredSignatures,
        uint256 _threshold,
        uint32 _timeLock
    )
        MultiSig(_owners, _requiredSignatures)
    {
        threshold = _threshold;
        timeLock = _timeLock;
        nextIntentId = 0;
    }

    function createIntent(address _to, uint128 _amount, uint32 _timestamp) external {
        if (_amount == 0) revert AmountMustBeGreaterThanZero();
        if (_timestamp <= uint32(block.timestamp)) revert ExecutionTimeNotReached();
        if (uint32(block.timestamp) < lastIntentTimestamp[msg.sender] + timeLock) revert ExecutionTimeNotReached();

        uint256 intentId = nextIntentId;
        nextIntentId++;

        intents[intentId] = Intent({
            user: msg.sender,
            to: _to,
            amount: _amount,
            timestamp: _timestamp,
            executed: false,
            signaturesCount: 0
        });
        
        lastIntentTimestamp[msg.sender] = uint32(block.timestamp);

        emit IntentCreated(intentId, msg.sender, _to, _amount, _timestamp);
    }

    function approveIntent(uint256 _intentId) external onlyOwner {
        Intent storage intent = intents[_intentId];
        if (intent.executed) revert IntentAlreadyExecuted();
        if (uint32(block.timestamp) < intent.timestamp) revert ExecutionTimeNotReached();
        if (signatures[_intentId][msg.sender]) revert AlreadySigned();
        if (intent.signaturesCount >= requiredSignatures) revert NotEnoughSignatures();

        signatures[_intentId][msg.sender] = true;
        unchecked {
            intent.signaturesCount++;
        }

        emit IntentApproved(_intentId, msg.sender);
    }

    function executeApprovedIntent(uint256 _intentId) external {
        Intent storage intent = intents[_intentId];
        if (intent.executed) revert IntentAlreadyExecuted();
        if (uint32(block.timestamp) < intent.timestamp) revert ExecutionTimeNotReached();

        uint128 amount = intent.amount;
        uint8 signaturesCount = intent.signaturesCount;

        if (signaturesCount < (amount < threshold ? 1 : requiredSignatures)) {
            revert NotEnoughSignatures();
        }

        intent.executed = true;

        // Emit event to trigger off-chain Across SDK logic
        emit IntentExecuted(_intentId, intent.to, intent.amount);
    }
}
