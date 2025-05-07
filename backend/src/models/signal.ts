import { PublicKey } from '@solana/web3.js';

/**
 * Represents a trading signal to be pushed to the blockchain
 */
export interface TradingSignal {
  // Trading pair (e.g., "SOL/USDC")
  tradingPair: string;
  
  // Trade direction (true for buy, false for sell)
  isBuy: boolean;
  
  // Amount to trade
  amount: bigint;
  
  // Signal timestamp
  timestamp: bigint;
  
  // Oracle public key that generated the signal
  oracle: PublicKey;
}

/**
 * Represents a signed trading signal ready to be sent to the blockchain
 */
export interface SignedTradingSignal extends TradingSignal {
  // Signal signature for verification
  signature: Uint8Array;
}

/**
 * Enum representing the status of a trading signal
 */
export enum SignalStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
}

/**
 * Represents a trading signal with its current status
 */
export interface TrackedTradingSignal extends SignedTradingSignal {
  // Current status of the signal
  status: SignalStatus;
  
  // Transaction ID if the signal was sent to the blockchain
  transactionId?: string;
  
  // Error message if the signal failed
  errorMessage?: string;
}