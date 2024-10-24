require("@nomicfoundation/hardhat-toolbox");
// require("@nomiclabs/hardhat-etherscan");

const { config: dotEnvConfig } = require("dotenv");
dotEnvConfig();

const config = {
  defaultNetwork: 'hardhat',
  networks: {
    // test networks
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
    },
    bsctest: {
      url: process.env.RPC_URL,
      accounts: [
        process.env.PRIVATE_KEY_1 || '',
        process.env.PRIVATE_KEY_2 || '',
        process.env.PRIVATE_KEY_3 || ''
      ],
    },
    sepolia: {
      url: process.env.RPC_URL,
      accounts: [
        process.env.PRIVATE_KEY_1 || '',
        process.env.PRIVATE_KEY_2 || '',
        process.env.PRIVATE_KEY_3 || ''
      ],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || '',
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true, // Add viaIR option here
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v5',
  },
  abiExporter: {
    path: './abi',
    runOnCompile: true,
    clear: false,
    flat: true,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
  },
  solpp: {
    noFlatten: true,
  },
  // mocha: {
  //   timeout: 100000,
  // },
};

module.exports = config;
