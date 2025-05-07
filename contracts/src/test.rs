#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::{
        account_info::AccountInfo,
        pubkey::Pubkey,
    };
    use std::mem::size_of;

    // Mock accounts for testing
    struct MockAccounts {
        oracle: (Pubkey, Vec<u8>),
        signal: (Pubkey, Vec<u8>),
        trader: (Pubkey, Vec<u8>),
        source_token: (Pubkey, Vec<u8>),
        dest_token: (Pubkey, Vec<u8>),
        jupiter: (Pubkey, Vec<u8>),
    }

    impl MockAccounts {
        fn new() -> Self {
            Self {
                oracle: (Pubkey::new_unique(), vec![0; 100]),
                signal: (Pubkey::new_unique(), vec![0; 1000]),
                trader: (Pubkey::new_unique(), vec![0; 100]),
                source_token: (Pubkey::new_unique(), vec![0; 100]),
                dest_token: (Pubkey::new_unique(), vec![0; 100]),
                jupiter: (Pubkey::new_unique(), vec![0; 100]),
            }
        }

        fn get_account_infos(&mut self, program_id: &Pubkey) -> Vec<AccountInfo> {
            let oracle_account_info = AccountInfo::new(
                &self.oracle.0,
                true, // is_signer
                false, // is_writable
                &mut self.oracle.1[0] as *mut u8 as *mut u64,
                self.oracle.1.len(),
                &program_id,
                false, // executable
                0, // rent_epoch
            );

            let signal_account_info = AccountInfo::new(
                &self.signal.0,
                false, // is_signer
                true, // is_writable
                &mut self.signal.1[0] as *mut u8 as *mut u64,
                self.signal.1.len(),
                &program_id,
                false, // executable
                0, // rent_epoch
            );

            let trader_account_info = AccountInfo::new(
                &self.trader.0,
                true, // is_signer
                false, // is_writable
                &mut self.trader.1[0] as *mut u8 as *mut u64,
                self.trader.1.len(),
                &program_id,
                false, // executable
                0, // rent_epoch
            );

            let source_token_account_info = AccountInfo::new(
                &self.source_token.0,
                false, // is_signer
                true, // is_writable
                &mut self.source_token.1[0] as *mut u8 as *mut u64,
                self.source_token.1.len(),
                &program_id,
                false, // executable
                0, // rent_epoch
            );

            let dest_token_account_info = AccountInfo::new(
                &self.dest_token.0,
                false, // is_signer
                true, // is_writable
                &mut self.dest_token.1[0] as *mut u8 as *mut u64,
                self.dest_token.1.len(),
                &program_id,
                false, // executable
                0, // rent_epoch
            );

            let jupiter_account_info = AccountInfo::new(
                &self.jupiter.0,
                false, // is_signer
                false, // is_writable
                &mut self.jupiter.1[0] as *mut u8 as *mut u64,
                self.jupiter.1.len(),
                &Pubkey::new_unique(), // Different program_id for Jupiter
                true, // executable
                0, // rent_epoch
            );

            vec![
                oracle_account_info,
                signal_account_info,
                trader_account_info,
                source_token_account_info,
                dest_token_account_info,
                jupiter_account_info,
            ]
        }
    }

    #[test]
    fn test_push_signal() {
        // Create program ID and accounts
        let program_id = Pubkey::new_unique();
        let mut mock_accounts = MockAccounts::new();
        let accounts = mock_accounts.get_account_infos(&program_id);

        // Create instruction data
        let trading_pair = "SOL/USDC".to_string();
        let is_buy = true;
        let amount = 1000000000;
        let timestamp = 1620000000;
        let signature = [1; 64];

        let instruction = TradingInstruction::PushSignal {
            trading_pair: trading_pair.clone(),
            is_buy,
            amount,
            timestamp,
            signature,
        };

        let mut instruction_data = Vec::new();
        instruction.serialize(&mut instruction_data).unwrap();

        // Process the instruction
        let result = process_instruction(&program_id, &accounts, &instruction_data);

        // Verify the result
        assert!(result.is_ok());

        // Deserialize the signal data from the signal account
        let signal_data = SignalData::try_from_slice(&accounts[1].data.borrow()).unwrap();

        // Verify the signal data
        assert_eq!(signal_data.trading_pair, trading_pair);
        assert_eq!(signal_data.is_buy, is_buy);
        assert_eq!(signal_data.amount, amount);
        assert_eq!(signal_data.timestamp, timestamp);
        assert_eq!(signal_data.signature, signature);
        assert_eq!(signal_data.executed, false);
    }

    #[test]
    fn test_execute_trade() {
        // Create program ID and accounts
        let program_id = Pubkey::new_unique();
        let mut mock_accounts = MockAccounts::new();
        let accounts = mock_accounts.get_account_infos(&program_id);

        // First, push a signal
        let trading_pair = "SOL/USDC".to_string();
        let is_buy = true;
        let amount = 1000000000;
        let timestamp = 1620000000;
        let signature = [1; 64];

        let signal_data = SignalData {
            oracle: accounts[0].key.clone(),
            trading_pair,
            is_buy,
            amount,
            timestamp,
            signature,
            executed: false,
        };

        signal_data.serialize(&mut *accounts[1].data.borrow_mut()).unwrap();

        // Create instruction data for execute trade
        let slippage_bps = 50; // 0.5%

        let instruction = TradingInstruction::ExecuteTrade { slippage_bps };

        let mut instruction_data = Vec::new();
        instruction.serialize(&mut instruction_data).unwrap();

        // Process the instruction
        let result = process_instruction(&program_id, &accounts, &instruction_data);

        // Verify the result
        assert!(result.is_ok());

        // Deserialize the signal data from the signal account
        let updated_signal_data = SignalData::try_from_slice(&accounts[1].data.borrow()).unwrap();

        // Verify the signal is marked as executed
        assert!(updated_signal_data.executed);
    }
}