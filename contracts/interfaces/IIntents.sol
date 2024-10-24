 // SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IIntents {
    function createIntent(address _to, uint128 _amount, uint32 _timestamp) external;
    function approveIntent(uint256 _intentId) external;
    function executeApprovedIntent(uint256 _intentId) external;
}