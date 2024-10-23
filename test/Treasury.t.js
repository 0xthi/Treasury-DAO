const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Treasury Contract", function () {
    let treasury, usdc, owner, addr1;

    before(async function () {
        [owner, addr1] = await ethers.getSigners();

        // Deploy USDC token
        const USDC = await ethers.getContractFactory("USDC");
        usdc = await USDC.deploy();
        await usdc.deployed();

        // Deploy Treasury
        const Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy(usdc.address);
        await treasury.deployed();
    });

    it("Should deposit tokens into the treasury", async function () {
        await usdc.mint(owner.address, 10000);
        await usdc.approve(treasury.address, 1000);

        await expect(treasury.deposit(1000)).to.emit(treasury, "Deposited");
        expect(await usdc.balanceOf(treasury.address)).to.equal(1000);
    });

    it("Should transfer tokens from the treasury", async function () {
        await expect(treasury.transfer(addr1.address, 500)).to.changeTokenBalance(usdc, addr1, 500);
    });
});
