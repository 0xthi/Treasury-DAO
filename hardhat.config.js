require("@nomicfoundation/hardhat-toolbox");
// require("@nomiclabs/hardhat-etherscan");

const { config: dotEnvConfig } = require("dotenv");
dotEnvConfig();

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 31337, // Default Hardhat chain ID
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337, // Ensure this matches the Hardhat default
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL, // Replace with your Infura project ID
      chainId: 11155111, // Sepolia chain ID
      accounts: [
        process.env.PRIVATE_KEY_1 || '',
        process.env.PRIVATE_KEY_2 || '',
        process.env.PRIVATE_KEY_3 || ''
      ],
    },
    bsctest: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/", // BSC Testnet RPC URL
      chainId: 97, // BSC Testnet chain ID
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
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
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
          viaIR: true,
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
