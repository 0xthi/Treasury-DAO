// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./MultiSig.sol"; // Import the MultiSig contract

contract Intents is MultiSig, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32; // Use OpenZeppelin's ECDSA library

    // Custom errors
    error ExecutionTimeNotReached();
    error NotEnoughSignatures();
    error InvalidSignature();
    error AmountMustBeGreaterThanZero();
    error RecurringIntervalMustBeGreaterThanZero();
    error InsufficientSignaturesForAmount();
    error IntentNotApproved();
    error IntentAlreadyCancelled();
    error AlreadySigned(address signer);

    struct Intent {
        address user; // User who created the intent
        address to;   // Recipient address
        uint128 amount; // Amount to transfer
        uint32 nextExecutionTime; // When the next payment should occur
        uint32 recurringInterval; // Interval for recurring payments
        uint16 executionCount; // Count of how many times the intent has been executed
        bool approved; // Whether the intent is approved for execution
        bool cancelled; // Whether the intent has been cancelled
    }

    mapping(uint256 => Intent) public intents;
    uint256 public nextIntentId;

    event IntentCreated(uint256 indexed intentId, address indexed user, address indexed to, uint128 amount, uint32 nextExecutionTime, uint32 recurringInterval);
    event IntentApproved(uint256 indexed intentId);
    event IntentExecuted(uint256 indexed intentId, address indexed to, uint128 amount, uint256 executionCount);
    event IntentCancelled(uint256 indexed intentId);

    // Define the EIP712 domain name and version
    string private constant DOMAIN_NAME = "IntentsContract";
    string private constant DOMAIN_VERSION = "1";

    constructor(address[] memory _owners, uint256 _requiredSignatures, uint256 _threshold) 
        MultiSig(_owners, _requiredSignatures, _threshold) // Pass the threshold
        EIP712(DOMAIN_NAME, DOMAIN_VERSION) {}

    function createIntent(address _to, uint128 _amount, uint32 _recurringInterval) external onlyOwner {
        if (_amount <= 0) revert AmountMustBeGreaterThanZero();
        if (_recurringInterval <= 0) revert RecurringIntervalMustBeGreaterThanZero();

        uint256 intentId = nextIntentId++;
        uint32 nextExecutionTime = uint32(block.timestamp) + _recurringInterval;

        intents[intentId] = Intent({
            user: msg.sender,
            to: _to,
            amount: _amount,
            nextExecutionTime: nextExecutionTime,
            recurringInterval: _recurringInterval,
            executionCount: 0,
            approved: false,
            cancelled: false
        });

        emit IntentCreated(intentId, msg.sender, _to, _amount, nextExecutionTime, _recurringInterval);
    }

    function approveIntent(uint256 _intentId, bytes[] calldata _signatures) external {
        Intent storage intent = intents[_intentId];
        if (intent.approved || intent.cancelled) revert IntentAlreadyCancelled();

        // Determine required signatures based on the amount
        uint256 required = intent.amount > threshold ? requiredSignatures : 1;

        // Verify signatures
        if (_signatures.length < required) revert NotEnoughSignatures();

        uint256 validSignatures = 0;
        address[] memory signers = new address[](_signatures.length); // Local array to track signers

        for (uint256 i = 0; i < _signatures.length; i++) {
            address signer = recoverSigner(intent.to, intent.amount, _signatures[i]);
            if (isOwnerMapping[signer]) {
                // Check for duplicates
                bool alreadySigned = false;
                for (uint256 j = 0; j < validSignatures; j++) {
                    if (signers[j] == signer) {
                        alreadySigned = true;
                        break;
                    }
                }
                if (alreadySigned) {
                    revert AlreadySigned(signer); // Revert if the signer has already signed
                }
                signers[validSignatures] = signer; // Store the signer
                validSignatures++;
            }
        }   

        if (validSignatures < required) revert InsufficientSignaturesForAmount();

        intent.approved = true;
        emit IntentApproved(_intentId);
    }

    function executeIntent(uint256 _intentId) external {
        Intent storage intent = intents[_intentId];
        if (!intent.approved || intent.cancelled) revert IntentNotApproved();
        if (intent.nextExecutionTime > block.timestamp) revert ExecutionTimeNotReached();

        // Transfer the amount to the intended recipient
        IERC20(address(this)).safeTransfer(intent.to, intent.amount);

        // Increment the execution count
        intent.executionCount++;

        emit IntentExecuted(_intentId, intent.to, intent.amount, intent.executionCount);

        // Update the next execution time for the intent
        intent.nextExecutionTime += intent.recurringInterval; // Set the next execution time
    }

    function cancelIntent(uint256 _intentId, bytes[] calldata _signatures) external {
        Intent storage intent = intents[_intentId];
        if (intent.cancelled) revert IntentAlreadyCancelled();

        // Determine required signatures based on the amount
        uint256 required = intent.amount > threshold ? requiredSignatures : 1;

        // Verify signatures
        if (_signatures.length < required) revert NotEnoughSignatures();

        uint256 validSignatures = 0;
        address[] memory signers = new address[](_signatures.length); // Local array to track signers

        for (uint256 i = 0; i < _signatures.length; i++) {
            address signer = recoverSigner(intent.to, intent.amount, _signatures[i]);
            if (isOwnerMapping[signer]) {
                // Check for duplicates
                bool alreadySigned = false;
                for (uint256 j = 0; j < validSignatures; j++) {
                    if (signers[j] == signer) {
                        alreadySigned = true;
                        break;
                    }
                }
                if (alreadySigned) {
                    revert AlreadySigned(signer); // Revert if the signer has already signed
                }
                signers[validSignatures] = signer; // Store the signer
                validSignatures++;
            }
        }   

        if (validSignatures < required) revert InsufficientSignaturesForAmount();

        intent.cancelled = true;
        emit IntentCancelled(_intentId);
    }

    function recoverSigner(address to, uint128 amount, bytes memory signature) internal view returns (address) {
        // Create the message hash using EIP712
        bytes32 structHash = keccak256(abi.encode(
            keccak256("Intent(address to,uint128 amount)"),
            to,
            amount
        ));
        bytes32 digest = _hashTypedDataV4(structHash); // Use EIP712 to hash the typed data
        address signer = digest.recover(signature); // Recover the signer from the signature
        if (signer == address(0)) revert InvalidSignature();
        return signer;
    }
}