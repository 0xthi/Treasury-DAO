// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IMultiSig {
    function addOwner(address _owner) external;
    function removeOwner(address _owner) external;
    function changeRequiredSignatures(uint256 _newRequiredSignatures) external;
    function renounceCustodian() external;
    function replaceCustodian(address _newCustodian) external;
}