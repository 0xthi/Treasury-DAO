// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IIntents.sol";
import "./permit/interfaces/IPermit2.sol"; // Import the Permit2 interface
import "./permit/interfaces/ISignatureTransfer.sol"; // Import the ISignatureTransfer interface

contract Treasury {
    IERC20 public immutable token;
    IPermit2 public immutable permit2; // Reference to the Permit2 contract
    address public intentsContract;
    bool private initialized; // Track if the contract has been initialized
    bool private _reentrancyGuard; // Reentrancy guard

    error NotAuthorized();
    error AmountMustBeGreaterThanZero();
    error InvalidTokenReceived();
    error AlreadyInitialized(); // New error for re-initialization

    event Deposited(address indexed from, uint256 amount);

    // Constructor to initialize immutable variables
    constructor(address _token, address _permit2) {
        token = IERC20(_token);
        permit2 = IPermit2(_permit2);
    }

    function initialize(address _intents) external {
        if (initialized) revert AlreadyInitialized(); // Prevent re-initialization
        intentsContract = _intents; // Initialize intentsContract to a default value
        initialized = true; // Mark as initialized
    }

    modifier onlyIntents() {
        if (msg.sender != intentsContract) revert NotAuthorized();
        _;
    }

    modifier nonReentrant() {
        require(!_reentrancyGuard, "no reentrancy");
        _reentrancyGuard = true;
        _;
        _reentrancyGuard = false;
    }

    // Updated deposit function to accept permit and signature
    function deposit(
        uint256 _amount,
        IPermit2.PermitTransferFrom calldata permit, // Use PermitTransferFrom from IPermit2
        bytes calldata signature
    ) external nonReentrant {
        if (_amount == 0) revert AmountMustBeGreaterThanZero();

        // Verify the permit signature and transfer tokens using Permit2
        permit2.permitTransferFrom(
            permit,
            ISignatureTransfer.SignatureTransferDetails({ // Reference SignatureTransferDetails from ISignatureTransfer
                to: address(this),
                requestedAmount: _amount
            }),
            msg.sender,
            signature
        );

        emit Deposited(msg.sender, _amount); // Emit event with msg.sender
    }

    receive() external payable {}

    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
