// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./interfaces/ITreasury.sol";
import "./MultiSig.sol"; // Import the actual MultiSig contract
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol"; // Import ECDSA
import "./permit2/interfaces/IPermit2.sol"; // Import the Permit2 interface

contract Intents is MultiSig {
    using SafeERC20 for IERC20;

    struct Intent {
        address user;
        address to;
        uint128 amount;
        uint32 nextExecutionTime; // When the next payment should occur
        uint32 recurringInterval; // Interval for recurring payments
        uint16 executionCount; // Count of how many times the intent has been executed
    }

    ITreasury public treasury;
    IPermit2 public permit2; // Permit2 interface
    uint256 public nextIntentId;
    uint256 public immutable threshold;

    mapping(uint256 => Intent) public intents;

    error ExecutionTimeNotReached();
    error ExecutionTimeInvalid();
    error NotEnoughSignatures();
    error AmountMustBeGreaterThanZero();
    error IntentNotFound();

    event IntentCreated(uint256 indexed intentId, address indexed user, address indexed to, uint128 amount, uint32 nextExecutionTime, uint32 recurringInterval);
    event IntentExecuted(uint256 indexed intentId, address indexed to, uint128 amount, uint256 executionCount);
    event IntentCancelled(uint256 indexed intentId);

    constructor(
        address _treasury,
        address _permit2,
        address[] memory _owners,
        uint256 _requiredSignatures,
        uint256 _threshold
    )
        MultiSig(_owners, _requiredSignatures)
    {
        treasury = ITreasury(_treasury);
        permit2 = IPermit2(_permit2); // Initialize Permit2
        threshold = _threshold;
        nextIntentId = 0;
    }

    function createIntent(address _to, uint128 _amount, uint32 _recurringInterval) external {
        if (_amount == 0) revert AmountMustBeGreaterThanZero();
        if (_recurringInterval == 0) revert ExecutionTimeInvalid(); // Ensure the interval is not zero

        uint256 intentId = nextIntentId;
        nextIntentId++;

        // Calculate nextExecutionTime based on the current block timestamp and the recurring interval
        uint32 nextExecutionTime = uint32(block.timestamp) + _recurringInterval;

        intents[intentId] = Intent({
            user: msg.sender,
            to: _to,
            amount: _amount,
            nextExecutionTime: nextExecutionTime,
            recurringInterval: _recurringInterval,
            executionCount: 0
        });

        emit IntentCreated(intentId, msg.sender, _to, _amount, nextExecutionTime, _recurringInterval);
    }

    function executeApprovedIntent(
        uint256 _intentId,
        IPermit2.PermitTransferFrom memory permit,
        IPermit2.SignatureTransferDetails calldata transferDetails,
        bytes[] calldata _signatures // Collect signatures from owners
    ) external {
        Intent storage intent = intents[_intentId];
        if (intent.nextExecutionTime > uint32(block.timestamp)) revert ExecutionTimeNotReached();

        // Check if the required number of signatures have been collected
        uint256 signatureCount = 0;
        for (uint256 i = 0; i < _signatures.length; i++) {
            bytes memory signature = _signatures[i];

            // Verify the signature
            bytes32 messageHash = keccak256(abi.encodePacked(_intentId, intent.to, intent.amount));
            bytes32 ethSignedMessageHash = toEthSignedMessageHash(messageHash); // Use the custom function
            address recoveredAddress = recoverSigner(ethSignedMessageHash, signature);
            
            if (isOwnerMapping[recoveredAddress]) {
                signatureCount++;
            }
        }

        // Determine required signatures based on the amount
        if (intent.amount > threshold) {
            if (signatureCount < requiredSignatures) revert NotEnoughSignatures();
        } else {
            if (signatureCount < 1) revert NotEnoughSignatures(); // At least one signature is required
        }

        // Use Permit2 to verify the permit
        permit2.permitTransferFrom(permit, transferDetails, msg.sender, _signatures[0]); // Assuming the first signature is used for Permit2

        // Transfer the amount to the intended recipient
        treasury.transfer(intent.to, intent.amount);

        // Increment the execution count
        intent.executionCount++;

        emit IntentExecuted(_intentId, intent.to, intent.amount, intent.executionCount);

        // Update the next execution time for the intent
        intent.nextExecutionTime += intent.recurringInterval; // Set the next execution time
    }

    function cancelIntent(uint256 _intentId) external onlyOwner {
        delete intents[_intentId]; // Remove the intent

        emit IntentCancelled(_intentId);
    }

    // Helper function to recover the signer from a message hash and signature
    function recoverSigner(bytes32 messageHash, bytes memory signature) internal pure returns (address) {
        return ECDSA.recover(messageHash, signature);
    }

    // Custom function to convert a message hash to an Ethereum signed message hash
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}
