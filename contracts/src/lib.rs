//! On-chain trading platform for executing trades based on signals

use borsh::{BorshDeserialize, BorshSerialize};
#[cfg(test)]
mod test;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use thiserror::Error;

/// Program entrypoint
entrypoint!(process_instruction);

/// Program errors
#[derive(Error, Debug, Copy, Clone)]
pub enum TradingError {
    #[error("Invalid instruction")]
    InvalidInstruction,
    #[error("Invalid signal")]
    InvalidSignal,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Trade execution failed")]
    TradeExecutionFailed,
}

impl From<TradingError> for ProgramError {
    fn from(e: TradingError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

/// Instructions supported by the trading program
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum TradingInstruction {
    /// Push a trading signal to the platform
    /// 
    /// Accounts expected:
    /// 0. `[signer]` The oracle account pushing the signal
    /// 1. `[writable]` The signal account to store the signal data
    /// 2. `[]` The trader account that will execute the trade
    PushSignal {
        /// Trading pair (e.g., "SOL/USDC")
        trading_pair: String,
        /// Trade direction (true for buy, false for sell)
        is_buy: bool,
        /// Amount to trade
        amount: u64,
        /// Signal timestamp
        timestamp: u64,
        /// Signal signature for verification
        signature: [u8; 64],
    },
    
    /// Execute a trade based on a signal
    /// 
    /// Accounts expected:
    /// 0. `[signer]` The trader account executing the trade
    /// 1. `[]` The signal account containing the signal data
    /// 2. `[writable]` The trader's token account for the source token
    /// 3. `[writable]` The trader's token account for the destination token
    /// 4. `[]` Jupiter Swap program account
    /// 5+ Jupiter Swap required accounts
    ExecuteTrade {
        /// Slippage tolerance in basis points (e.g., 50 = 0.5%)
        slippage_bps: u16,
    },
}

/// Signal data structure
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct SignalData {
    /// Oracle public key that generated the signal
    pub oracle: Pubkey,
    /// Trading pair (e.g., "SOL/USDC")
    pub trading_pair: String,
    /// Trade direction (true for buy, false for sell)
    pub is_buy: bool,
    /// Amount to trade
    pub amount: u64,
    /// Signal timestamp
    pub timestamp: u64,
    /// Signal signature for verification
    pub signature: [u8; 64],
    /// Whether the signal has been executed
    pub executed: bool,
}

/// Process program instruction
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = TradingInstruction::try_from_slice(instruction_data)
        .map_err(|_| TradingError::InvalidInstruction)?;

    match instruction {
        TradingInstruction::PushSignal {
            trading_pair,
            is_buy,
            amount,
            timestamp,
            signature,
        } => {
            process_push_signal(
                program_id,
                accounts,
                trading_pair,
                is_buy,
                amount,
                timestamp,
                signature,
            )
        }
        TradingInstruction::ExecuteTrade { slippage_bps } => {
            process_execute_trade(program_id, accounts, slippage_bps)
        }
    }
}

/// Process a push signal instruction
fn process_push_signal(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    trading_pair: String,
    is_buy: bool,
    amount: u64,
    timestamp: u64,
    signature: [u8; 64],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let oracle_account = next_account_info(account_info_iter)?;
    let signal_account = next_account_info(account_info_iter)?;
    let trader_account = next_account_info(account_info_iter)?;
    
    // Verify oracle is a signer
    if !oracle_account.is_signer {
        return Err(TradingError::Unauthorized.into());
    }
    
    // Verify signal account is owned by the program
    if signal_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    
    // TODO: Implement signature verification
    // For now, we'll just log that we received a signal
    msg!("Received trading signal for {}: {}", trading_pair, if is_buy { "BUY" } else { "SELL" });
    
    // Create and serialize signal data
    let signal_data = SignalData {
        oracle: *oracle_account.key,
        trading_pair,
        is_buy,
        amount,
        timestamp,
        signature,
        executed: false,
    };
    
    signal_data.serialize(&mut *signal_account.data.borrow_mut())?;
    
    Ok(())
}

/// Process an execute trade instruction
fn process_execute_trade(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    slippage_bps: u16,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let trader_account = next_account_info(account_info_iter)?;
    let signal_account = next_account_info(account_info_iter)?;
    let source_token_account = next_account_info(account_info_iter)?;
    let destination_token_account = next_account_info(account_info_iter)?;
    let jupiter_program = next_account_info(account_info_iter)?;
    
    // Verify trader is a signer
    if !trader_account.is_signer {
        return Err(TradingError::Unauthorized.into());
    }
    
    // Verify signal account is owned by the program
    if signal_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    
    // Deserialize signal data
    let mut signal_data = SignalData::try_from_slice(&signal_account.data.borrow())?;
    
    // Check if signal has already been executed
    if signal_data.executed {
        return Err(TradingError::InvalidSignal.into());
    }
    
    // TODO: Implement Jupiter Swap integration
    // For now, we'll just log that we're executing a trade
    msg!(
        "Executing trade for {}: {} {} at slippage {}bps",
        signal_data.trading_pair,
        if signal_data.is_buy { "BUY" } else { "SELL" },
        signal_data.amount,
        slippage_bps
    );
    
    // Mark signal as executed
    signal_data.executed = true;
    signal_data.serialize(&mut *signal_account.data.borrow_mut())?;
    
    Ok(())
}

// TODO: Implement Jupiter Swap integration
// This would involve creating a CPI (Cross-Program Invocation) to the Jupiter Swap program
// For a complete implementation, we would need to understand Jupiter's interface

// TODO: Implement signal verification
// This would involve verifying the signature using the oracle's public key