// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface ITreasury {
    function deposit(uint256 _amount) external;
    function transfer(address to, uint256 amount) external;
    function getBalance() external view returns (uint256);
}

