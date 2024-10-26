import React, { useState } from 'react';
import { ethers } from 'ethers';
import addresses from '../../../addresses.json'; // Adjust the path as necessary
import USDC from '../../../artifacts/contracts/USDC.sol/USDC.json'; // Adjust the path to your USDC contract ABI
import Treasury from '../../../artifacts/contracts/Treasury.sol/Treasury.json'; // Adjust the path to your Treasury contract ABI
import IPermit2 from '../../../artifacts/contracts/permit2/interfaces/IPermit2.sol/IPermit2.json'; // Adjust the path to your Permit2 interface ABI

const DepositComponent = () => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    const handleDeposit = async () => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        try {
            // Get the connected account from w3m-button
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const account = await signer.getAddress();

            // Get contract addresses from addresses.json
            const usdcAddress = addresses.USDC;
            const treasuryAddress = addresses.Treasury;
            const permit2Address = addresses.Permit2; // Ensure you have Permit2 address in addresses.json

            // Create contract instances
            const usdcContract = new ethers.Contract(usdcAddress, USDC.abi, signer);
            const treasuryContract = new ethers.Contract(treasuryAddress, Treasury.abi, signer);
            const permit2Contract = new ethers.Contract(permit2Address, IPermit2.abi, signer);

            // Get USDC decimals
            const decimals = await usdcContract.decimals();
            const depositAmount = ethers.utils.parseUnits(amount, decimals); // Convert to the correct unit

            // Get the current block timestamp from the network
            const block = await provider.getBlock('latest');
            const currentTimestamp = block.timestamp;

            // Create permit details
            const nonceBitmap = await permit2Contract.nonceBitmap(account, 0); // Get the nonce bitmap for the user
            const nonce = getNextAvailableNonce(nonceBitmap); // Implement this function to extract the next available nonce
            const permit = {
                permitted: {
                    token: usdcAddress,
                    amount: depositAmount,
                },
                nonce: nonce,
                deadline: currentTimestamp + 21600 // 1 hour from the current block timestamp
            };

            // Create the signature
            const domain = {
                name: 'Permit2',
                version: '1',
                chainId: await signer.getChainId(),
                verifyingContract: permit2Address
            };

            const types = {
                PermitTransferFrom: [
                    { name: 'permitted', type: 'TokenPermissions' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' }
                ],
                TokenPermissions: [
                    { name: 'token', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                ]
            };

            const signature = await signer._signTypedData(domain, types, permit);

            // Log the inputs for calling depositWithPermit
            console.log("Permit:", permit);
            console.log("Transfer Details:", {
                requestedAmount: depositAmount,
                to: treasuryAddress
            });
            console.log("Owner:", account);
            console.log("Signature:", signature);

            // Commented out the actual call to depositWithPermit
            // const depositTx = await treasuryContract.depositWithPermit(
            //     permit,
            //     {
            //         requestedAmount: depositAmount,
            //         to: treasuryAddress
            //     },
            //     account,
            //     signature
            // );
            // await depositTx.wait();

            setAmount(''); // Clear the input after successful deposit
            setError(''); // Clear any previous error
        } catch (err) {
            console.error(err);
            setError('Transaction failed. Please try again.');
        }
    };

    // Helper function to extract the next available nonce from the bitmap
    const getNextAvailableNonce = (bitmap) => {
        for (let i = 0; i < 256; i++) {
            if ((bitmap & (1 << i)) === 0) {
                return i;
            }
        }
        throw new Error('No available nonce');
    };

    return (
        <div>
            <h2>Deposit USDC to Treasury</h2>
            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount in USDC"
            />
            <button onClick={handleDeposit}>Deposit</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default DepositComponent;

