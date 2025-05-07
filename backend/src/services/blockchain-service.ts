import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { SignedTradingSignal } from '../models/signal';
import * as borsh from 'borsh';
import * as dotenv from 'dotenv';

dotenv.config();

// Instruction enum values
enum TradingInstructionEnum {
  PushSignal = 0,
  ExecuteTrade = 1,
}

// Schema for serializing the PushSignal instruction data
class PushSignalArgs {
  tradingPair: string;
  isBuy: boolean;
  amount: bigint;
  timestamp: bigint;
  signature: Uint8Array;

  constructor(args: {
    tradingPair: string;
    isBuy: boolean;
    amount: bigint;
    timestamp: bigint;
    signature: Uint8Array;
  }) {
    this.tradingPair = args.tradingPair;
    this.isBuy = args.isBuy;
    this.amount = args.amount;
    this.timestamp = args.timestamp;
    this.signature = args.signature;
  }
}

// Schema for serializing the PushSignal instruction
class PushSignalInstruction {
  variant: number;
  args: PushSignalArgs;

  constructor(args: PushSignalArgs) {
    this.variant = TradingInstructionEnum.PushSignal;
    this.args = args;
  }
}

// Borsh schema for serialization
const schema = new Map([
  [
    PushSignalArgs,
    {
      kind: 'struct',
      fields: [
        ['tradingPair', 'string'],
        ['isBuy', 'bool'],
        ['amount', 'u64'],
        ['timestamp', 'u64'],
        ['signature', [64]],
      ],
    },
  ],
  [
    PushSignalInstruction,
    {
      kind: 'struct',
      fields: [
        ['variant', 'u8'],
        ['args', PushSignalArgs],
      ],
    },
  ],
]);

export class BlockchainService {
  private connection: Connection;
  private programId: PublicKey;
  private oracleKeypair: Keypair;

  constructor() {
    // Initialize Solana connection
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Set program ID from environment or use a default for development
    this.programId = new PublicKey(
      process.env.PROGRAM_ID || '11111111111111111111111111111111'
    );

    // Load oracle keypair from environment
    // In production, you would use a more secure method to store private keys
    if (process.env.ORACLE_PRIVATE_KEY) {
      const privateKey = Buffer.from(process.env.ORACLE_PRIVATE_KEY, 'base64');
      this.oracleKeypair = Keypair.fromSecretKey(privateKey);
    } else {
      // For development, generate a new keypair
      this.oracleKeypair = Keypair.generate();
      console.warn('Using a generated keypair for development. Do not use in production.');
    }
  }

  /**
   * Push a trading signal to the blockchain
   * @param signal The signed trading signal to push
   * @returns The transaction ID
   */
  async pushSignalToBlockchain(signal: SignedTradingSignal): Promise<string> {
    try {
      // Create a new account to store the signal data
      const signalAccount = Keypair.generate();
      
      // Calculate the space needed for the signal data
      // This is a simplified calculation and should be adjusted based on actual data size
      const space = 1000; // Bytes
      
      // Calculate rent exemption
      const rentExemption = await this.connection.getMinimumBalanceForRentExemption(space);
      
      // Create transaction to create the signal account
      const createAccountIx = await this.createAccountInstruction(
        signalAccount.publicKey,
        space,
        rentExemption
      );
      
      // Create the push signal instruction
      const pushSignalIx = this.createPushSignalInstruction(signal, signalAccount.publicKey);
      
      // Create and sign transaction
      const transaction = new Transaction().add(createAccountIx, pushSignalIx);
      
      // Send and confirm transaction
      const txId = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.oracleKeypair, signalAccount],
        { commitment: 'confirmed' }
      );
      
      console.log(`Signal pushed to blockchain. Transaction ID: ${txId}`);
      return txId;
    } catch (error) {
      console.error('Error pushing signal to blockchain:', error);
      throw error;
    }
  }

  /**
   * Create an instruction to create a new account
   */
  private async createAccountInstruction(
    newAccountPubkey: PublicKey,
    space: number,
    lamports: number
  ): Promise<TransactionInstruction> {
    return TransactionInstruction.fromLegacy({
      keys: [
        { pubkey: this.oracleKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: newAccountPubkey, isSigner: true, isWritable: true },
      ],
      programId: new PublicKey('11111111111111111111111111111111'), // System program
      data: Buffer.from([]), // This would be the actual instruction data
    });
  }

  /**
   * Create an instruction to push a signal to the blockchain
   */
  private createPushSignalInstruction(
    signal: SignedTradingSignal,
    signalAccountPubkey: PublicKey
  ): TransactionInstruction {
    // Create the instruction data
    const pushSignalArgs = new PushSignalArgs({
      tradingPair: signal.tradingPair,
      isBuy: signal.isBuy,
      amount: signal.amount,
      timestamp: signal.timestamp,
      signature: signal.signature,
    });
    
    const instruction = new PushSignalInstruction(pushSignalArgs);
    
    // Serialize the instruction data
    const instructionData = borsh.serialize(schema, instruction);
    
    // Create the instruction
    return new TransactionInstruction({
      keys: [
        { pubkey: this.oracleKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: signalAccountPubkey, isSigner: false, isWritable: true },
        // Add trader account pubkey here
      ],
      programId: this.programId,
      data: Buffer.from(instructionData),
    });
  }

  /**
   * Get the oracle's public key
   * @returns The oracle's public key
   */
  getOraclePublicKey(): PublicKey {
    return this.oracleKeypair.publicKey;
  }
}