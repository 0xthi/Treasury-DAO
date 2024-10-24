// scripts/deploy.js
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    // Get the signers
    const [owner1, owner2, owner3] = await ethers.getSigners(); // Get three owners

    // Deploy Permit2 contract (if needed)
    const Permit2 = await ethers.getContractFactory("Permit2"); // Replace with actual Permit2 contract name
    const permit2 = await Permit2.deploy();
    await permit2.waitForDeployment();
    const permit2Address = await permit2.getAddress();
    console.log("Permit2 deployed to:", permit2Address);

    // Deploy USDC contract
    const USDC = await ethers.getContractFactory("USDC");
    const usdc = await USDC.deploy(); // Pass the permit2 address
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("USDC deployed to:", usdcAddress);

    // Deploy MultiSig contract with initial owners
    const MultiSig = await ethers.getContractFactory("MultiSig");
    const multiSig = await MultiSig.deploy([owner1.getAddress(), owner2.getAddress(), owner3.getAddress()], 2); // 2 required signatures
    await multiSig.waitForDeployment();
    const multiSigAddress = await multiSig.getAddress();
    console.log("MultiSig deployed to:", multiSigAddress);

    // Deploy Treasury contract with USDC address
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(usdcAddress); // Only pass the token address
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log("Treasury deployed to:", treasuryAddress);

    // Deploy Intents contract with Treasury and MultiSig addresses
    const Intents = await ethers.getContractFactory("Intents");
    const intents = await Intents.deploy(treasuryAddress, permit2Address, [owner1.getAddress(), owner2.getAddress(), owner3.getAddress()], 2, 1000000000); // 1000000000 represents 1000 USDC
    await intents.waitForDeployment();
    const intentsAddress = await intents.getAddress();
    console.log("Intents deployed to:", intentsAddress);

    // Initialize the Treasury contract with the intents contract address and permit2 address
    await treasury.initialize(intentsAddress, permit2Address);
    console.log("Treasury initialized with intents and permit2 addresses.");

    // Write the addresses to a JSON file
    const addresses = {
        Permit2: permit2Address,
        USDC: usdcAddress,
        MultiSig: multiSigAddress,
        Treasury: treasuryAddress,
        Intents: intentsAddress
    };

    fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
    console.log("Deployed addresses written to addresses.json");
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
