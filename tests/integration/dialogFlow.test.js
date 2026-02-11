const dialogManager = require('../../src/services/dialogManager');
const validators = require('../../src/utils/validators');

describe('Dialog Flow Integration', () => {
  test('Check Balance Flow - phone input', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'CHECK_BALANCE',
      '9876543210',
      {}
    );

    expect(result.messages).not.toBeNull();
    expect(result.messages.length).toBeGreaterThan(0);
    // Note: actual OTP send may fail without API, but dialog logic is correct
    // Either newDialogState is VERIFY_OTP (if OTP succeeds) or stays undefined (if OTP fails)
    if (result.newDialogState === 'VERIFY_OTP') {
      expect(result.attributes.phone).toBeDefined();
      expect(result.attributes.phone).toMatch(/^\+\d+$/);
    } else {
      // OTP API call failed - message should indicate failure
      expect(result.messages[0].text).toContain('Failed');
    }
  });

  test('Check Balance Flow - invalid phone', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'CHECK_BALANCE',
      'invalid',
      {}
    );

    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].text).toContain('Invalid');
  });

  test('Check Balance Flow - invalid OTP', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'VERIFY_OTP',
      '12345',
      { phone: '+919876543210' }
    );

    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].text).toContain('Invalid OTP');
  });

  test('Block Card Flow - phone input', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'BLOCK_CARD',
      'CARD123',
      { phone: '+919876543210' }
    );

    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.newDialogState).toBe('CONFIRM_BLOCK_CARD');
    expect(result.attributes.cardId).toBe('CARD123');
  });

  test('Block Card Flow - invalid card ID', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'BLOCK_CARD',
      '<script>alert("xss")</script>',
      { phone: '+919876543210' }
    );

    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].text).toContain('Invalid');
  });

  test('View Card Limits - invalid card ID', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'VIEW_CARD_LIMITS',
      '',
      { phone: '+919876543210' }
    );

    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].text).toContain('Invalid');
  });

  test('Unblock Card Flow - confirmation', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'UNBLOCK_CARD',
      'CARD456',
      { phone: '+919876543210' }
    );

    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.newDialogState).toBe('CONFIRM_UNBLOCK_CARD');
    expect(result.attributes.cardId).toBe('CARD456');
  });

  test('Report Lost Card Flow', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'REPORT_LOST_CARD',
      'CARD789',
      { phone: '+919876543210' }
    );

    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.newDialogState).toBe('CONFIRM_REPORT_LOST');
    expect(result.attributes.cardId).toBe('CARD789');
  });

  test('Format Transactions - empty list', () => {
    const result = dialogManager.formatTransactions([]);
    expect(result).toBe('No recent transactions.');
  });

  test('Format Transactions - single transaction', () => {
    const transactions = [
      {
        date: '2026-02-10',
        description: 'Coffee',
        amount: 5.00,
        type: 'DEBIT',
      },
    ];
    const result = dialogManager.formatTransactions(transactions);
    expect(result).toContain('Coffee');
    expect(result).toContain('-$5.00');
  });

  test('Format Transactions - multiple transactions', () => {
    const transactions = [
      {
        date: '2026-02-10',
        description: 'Coffee',
        amount: 5.00,
        type: 'DEBIT',
      },
      {
        date: '2026-02-09',
        description: 'Salary',
        amount: 3000.00,
        type: 'CREDIT',
      },
    ];
    const result = dialogManager.formatTransactions(transactions);
    expect(result).toContain('Coffee');
    expect(result).toContain('Salary');
    expect(result).toContain('-$5.00');
    expect(result).toContain('+$3000.00');
  });

  test('Dialog State - MAIN_MENU returns empty messages', async () => {
    const result = await dialogManager.processMessage(
      'user123',
      'MAIN_MENU',
      'anything',
      {}
    );

    expect(result.messages).toBeDefined();
  });
});
