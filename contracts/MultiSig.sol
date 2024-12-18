// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract MultiSig {
    address public custodian;
    address[] public owners;
    mapping(address => bool) public isOwnerMapping;
    uint256 public requiredSignatures;
    uint256 public threshold;

    error NotOwner();
    error NotCustodian();
    error InsufficientOwners(uint256 required);
    error AlreadyAnOwner();
    error NotAnOwner();
    error ThresholdMustBeGreaterThanZero();

    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event RequiredSignaturesChanged(uint256 newRequiredSignatures);
    event ThresholdChanged(uint256 newThreshold);

    modifier onlyOwner() {
        if (!isOwnerMapping[msg.sender]) revert NotOwner();
        _;
    }

    modifier onlyCustodian() {
        if (msg.sender != custodian) revert NotCustodian();
        _;
    }

    constructor(address[] memory _owners, uint256 _requiredSignatures, uint256 _threshold) {
        if (_owners.length < _requiredSignatures) revert InsufficientOwners(_requiredSignatures);
        if (_threshold == 0) revert ThresholdMustBeGreaterThanZero();
        
        owners = _owners;
        requiredSignatures = _requiredSignatures;
        threshold = _threshold;
        custodian = msg.sender;

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            isOwnerMapping[owner] = true;
        }
    }

    function addOwner(address _owner) external onlyCustodian {
        if (isOwnerMapping[_owner]) revert AlreadyAnOwner();
        
        owners.push(_owner);
        isOwnerMapping[_owner] = true;
        
        emit OwnerAdded(_owner);
    }

    function removeOwner(address _owner) external onlyCustodian {
        if (!isOwnerMapping[_owner]) revert NotAnOwner();

        uint256 index = findOwnerIndex(_owner);
        uint256 lastIndex = owners.length - 1;

        if (index != lastIndex) {
            address lastOwner = owners[lastIndex];
            owners[index] = lastOwner;
        }

        owners.pop();
        delete isOwnerMapping[_owner];

        emit OwnerRemoved(_owner);
    }

    function findOwnerIndex(address _owner) internal view returns (uint256) {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                return i;
            }
        }
        revert NotAnOwner(); // If not found, revert
    }

    function changeRequiredSignatures(uint256 _newRequiredSignatures) external onlyCustodian {
        if (_newRequiredSignatures > owners.length) revert InsufficientOwners(_newRequiredSignatures);

        requiredSignatures = _newRequiredSignatures;
        emit RequiredSignaturesChanged(_newRequiredSignatures);
    }

    function renounceCustodian() external onlyCustodian {
        custodian = address(0);
    }

    function replaceCustodian(address _newCustodian) external onlyCustodian {
        custodian = _newCustodian;
    }

    // New function to return the entire owners array
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
}
