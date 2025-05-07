import express from 'express';
import { BlockchainService } from './services/blockchain-service';
import { SignalGenerator } from './services/signal-generator';
import { SignalStatus, TrackedTradingSignal } from './models/signal';
import * as dotenv from 'dotenv';

dotenv.config();

// Create services
const blockchainService = new BlockchainService();
const signalGenerator = new SignalGenerator(blockchainService);

// Store for tracking signals
const signalStore: TrackedTradingSignal[] = [];

// Create Express app
const app = express();
app.use(express.json());

// Define port
const PORT = process.env.PORT || 3000;

// API routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/signals', (req, res) => {
  res.status(200).json(signalStore);
});

app.post('/api/signals/generate', async (req, res) => {
  try {
    // Generate and sign a signal
    const signedSignal = signalGenerator.generateAndSignSignal();
    
    // Track the signal
    const trackedSignal: TrackedTradingSignal = {
      ...signedSignal,
      status: SignalStatus.PENDING,
    };
    
    signalStore.push(trackedSignal);
    
    // Push the signal to the blockchain
    try {
      const txId = await blockchainService.pushSignalToBlockchain(signedSignal);
      
      // Update signal status
      trackedSignal.status = SignalStatus.SENT;
      trackedSignal.transactionId = txId;
    } catch (error) {
      // Update signal status on error
      trackedSignal.status = SignalStatus.FAILED;
      trackedSignal.errorMessage = error instanceof Error ? error.message : String(error);
    }
    
    res.status(201).json(trackedSignal);
  } catch (error) {
    console.error('Error generating signal:', error);
    res.status(500).json({ error: 'Failed to generate signal' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Oracle public key: ${blockchainService.getOraclePublicKey().toBase58()}`);
});

// Schedule signal generation (for demo purposes)
if (process.env.AUTO_GENERATE_SIGNALS === 'true') {
  const INTERVAL_MS = parseInt(process.env.SIGNAL_INTERVAL_MS || '60000', 10);
  
  console.log(`Auto-generating signals every ${INTERVAL_MS}ms`);
  
  setInterval(async () => {
    try {
      // Generate and sign a signal
      const signedSignal = signalGenerator.generateAndSignSignal();
      
      // Track the signal
      const trackedSignal: TrackedTradingSignal = {
        ...signedSignal,
        status: SignalStatus.PENDING,
      };
      
      signalStore.push(trackedSignal);
      
      // Push the signal to the blockchain
      try {
        const txId = await blockchainService.pushSignalToBlockchain(signedSignal);
        
        // Update signal status
        trackedSignal.status = SignalStatus.SENT;
        trackedSignal.transactionId = txId;
        
        console.log(`Signal generated and sent to blockchain. Transaction ID: ${txId}`);
      } catch (error) {
        // Update signal status on error
        trackedSignal.status = SignalStatus.FAILED;
        trackedSignal.errorMessage = error instanceof Error ? error.message : String(error);
        
        console.error('Error pushing signal to blockchain:', error);
      }
    } catch (error) {
      console.error('Error in scheduled signal generation:', error);
    }
  }, INTERVAL_MS);
}