import React, { useState } from 'react';
import { ethers } from 'ethers';
import addresses from '../../../addresses.json'; // Adjust the path as necessary
import USDC from '../../../artifacts/contracts/USDC.sol/USDC.json'; // Adjust the path to your USDC contract ABI
import Treasury from '../../../artifacts/contracts/Treasury.sol/Treasury.json'; // Adjust the path to your Treasury contract ABI
import { Permit2 } from '@uniswap/permit2-sdk'; // Import Permit2 SDK

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

            // Create contract instances
            const usdcContract = new ethers.Contract(usdcAddress, USDC.abi, signer);
            const treasuryContract = new ethers.Contract(treasuryAddress, Treasury.abi, signer);

            // Get USDC decimals
            const decimals = await usdcContract.decimals();
            const depositAmount = ethers.utils.parseUnits(amount, decimals); // Convert to the correct unit

            // Create permit details using Permit2 SDK
            const permit2 = new Permit2(signer);
            const permit = await permit2.buildPermit({
                token: usdcAddress,
                amount: depositAmount,
                recipient: treasuryAddress,
                deadline: Math.floor(Date.now() / 1000) + 21600 // 6 hours from now
            });

            // Send the transaction using Permit2 SDK
            const tx = await permit2.permit(permit);
            await tx.wait(); // Wait for the transaction to be mined

            setAmount(''); // Clear the input after successful deposit
            setError(''); // Clear any previous error
        } catch (err) {
            console.error(err);
            setError('Transaction failed. Please try again.');
        }
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
