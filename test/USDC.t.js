const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("USDC Contract", function () {
    let usdc, owner, minter, addr1;

    before(async function () {
        [owner, minter, addr1] = await ethers.getSigners();

        // Deploy USDC
        const USDC = await ethers.getContractFactory("USDC");
        usdc = await USDC.deploy();
        await usdc.deployed();
    });

    it("Should mint tokens to an address", async function () {
        await usdc.grantRole(await usdc.MINTER_ROLE(), minter.address);
        await usdc.connect(minter).mint(addr1.address, 1000);
        expect(await usdc.balanceOf(addr1.address)).to.equal(1000);
    });

    it("Should not mint without MINTER_ROLE", async function () {
        await expect(usdc.connect(addr1).mint(addr1.address, 1000)).to.be.revertedWith("AccessControl: account");
    });

    it("Should have correct decimals", async function () {
        expect(await usdc.decimals()).to.equal(6);
    });
});
