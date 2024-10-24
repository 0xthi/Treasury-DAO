// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    address public owner;

    constructor() ERC20("USD Coin", "USDC") {
        // Set the deployer as the owner
        owner = msg.sender;
    }

    // Modifier to restrict access to the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    // Override the decimals function to return 6
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    // Mint function that can only be called by the owner
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
