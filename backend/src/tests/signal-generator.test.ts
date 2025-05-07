import { SignalGenerator } from '../services/signal-generator';
import { BlockchainService } from '../services/blockchain-service';
import { TradingSignal } from '../models/signal';

// Mock the BlockchainService
jest.mock('../services/blockchain-service');

describe('SignalGenerator', () => {
  let signalGenerator: SignalGenerator;
  let mockBlockchainService: jest.Mocked<BlockchainService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a mock BlockchainService
    mockBlockchainService = new BlockchainService() as jest.Mocked<BlockchainService>;
    
    // Mock the getOraclePublicKey method
    mockBlockchainService.getOraclePublicKey = jest.fn().mockReturnValue({
      toBase58: jest.fn().mockReturnValue('oracle123456789'),
      toString: jest.fn().mockReturnValue('oracle123456789'),
    });
    
    // Create a SignalGenerator with the mock BlockchainService
    signalGenerator = new SignalGenerator(mockBlockchainService);
  });

  describe('generateSignal', () => {
    it('should generate a valid trading signal', () => {
      // Generate a signal
      const signal: TradingSignal = signalGenerator.generateSignal();
      
      // Verify the signal has all required properties
      expect(signal).toHaveProperty('tradingPair');
      expect(signal).toHaveProperty('isBuy');
      expect(signal).toHaveProperty('amount');
      expect(signal).toHaveProperty('timestamp');
      expect(signal).toHaveProperty('oracle');
      
      // Verify the trading pair is one of the expected values
      expect(['SOL/USDC', 'BTC/USDC', 'ETH/USDC']).toContain(signal.tradingPair);
      
      // Verify isBuy is a boolean
      expect(typeof signal.isBuy).toBe('boolean');
      
      // Verify amount is a BigInt
      expect(typeof signal.amount).toBe('bigint');
      
      // Verify timestamp is a BigInt
      expect(typeof signal.timestamp).toBe('bigint');
      
      // Verify oracle is set correctly
      expect(mockBlockchainService.getOraclePublicKey).toHaveBeenCalled();
    });
  });

  describe('signSignal', () => {
    it('should sign a trading signal', () => {
      // Create a test signal
      const testSignal: TradingSignal = {
        tradingPair: 'SOL/USDC',
        isBuy: true,
        amount: BigInt(1000000000),
        timestamp: BigInt(Date.now()),
        oracle: mockBlockchainService.getOraclePublicKey(),
      };
      
      // Sign the signal
      const signedSignal = signalGenerator.signSignal(testSignal);
      
      // Verify the signed signal has all the original properties
      expect(signedSignal.tradingPair).toBe(testSignal.tradingPair);
      expect(signedSignal.isBuy).toBe(testSignal.isBuy);
      expect(signedSignal.amount).toBe(testSignal.amount);
      expect(signedSignal.timestamp).toBe(testSignal.timestamp);
      expect(signedSignal.oracle).toBe(testSignal.oracle);
      
      // Verify the signature is added
      expect(signedSignal).toHaveProperty('signature');
      expect(signedSignal.signature).toBeInstanceOf(Uint8Array);
      expect(signedSignal.signature.length).toBe(64);
    });
  });

  describe('generateAndSignSignal', () => {
    it('should generate and sign a trading signal', () => {
      // Generate and sign a signal
      const signedSignal = signalGenerator.generateAndSignSignal();
      
      // Verify the signed signal has all required properties
      expect(signedSignal).toHaveProperty('tradingPair');
      expect(signedSignal).toHaveProperty('isBuy');
      expect(signedSignal).toHaveProperty('amount');
      expect(signedSignal).toHaveProperty('timestamp');
      expect(signedSignal).toHaveProperty('oracle');
      expect(signedSignal).toHaveProperty('signature');
      
      // Verify the signature is a Uint8Array of length 64
      expect(signedSignal.signature).toBeInstanceOf(Uint8Array);
      expect(signedSignal.signature.length).toBe(64);
    });
  });
});