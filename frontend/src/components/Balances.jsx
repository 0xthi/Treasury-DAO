import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import addresses from '../../../addresses.json'; // Adjust the path as necessary
import USDC from '../../../artifacts/contracts/USDC.sol/USDC.json'; // Adjust the path to your USDC contract ABI
import Treasury from '../../../artifacts/contracts/Treasury.sol/Treasury.json'; // Adjust the path to your Treasury contract ABI
import { Card, CardContent, Typography, CircularProgress, Box } from '@mui/material';

const BalancesComponent = () => {
    const [usdcBalance, setUsdcBalance] = useState('0');
    const [treasuryBalance, setTreasuryBalance] = useState('0');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true); // State for loading

    useEffect(() => {
        const fetchBalances = async () => {
            setLoading(true); // Set loading to true before fetching
            try {
                // Connect to Ethereum provider
                const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                const signer = provider.getSigner();
                const account = await signer.getAddress();

                // Get contract addresses from addresses.json
                const usdcAddress = addresses.USDC;
                const treasuryAddress = addresses.Treasury;

                // Create contract instances
                const usdcContract = new ethers.Contract(usdcAddress, USDC.abi, signer);
                const treasuryContract = new ethers.Contract(treasuryAddress, Treasury.abi, signer);

                // Fetch USDC balance of the connected address
                const balance = await usdcContract.balanceOf(account);
                setUsdcBalance(ethers.utils.formatUnits(balance, 6)); // USDC has 6 decimals

                // Fetch Treasury contract balance
                const treasuryBal = await treasuryContract.getBalance();
                setTreasuryBalance(ethers.utils.formatUnits(treasuryBal, 6)); // Assuming Treasury balance is in USDC
            } catch (err) {
                console.error(err);
                setError('Failed to fetch balances. Please try again.');
            } finally {
                setLoading(false); // Set loading to false after fetching
            }
        };

        fetchBalances();
    }, []);

    return (
        <div className="p-4">
            <Card>
                <CardContent>
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                        <Typography variant="h5" component="h2" gutterBottom>
                            Balances
                        </Typography>
                        {loading ? (
                            <CircularProgress /> // Show loading spinner while fetching
                        ) : (
                            <Box display="flex" flexDirection="column" alignItems="center">
                                {error && <Typography color="error">{error}</Typography>}
                                <div className="mb-2">
                                    <Typography variant="body1" fontWeight="bold" align="center">
                                        Your USDC Balance:
                                    </Typography>
                                    <Typography variant="body2" align="center">
                                        {usdcBalance} USDC
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="body1" fontWeight="bold" align="center">
                                        Treasury Contract Balance:
                                    </Typography>
                                    <Typography variant="body2" align="center">
                                        {treasuryBalance} USDC
                                    </Typography>
                                </div>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </div>
    );
};

export default BalancesComponent;
