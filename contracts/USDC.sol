// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract USDC is ERC20Permit, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("USD Coin", "USDC") ERC20Permit("USD Coin") {
        // Assign the deployer as the default admin
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Override the decimals function to return 6
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    // Mint function that can only be called by an address with the MINTER_ROLE
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
