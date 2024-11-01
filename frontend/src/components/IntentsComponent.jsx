import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, TextField, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress, Snackbar, Alert, Chip } from '@mui/material';
import IntentsABI from '../../../artifacts/contracts/Intents.sol/Intents.json'; // Adjust the path to your Intents contract ABI
import MultiSigABI from '../../../artifacts/contracts/MultiSig.sol/MultiSig.json'; // Adjust the path to your MultiSig contract ABI
import addresses from '../../../addresses.json'; // Import addresses

const IntentsComponent = () => {
    const [intents, setIntents] = useState([]);
    const [executedIntents, setExecutedIntents] = useState([]);
    const [newIntent, setNewIntent] = useState({ to: '', amount: '', recurringInterval: '', timeUnit: 'seconds' });
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [intentsContract, setIntentsContract] = useState(null);
    const [multiSigContract, setMultiSigContract] = useState(null);
    const [owners, setOwners] = useState([]);
    const [threshold, setThreshold] = useState(0);
    const [requiredSignatures, setRequiredSignatures] = useState(0);
    const [signatures, setSignatures] = useState({}); // Store signatures for intents
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [transactionHash, setTransactionHash] = useState('');
    const [chainId, setChainId] = useState(null); // Add chainId state

    useEffect(() => {
        const initEthers = async () => {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const intentsContract = new ethers.Contract(addresses.Intents, IntentsABI.abi, signer);
            const multiSigContract = new ethers.Contract(addresses.MultiSig, MultiSigABI.abi, signer);

            setProvider(provider);
            setSigner(signer);
            setIntentsContract(intentsContract);
            setMultiSigContract(multiSigContract);

            // Fetch the connected chain ID
            const network = await provider.getNetwork();
            setChainId(network.chainId); // Set the chainId in state

            // Fetch owners, threshold, and required signatures
            const owners = await multiSigContract.owners();
            const threshold = await multiSigContract.threshold();
            const requiredSignatures = await multiSigContract.requiredSignatures();

            setOwners(owners);
            setThreshold(threshold.toNumber());
            setRequiredSignatures(requiredSignatures.toNumber());

            // Load signatures from localStorage
            const storedSignatures = localStorage.getItem('signatures');
            if (storedSignatures) {
                setSignatures(JSON.parse(storedSignatures));
            }

            // Fetch all intents from the contract
            const totalIntents = await intentsContract.nextIntentId();
            const fetchedIntents = [];
            for (let i = 1; i < totalIntents; i++) {
                const intent = await intentsContract.intents(i);
                fetchedIntents.push({
                    id: i,
                    user: intent.user,
                    to: intent.to,
                    amount: ethers.utils.formatUnits(intent.amount, 6), // Assuming USDC with 6 decimals
                    nextExecutionTime: intent.nextExecutionTime.toNumber(),
                    recurringInterval: intent.recurringInterval.toNumber(),
                    signatures: signatures[i] ? signatures[i].length : 0, // Get stored signatures count
                    requiredSignatures: intent.amount.gt(threshold) ? requiredSignatures : 1
                });
            }
            setIntents(fetchedIntents);

            // Listen to contract events
            intentsContract.on('IntentCreated', (intentId, user, to, amount, nextExecutionTime, recurringInterval) => {
                const newIntent = {
                    id: intentId.toNumber(),
                    user,
                    to,
                    amount: ethers.utils.formatUnits(amount, 6), // Assuming USDC with 6 decimals
                    nextExecutionTime: nextExecutionTime.toNumber(),
                    recurringInterval: recurringInterval.toNumber(),
                    signatures: 0,
                    requiredSignatures: amount.gt(threshold) ? requiredSignatures : 1
                };
                setIntents(prevIntents => [...prevIntents, newIntent]);
            });

            intentsContract.on('IntentExecuted', (intentId, to, amount, executionCount) => {
                setExecutedIntents(prevExecutedIntents => [...prevExecutedIntents, { intentId, to, amount, executionCount }]);
                setIntents(prevIntents => prevIntents.filter(intent => intent.id !== intentId.toNumber()));
                // Remove signatures for executed intent
                const updatedSignatures = { ...signatures };
                delete updatedSignatures[intentId.toNumber()];
                setSignatures(updatedSignatures);
                localStorage.setItem('signatures', JSON.stringify(updatedSignatures));
            });
        };

        initEthers();
    }, []);

    useEffect(() => {
        // Save signatures to localStorage whenever they change
        localStorage.setItem('signatures', JSON.stringify(signatures));
    }, [signatures]);

    const handleCreateIntent = async () => {
        try {
            const recurringInterval = convertToTimestamp(newIntent.recurringInterval, newIntent.timeUnit);
            const tx = await intentsContract.createIntent(
                newIntent.to,
                ethers.utils.parseUnits(newIntent.amount, 6), // Assuming USDC with 6 decimals
                recurringInterval
            );
            await tx.wait();
            setTransactionHash(tx.hash);
            setOpenSnackbar(true);
            setNewIntent({ to: '', amount: '', recurringInterval: '', timeUnit: 'seconds' });
        } catch (error) {
            console.error('Error creating intent:', error);
        }
    };

    const convertToTimestamp = (value, unit) => {
        const timeUnits = {
            seconds: 1,
            minutes: 60,
            hours: 3600,
            days: 86400,
            months: 2592000 // Approximation: 30 days
        };
        return value * timeUnits[unit];
    };

    const handleSignIntent = async (intentId) => {
        try {
            const intent = intents.find(intent => intent.id === intentId);
            const messageHash = ethers.utils.solidityKeccak256(
                ['address', 'uint128'],
                [intent.to, ethers.utils.parseUnits(intent.amount, 6)]
            );
            const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
            console.log('Signature:', signature);

            // Store the signature
            const updatedSignatures = { ...signatures };
            if (!updatedSignatures[intentId]) {
                updatedSignatures[intentId] = [];
            }
            updatedSignatures[intentId].push(signature);
            setSignatures(updatedSignatures);
        } catch (error) {
            console.error('Error signing intent:', error);
        }
    };

    const handleExecuteIntent = async (intentId) => {
        try {
            const intent = intents.find(intent => intent.id === intentId);
            const signaturesArray = signatures[intentId] || []; // Collect signatures from storage
            const tx = await intentsContract.approveIntent(intentId, signaturesArray);
            await tx.wait();
            alert('Intent execution transaction sent!');
        } catch (error) {
            console.error('Error executing intent:', error);
        }
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

    const getEtherscanUrl = (chainId) => {
        switch (chainId) {
            case 1: // Mainnet
                return 'https://etherscan.io/tx/';
            case 11155111: // Sepolia
                return 'https://sepolia.etherscan.io/tx/';
            case 42161: // Arbitrum
                return 'https://arbiscan.io/tx/';
            case 421613: // Arbitrum Sepolia
                return 'https://testnet.arbiscan.io/tx/';
            case 56: // Binance Smart Chain (BSC)
                return 'https://bscscan.com/tx/';
            case 97: // Binance Smart Chain Testnet
                return 'https://testnet.bscscan.com/tx/';
            default:
                return 'https://etherscan.io/tx/'; // Fallback to Mainnet
        }
    };

    return (
        <div>
            <Card>
                <CardContent>
                    <Typography variant="h5">Create Intent</Typography>
                    <TextField label="To" value={newIntent.to} onChange={(e) => setNewIntent({ ...newIntent, to: e.target.value })} fullWidth margin="normal" />
                    <TextField label="Amount" value={newIntent.amount} onChange={(e) => setNewIntent({ ...newIntent, amount: e.target.value })} fullWidth margin="normal" />
                    <TextField label="Recurring Interval" value={newIntent.recurringInterval} onChange={(e) => setNewIntent({ ...newIntent, recurringInterval: e.target.value })} fullWidth margin="normal" />
                    <select value={newIntent.timeUnit} onChange={(e) => setNewIntent({ ...newIntent, timeUnit: e.target.value })}>
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                    </select>
                    <Button onClick={handleCreateIntent} variant="contained" color="primary">Create Intent</Button>
                </CardContent>
            </Card>

            <Typography variant="h6" style={{ marginTop: '20px' }}>Pending Intents</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Recipient</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Recurring Interval</TableCell>
                            <TableCell>Signatures</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {intents.filter(intent => owners.includes(intent.user)).map(intent => (
                            <TableRow key={intent.id}>
                                <TableCell>{intent.to}</TableCell>
                                <TableCell>{intent.amount}</TableCell>
                                <TableCell>{intent.recurringInterval}</TableCell>
                                <TableCell>
                                    <LinearProgress variant="determinate" value={(intent.signatures / intent.requiredSignatures) * 100} />
                                    {intent.signatures}/{intent.requiredSignatures}
                                </TableCell>
                                <TableCell>
                                    <Button onClick={() => handleSignIntent(intent.id)} disabled={intent.signatures >= intent.requiredSignatures}>Sign</Button>
                                    <Button onClick={() => handleExecuteIntent(intent.id)} disabled={intent.signatures < intent.requiredSignatures}>Execute</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="h6" style={{ marginTop: '20px' }}>Executed Intents</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>To</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Execution Count</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {executedIntents.map(intent => (
                            <TableRow key={intent.intentId}>
                                <TableCell>{intent.to}</TableCell>
                                <TableCell>{ethers.utils.formatUnits(intent.amount, 6)}</TableCell>
                                <TableCell>{intent.executionCount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
                    Transaction Successful! Hash: 
                    <Chip 
                        label={transactionHash} 
                        component="a" 
                        href={`${getEtherscanUrl(chainId)}${transactionHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        clickable 
                        sx={{ marginLeft: 1 }} 
                    />
                </Alert>
            </Snackbar>
        </div>
    );
};

export default IntentsComponent; 