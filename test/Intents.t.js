const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Intents Contract", function () {
    let intents, multiSig, treasury, usdc, owner1, owner2, owner3, user, addr1;

    before(async function () {
        [owner1, owner2, owner3, user, addr1] = await ethers.getSigners();

        // Deploy USDC token
        const USDC = await ethers.getContractFactory("USDC");
        usdc = await USDC.deploy();
        await usdc.deployed();

        // Deploy Treasury
        const Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy(usdc.address);
        await treasury.deployed();

        // Deploy MultiSig
        const MultiSig = await ethers.getContractFactory("MultiSig");
        multiSig = await MultiSig.deploy(treasury.address, [owner1.address, owner2.address], 2);
        await multiSig.deployed();

        // Deploy Intents
        const Intents = await ethers.getContractFactory("Intents");
        intents = await Intents.deploy([owner1.address, owner2.address], 2, 1000, 3600);
        await intents.deployed();
    });

    describe("Intent creation", function () {
        it("Should create an intent", async function () {
            await expect(intents.connect(user).createIntent(addr1.address, 1000, (await ethers.provider.getBlock("latest")).timestamp + 3600))
                .to.emit(intents, "IntentCreated");
        });

        it("Should not create intent with 0 amount", async function () {
            await expect(intents.connect(user).createIntent(addr1.address, 0, (await ethers.provider.getBlock("latest")).timestamp + 3600))
                .to.be.revertedWith("AmountMustBeGreaterThanZero");
        });

        it("Should not create an intent if timestamp is in the past", async function () {
            await expect(intents.connect(user).createIntent(addr1.address, 1000, (await ethers.provider.getBlock("latest")).timestamp - 3600))
                .to.be.revertedWith("ExecutionTimeNotReached");
        });
    });

    describe("Intent approval and execution", function () {
        it("Should approve an intent", async function () {
            await intents.connect(user).createIntent(addr1.address, 1000, (await ethers.provider.getBlock("latest")).timestamp + 3600);
            await expect(intents.connect(owner1).approveIntent(0)).to.emit(intents, "IntentApproved");
        });

        it("Should not approve an already signed intent", async function () {
            await expect(intents.connect(owner1).approveIntent(0)).to.be.revertedWith("AlreadySigned");
        });

        it("Should execute an approved intent", async function () {
            await intents.connect(owner2).approveIntent(0);
            await expect(intents.executeApprovedIntent(0)).to.emit(intents, "IntentExecuted");
        });
    });
});
