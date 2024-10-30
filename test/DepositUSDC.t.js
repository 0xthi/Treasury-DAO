const { expect } = require("chai");
const { ethers } = require("hardhat");
const { SignatureTransfer } = require("@uniswap/permit2-sdk"); // Import Permit2 SDK

describe("Custodian Deployment and User Deposit", function () {
    let owner1, owner2, owner3, custodian, user;
    let usdc, permit2, multiSig, treasury, intents;

    before(async () => {
        // Get the signers
        [custodian, user, owner1, owner2, owner3] = await ethers.getSigners();

        // Log account addresses
        // console.log("Custodian Address:", custodian.address);
        // console.log("User Address:", user.address);
        // console.log("Owner1 Address:", owner1.address);
        // console.log("Owner2 Address:", owner2.address);
        // console.log("Owner3 Address:", owner3.address);

        // Deploy USDC contract
        const USDC = await ethers.getContractFactory("USDC");
        usdc = await USDC.deploy();
        await usdc.waitForDeployment();
        // console.log("USDC Address:", await usdc.getAddress());

        // Deploy Permit2 contract
        const Permit2 = await ethers.getContractFactory("Permit2");
        permit2 = await Permit2.deploy();
        await permit2.waitForDeployment();
        // console.log("Permit2 Address:", await permit2.getAddress());

        // Deploy MultiSig contract with owner1, owner2, and owner3
        const MultiSig = await ethers.getContractFactory("MultiSig");
        multiSig = await MultiSig.deploy(
            [await owner1.getAddress(), await owner2.getAddress(), await owner3.getAddress()],
            2,
            100000000
        );
        await multiSig.waitForDeployment();
        // console.log("MultiSig Address:", await multiSig.getAddress());

        // Deploy Treasury contract
        const Treasury = await ethers.getContractFactory("Treasury");
        treasury = await Treasury.deploy(await usdc.getAddress(), await permit2.getAddress());
        await treasury.waitForDeployment();
        // console.log("Treasury Address:", await treasury.getAddress());

        // Deploy Intents contract
        const Intents = await ethers.getContractFactory("Intents");
        intents = await Intents.deploy(
            [await owner1.getAddress(), await owner2.getAddress(), await owner3.getAddress()],
            2,
            100000000
        );
        await intents.waitForDeployment();
        // console.log("Intents Address:", await intents.getAddress());

        // Initialize the Treasury contract with the intents contract address
        await treasury.initialize(await intents.getAddress());

        const mintAmount = ethers.parseUnits("10000", 6); // Assuming USDC has 6 decimals
        await usdc.connect(custodian).mint(await user.getAddress(), mintAmount); // Mint tokens to user
    });

    it("Custodian should mint 10,000 USDC to the user", async () => {
        const mintAmount = ethers.parseUnits("10000", 6);
        const userBalance = await usdc.balanceOf(await user.getAddress());
        expect(userBalance).to.equal(mintAmount);
    });

    it("User should deposit to the Treasury using Permit2", async () => {
        const depositAmount = ethers.parseUnits("100", 6); // Amount to deposit

        // Set infinite approval for the Permit2 contract
        const permit2Address = await permit2.getAddress();
        // console.log("Permit2 Address for Approval:", permit2Address);
        await usdc.connect(user).approve(permit2Address, ethers.MaxUint256); // Infinite approval

        // Create permit details
        const usdcAddress = await usdc.getAddress();
        const treasuryAddress = await treasury.getAddress();
        // console.log("USDC Address for Permit:", usdcAddress);
        // console.log("Treasury Address for Permit:", treasuryAddress);

        const permit = {
            permitted: {
                token: usdcAddress,
                amount: depositAmount,
            },
            spender: treasuryAddress,
            nonce: 0, // Fetch the correct nonce from the Permit2 contract
            deadline: Math.floor(Date.now() / 1000) + 86400 // 1 day from now
        };

        // Get the domain and types for signing
        const { domain, types, values } = SignatureTransfer.getPermitData(permit, permit2Address, 31337); // Use the correct chainId

        // Use the signer to sign the permit
        const signature = await user.signTypedData(domain, types, values);

        // Call the deposit function in the Treasury contract
        const depositTx = await treasury.connect(user).deposit(depositAmount, permit, signature);
        console.log("Deposit Transaction:", depositTx.hash);

        // Check the Treasury balance
        const treasuryBalance = await usdc.balanceOf(treasuryAddress);
        expect(treasuryBalance).to.equal(depositAmount);
    });

    it("User should create an intent and execute it", async () => {
        const intentAmount = ethers.parseUnits("50", 6); // Amount for the intent
        const recipient = await owner1.getAddress(); // Recipient address

        // User creates an intent
        await intents.connect(user).createIntent(recipient, intentAmount, 86400); // 1 day interval

        // User approves the Intents contract to spend their USDC
        await usdc.connect(user).approve(intents.address, intentAmount);

        // Simulate signatures for approval
        const signatures = [];
        const owners = [owner1, owner2, owner3];
        for (const owner of owners) {
            const signature = await owner.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ["address", "uint128"],
                    [recipient, intentAmount]
                )
            )));
            signatures.push(signature);
        }

        // Execute the intent with the required signatures
        await intents.connect(user).approveIntent(0, signatures); // Assuming this is the first intent created
        await intents.connect(user).executeIntent(0); // Execute the intent

        // Check the recipient's balance
        const recipientBalance = await usdc.balanceOf(recipient);
        expect(recipientBalance).to.equal(intentAmount);
    });

    it("User should not be able to execute intent without allowance", async () => {
        const intentAmount = ethers.parseUnits("50", 6); // Amount for the intent
        const recipient = await owner1.getAddress(); // Recipient address

        // User creates an intent
        await intents.connect(user).createIntent(recipient, intentAmount, 86400); // 1 day interval

        // Simulate signatures for approval
        const signatures = [];
        const owners = [owner1, owner2, owner3];
        for (const owner of owners) {
            const signature = await owner.signMessage(ethers.utils.arrayify(ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ["address", "uint128"],
                    [recipient, intentAmount]
                )
            )));
            signatures.push(signature);
        }

        // User approves the Intents contract to spend their USDC
        await usdc.connect(user).approve(intents.address, intentAmount);

        // Attempt to execute the intent without the required signatures
        await expect(intents.connect(user).executeIntent(1)).to.be.revertedWith("Not enough signatures");
    });
});
