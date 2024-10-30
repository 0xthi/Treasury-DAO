const { ethers, run } = require("hardhat");
const fs = require("fs");

async function main() {
    // Get the signers
    const [owner1, owner2, owner3] = await ethers.getSigners();

    // Deploy USDC contract
    const USDC = await ethers.getContractFactory("USDC");
    const usdc = await USDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("USDC deployed to:", usdcAddress);

    // Deploy Permit2 contract
    const Permit2 = await ethers.getContractFactory("Permit2");
    const permit2 = await Permit2.deploy();
    await permit2.waitForDeployment();
    const permit2Address = await permit2.getAddress();
    console.log("Permit2 deployed to:", permit2Address);

    // Resolve owner addresses
    const owner1Address = await owner1.getAddress();
    const owner2Address = await owner2.getAddress();
    const owner3Address = await owner3.getAddress();

    // Deploy MultiSig contract with initial owners and a threshold
    const threshold = 100000000;
    const MultiSig = await ethers.getContractFactory("MultiSig");
    const multiSig = await MultiSig.deploy(
        [owner1Address, owner2Address, owner3Address],
        2,
        threshold
    );
    await multiSig.waitForDeployment();
    const multiSigAddress = await multiSig.getAddress();
    console.log("MultiSig deployed to:", multiSigAddress);

    // Deploy Treasury contract with USDC and Permit2 addresses
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(usdcAddress, permit2Address);
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log("Treasury deployed to:", treasuryAddress);

    // Deploy Intents contract with Treasury and MultiSig addresses
    const Intents = await ethers.getContractFactory("Intents");
    const intents = await Intents.deploy(
        [owner1Address, owner2Address, owner3Address],
        2,
        threshold
    );
    await intents.waitForDeployment();
    const intentsAddress = await intents.getAddress();
    console.log("Intents deployed to:", intentsAddress);

    // Initialize the Treasury contract with the intents contract address
    await treasury.initialize(intentsAddress);
    console.log("Treasury initialized with intents address.");

    // Write the addresses to a JSON file
    const addresses = {
        USDC: usdcAddress,
        MultiSig: multiSigAddress,
        Treasury: treasuryAddress,
        Intents: intentsAddress,
        Permit2: permit2Address
    };

    fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
    console.log("Deployed addresses written to addresses.json");

    // Verify contracts
    await run("verify:verify", {
        address: usdcAddress,
        constructorArguments: [],
    });

    await run("verify:verify", {
        address: permit2Address,
        constructorArguments: [],
    });

    await run("verify:verify", {
        address: multiSigAddress,
        constructorArguments: [
            [
                String(owner1Address),
                String(owner2Address),
                String(owner3Address)
            ],
            2, // Convert the threshold to a string
            String(threshold) // Ensure threshold is a string
        ],
    });

    await run("verify:verify", {
        address: treasuryAddress,
        constructorArguments: [
            String(usdcAddress),
            String(permit2Address),
        ],
    });

    await run("verify:verify", {
        address: intentsAddress,
        constructorArguments: [
            [
                String(owner1Address),
                String(owner2Address),
                String(owner3Address)
            ],
            2, // Convert the threshold to a string
            String(threshold) // Ensure threshold is a string
        ],
    });
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
