// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IIntents.sol";
import "./permit2/interfaces/IPermit2.sol"; // Ensure this path is correct

contract Treasury {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public intentsContract;
    IPermit2 public permit2; // Permit2 interface

    error NotAuthorized();
    error AmountMustBeGreaterThanZero();
    error InvalidTokenReceived();

    event Deposited(address indexed from, uint256 amount);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function initialize(address _intentsContract, address _permit2) external {
        intentsContract = _intentsContract;
        permit2 = IPermit2(_permit2); // Initialize Permit2
    }

    modifier onlyIntents() {
        if (msg.sender != intentsContract) revert NotAuthorized();
        _;
    }

    function deposit(uint256 _amount) external {
        if (_amount == 0) revert AmountMustBeGreaterThanZero();
        token.safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposited(msg.sender, _amount);
    }

    function depositWithPermit(
        IPermit2.PermitTransferFrom memory permit,
        IPermit2.SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external {
        // Use Permit2 to perform the transfer
        permit2.permitTransferFrom(permit, transferDetails, owner, signature);

        // Handle the deposit logic after the permit transfer
        emit Deposited(owner, transferDetails.requestedAmount);
    }

    function transfer(address to, uint256 amount) external onlyIntents {
        token.safeTransfer(to, amount);
    }

    receive() external payable {}

    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
