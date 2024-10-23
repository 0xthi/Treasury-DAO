// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Treasury {
    using SafeERC20 for IERC20; // Use SafeERC20 for safe token transfers

    IERC20 public immutable token; // Mark as immutable to reduce gas on read

    // Custom Errors
    error NotAuthorized();
    error AmountMustBeGreaterThanZero();
    error InsufficientFunds(uint256 available);
    error InvalidTokenReceived();
    
    // Events
    event Deposited(address indexed from, uint256 amount);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function deposit(uint256 _amount) external {
        if (_amount == 0) revert AmountMustBeGreaterThanZero(); // Using == to save gas
        token.safeTransferFrom(msg.sender, address(this), _amount);
        emit Deposited(msg.sender, _amount);
    }

    function transfer(address to, uint256 amount) external {
        token.safeTransfer(to, amount); // Use SafeERC20's safeTransfer
    }

    receive() external payable {
        // Reject any Ether sent to the contract
        revert InvalidTokenReceived(); // Always revert with this custom error
    }

    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this)); // Minimal gas impact, no optimization needed here
    }    
}
