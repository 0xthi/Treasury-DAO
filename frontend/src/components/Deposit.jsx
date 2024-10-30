import React, { useState } from 'react';
import { ethers } from 'ethers';
import addresses from '../../../addresses.json'; // Adjust the path as necessary
import USDC from '../../../artifacts/contracts/USDC.sol/USDC.json'; // Adjust the path to your USDC contract ABI
import Treasury from '../../../artifacts/contracts/Treasury.sol/Treasury.json'; // Adjust the path to your Treasury contract ABI
import Permit2 from '../../../artifacts/contracts/permit/Permit2.sol/Permit2.json'; // Adjust the path to your Permit2 contract ABI
import { SignatureTransfer } from '@uniswap/permit2-sdk'; // Import the SignatureTransfer from Permit2 SDK
import { constants } from 'ethers';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card.tsx"; // Import Card components
import { Button } from "./ui/button.tsx"; // Import Button from Shadcn UI
import { useToast } from "../hooks/use-toast.ts"; // Import useToast

const DepositComponent = () => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const { toast } = useToast(); // Initialize toast

    const handleDeposit = async () => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        try {
            // Get the connected account from w3m-button
            const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
            const signer = provider.getSigner();
            const account = await signer.getAddress();

            // Get the connected chain ID
            const chainId = await provider.getNetwork().then(network => network.chainId);

            // Get contract addresses from addresses.json
            const usdcAddress = addresses.USDC;
            const treasuryAddress = addresses.Treasury;
            const permit2Address = addresses.Permit2; // Add Permit2 address

            const usdcContract = new ethers.Contract(usdcAddress, USDC.abi, signer);
            const treasuryContract = new ethers.Contract(treasuryAddress, Treasury.abi, signer);

            const decimals = await usdcContract.decimals();
            const depositAmount = ethers.utils.parseUnits(amount, decimals);
            
            // Check current allowance
            const currentAllowance = await usdcContract.allowance(account, permit2Address);
            if (currentAllowance.lt(depositAmount)) {
                const approveTx = await usdcContract.approve(permit2Address, constants.MaxUint256);
                await approveTx.wait();
            }

            // Fetch the nonce from the nonceBitmap
            const nonce = await getNonce(account, permit2Address, signer);

            // Create permit details
            const permit = {
                permitted: {
                    token: usdcAddress,
                    amount: depositAmount,
                },
                spender: treasuryAddress,
                nonce: nonce,
                deadline: Math.floor(Date.now() / 1000) + 86400
            };

            const { domain, types, values } = SignatureTransfer.getPermitData(permit, permit2Address, chainId);
            const signature = await signer._signTypedData(domain, types, values);

            // Call the deposit function in the Treasury contract
            const depositTx = await treasuryContract.deposit(depositAmount, permit, signature);
            const receipt = await depositTx.wait();

            console.log("Transaction Hash:", receipt.transactionHash);
            toast({ title: "Transaction Successful", description: `Transaction Hash: ${receipt.transactionHash}`, status: "success" });

            setAmount('');
            setError('');
        } catch (err) {
            console.error(err);
            setError('Transaction failed. Please try again.');
            toast({ title: "Transaction Failed", description: "Please try again.", status: "error" });
        }
    };

    // Function to get nonce from the SignatureTransfer contract
    const getNonce = async (account, permit2Address, signer) => {
        const permit2Contract = new ethers.Contract(permit2Address, Permit2.abi, signer);
        const nonceBitmap = await permit2Contract.nonceBitmap(account, 0); // Fetch the first word of the nonceBitmap
        let nonce = 0;      

        // Calculate the nonce based on the nonceBitmap
        while (nonce < 256) {
            const bit = (nonceBitmap >> nonce) & 1;
            if (bit === 0) {
                return nonce; // Return the first unused nonce
            }
            nonce++;
        }

        throw new Error("All nonces are used.");
    };

    return (
        <Card className="p-4">
            <CardHeader>
                <CardTitle>Deposit USDC to Treasury</CardTitle>
            </CardHeader>
            <CardContent>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount in USDC"
                    className="border rounded-md p-2 mb-2 w-full"
                />
                <Button onClick={handleDeposit} className="w-full">Deposit</Button>
                {error && <p className="text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
};

export default DepositComponent;
