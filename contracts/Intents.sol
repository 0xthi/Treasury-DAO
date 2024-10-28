// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./interfaces/ITreasury.sol";
import "./MultiSig.sol"; // Import the actual MultiSig contract
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // Import SafeERC20

contract Intents is MultiSig {
    using SafeERC20 for IERC20;

    // Custom errors for gas optimization
    error ExecutionTimeNotReached();
    error ExecutionTimeInvalid();
    error NotEnoughSignatures();
    error AmountMustBeGreaterThanZero();
    error IntentNotFound();
    error SignatureAlreadyUsed();

    struct Intent {
        address user; // User who created the intent
        address to; // Recipient address
        uint128 amount; // Amount to transfer
        uint32 nextExecutionTime; // When the next payment should occur
        uint32 recurringInterval; // Interval for recurring payments
        uint16 executionCount; // Count of how many times the intent has been executed
        uint16 signatureCount; // Count of collected signatures
        mapping(address => bool) signatures; // Track signatures for each intent
    }

    ITreasury public treasury;
    IERC20 public token; // Use standard ERC20 token
    uint256 public nextIntentId;
    uint256 public immutable threshold;

    mapping(uint256 => Intent) public intents;

    event IntentCreated(uint256 indexed intentId, address indexed user, address indexed to, uint128 amount, uint32 nextExecutionTime, uint32 recurringInterval);
    event IntentExecuted(uint256 indexed intentId, address indexed to, uint128 amount, uint256 executionCount);
    event IntentCancelled(uint256 indexed intentId);
    event IntentApproved(uint256 indexed intentId, address indexed signer, uint256 signatureCount); // New event for approval

    constructor(
        address _treasury,
        address _token, // Change to token address
        address[] memory _owners,
        uint256 _requiredSignatures,
        uint256 _threshold
    )
        MultiSig(_owners, _requiredSignatures)
    {
        treasury = ITreasury(_treasury);
        token = IERC20(_token); // Initialize the token
        threshold = _threshold;
        nextIntentId = 0;
    }

    function createIntent(address _to, uint128 _amount, uint32 _recurringInterval) external {
        if (_amount == 0) revert AmountMustBeGreaterThanZero();
        if (_recurringInterval == 0) revert ExecutionTimeInvalid(); // Ensure the interval is not zero

        uint256 intentId = nextIntentId++;
        uint32 nextExecutionTime = uint32(block.timestamp) + _recurringInterval;

        // Create a new Intent struct and set its properties individually
        Intent storage newIntent = intents[intentId];
        newIntent.user = msg.sender;
        newIntent.to = _to;
        newIntent.amount = _amount;
        newIntent.nextExecutionTime = nextExecutionTime;
        newIntent.recurringInterval = _recurringInterval;
        newIntent.executionCount = 0;
        newIntent.signatureCount = 0; // Initialize signature count

        emit IntentCreated(intentId, msg.sender, _to, _amount, nextExecutionTime, _recurringInterval);
    }

    function approveIntent(uint256 _intentId) external {
        Intent storage intent = intents[_intentId];
        if (intent.user == address(0)) revert IntentNotFound(); // Ensure the intent exists

        // Check if the sender has already signed
        if (intent.signatures[msg.sender]) revert SignatureAlreadyUsed();

        // Check if the required number of signatures have been collected
        if (intent.signatureCount >= requiredSignatures) {
            // Interaction: Execute the intent if enough signatures are collected
            executeIntent(_intentId);
        }
        
        // Effects: Mark the signature as used and increment the signature count
        intent.signatures[msg.sender] = true;
        intent.signatureCount++; // Increment the signature count

        // Emit the approval event
        emit IntentApproved(_intentId, msg.sender, intent.signatureCount);        
    }

    function executeIntent(uint256 _intentId) internal {
        Intent storage intent = intents[_intentId];

        // Check: Ensure the execution time has been reached
        if (intent.nextExecutionTime > uint32(block.timestamp)) revert ExecutionTimeNotReached();

        // Effects: Update the execution count
        intent.executionCount++;

        // Interaction: Transfer the amount to the intended recipient
        token.safeTransferFrom(intent.user, address(treasury), intent.amount);

        emit IntentExecuted(_intentId, intent.to, intent.amount, intent.executionCount);

        // Update the next execution time for the intent
        intent.nextExecutionTime += intent.recurringInterval; // Set the next execution time
    }

    function cancelIntent(uint256 _intentId) external onlyOwner {
        delete intents[_intentId]; // Remove the intent

        emit IntentCancelled(_intentId);
    }
}
