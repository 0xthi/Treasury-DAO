const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSig Contract", function () {
    let multiSig, treasury, owner1, owner2, owner3;

    before(async function () {
        [owner1, owner2, owner3] = await ethers.getSigners();

        // Deploy Treasury
        const Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy(ethers.constants.AddressZero); // Mock Treasury
        await treasury.deployed();

        // Deploy MultiSig
        const MultiSig = await ethers.getContractFactory("MultiSig");
        multiSig = await MultiSig.deploy(treasury.address, [owner1.address, owner2.address], 2);
        await multiSig.deployed();
    });

    it("Should add a new owner", async function () {
        await multiSig.connect(owner1).addOwner(owner3.address);
        expect(await multiSig.isOwnerMapping(owner3.address)).to.equal(true);
    });

    it("Should remove an owner", async function () {
        await multiSig.connect(owner1).removeOwner(owner3.address);
        expect(await multiSig.isOwnerMapping(owner3.address)).to.equal(false);
    });

    it("Should change required signatures", async function () {
        await multiSig.connect(owner1).changeRequiredSignatures(1);
        expect(await multiSig.requiredSignatures()).to.equal(1);
    });

    it("Should not allow non-custodian to add owner", async function () {
        await expect(multiSig.connect(owner2).addOwner(owner3.address)).to.be.revertedWith("NotCustodian");
    });
});
