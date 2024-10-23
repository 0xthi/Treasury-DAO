// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./Treasury.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MultiSig {
    using SafeERC20 for Treasury;

    Treasury public immutable treasury; // Immutable for gas savings
    address public custodian; // Custodian address is mutable but is often changed rarely
    address[] public owners;  // Array of owners
    mapping(address => bool) public isOwnerMapping;
    mapping(address => uint256) public ownerIndex; // Stores the owner's index in the owners array
    uint256 public requiredSignatures;

    // Custom Errors
    error NotOwner();
    error NotCustodian();
    error InsufficientOwners(uint256 required);
    error AlreadyAnOwner();
    error NotAnOwner();

    // Events
    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event RequiredSignaturesChanged(uint256 newRequiredSignatures);

    modifier onlyOwner() {
        if (!isOwnerMapping[msg.sender]) revert NotOwner();
        _;
    }

    modifier onlyCustodian() {
        if (msg.sender != custodian) revert NotCustodian();
        _;
    }

    constructor(address _treasury, address[] memory _owners, uint256 _requiredSignatures) {
        if (_owners.length < _requiredSignatures) revert InsufficientOwners(_requiredSignatures);
        
        // Use immutable for treasury for gas optimization
        treasury = Treasury(payable(_treasury));
        owners = _owners;
        requiredSignatures = _requiredSignatures;
        custodian = msg.sender;

        // Use unchecked for loop to save gas when incrementing
        unchecked {
            for (uint256 i = 0; i < _owners.length; i++) {
                address owner = _owners[i];
                isOwnerMapping[owner] = true;
                ownerIndex[owner] = i; // Map owner to index
            }
        }
    }

    // Add an owner, callable only by custodian
    function addOwner(address _owner) external onlyCustodian {
        if (isOwnerMapping[_owner]) revert AlreadyAnOwner();
        
        owners.push(_owner);
        isOwnerMapping[_owner] = true;
        ownerIndex[_owner] = owners.length - 1; // Store the index directly
        
        emit OwnerAdded(_owner);
    }

    // Remove an owner, callable only by custodian
    function removeOwner(address _owner) external onlyCustodian {
        if (!isOwnerMapping[_owner]) revert NotAnOwner();

        // Get index of owner to remove
        uint256 index = ownerIndex[_owner];
        uint256 lastIndex = owners.length - 1;

        // If the owner to be removed is not the last one, swap with the last owner
        if (index != lastIndex) {
            address lastOwner = owners[lastIndex];
            owners[index] = lastOwner; // Move last owner to the current index
            ownerIndex[lastOwner] = index; // Update last owner's index
        }

        // Remove the last owner and clear the mappings
        owners.pop(); // Remove last element from owners array
        delete isOwnerMapping[_owner]; // Clear isOwner mapping
        delete ownerIndex[_owner]; // Clear ownerIndex mapping

        emit OwnerRemoved(_owner);
    }

    // Change the required signatures, callable only by custodian
    function changeRequiredSignatures(uint256 _newRequiredSignatures) external onlyCustodian {
        if (_newRequiredSignatures > owners.length) revert InsufficientOwners(_newRequiredSignatures);

        requiredSignatures = _newRequiredSignatures;
        emit RequiredSignaturesChanged(_newRequiredSignatures);
    }

    // Custodian renounces their role, setting custodian to zero address
    function renounceCustodian() external onlyCustodian {
        custodian = address(0); // Sets custodian to the zero address
    }

    // Custodian can be replaced
    function replaceCustodian(address _newCustodian) external onlyCustodian {
        custodian = _newCustodian;
    }
}
