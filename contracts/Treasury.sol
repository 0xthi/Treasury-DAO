// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IIntents.sol";

contract Treasury {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public intentsContract;

    error NotAuthorized();
    error AmountMustBeGreaterThanZero();
    error InvalidTokenReceived();

    event Deposited(address indexed from, uint256 amount);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function initialize(address _intentsContract) external {
        intentsContract = _intentsContract;
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

    function transfer(address to, uint256 amount) external onlyIntents {
        token.safeTransfer(to, amount);
    }

    receive() external payable {}

    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
