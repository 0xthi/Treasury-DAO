# TREASURY DAO
Multisig treasury with uniswap/permit2 integrated and signature based owner signing. Anybody can create intents. If owner signs and approves the intent, it will be added to chainlink keeper which executes the intents on the mentioned recurring interval

## Steps to clone and run frontend local
1. Clone the repo and run `cd frontend` along with `npm install` to install all frontend packages.
2. `npm run build` to build and start the server with `npm run dev`.

## Steps to clone and run smart contract
1. Clone the repo and run `npm install` to install all required dependencies
2. Complie contracts with `npx hardhat compile`
3. Test contracts with `npx hardhat test`
4. To depoly contracts and verify(included in script) run `npx hardhat run scripts/deploy.js --network bsctest`

Note : Set .env referring example.env

### Screenshot project
![Treasury DAO](https://github.com/user-attachments/assets/6dd22a61-19af-44b0-b990-5cc29aeae900)
