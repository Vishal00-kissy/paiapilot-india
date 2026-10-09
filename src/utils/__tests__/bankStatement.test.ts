/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  normalizeIndianDate,
  categorizeNarration,
  detectPaymentMethod,
  cleanNarrationDescription,
  parseBankStatement,
  getSampleBankStatements,
} from '../bankStatement';

export function runBankStatementTests() {
  const failures: string[] = [];
  let testCount = 0;

  function assert(condition: boolean, msg: string) {
    testCount++;
    if (!condition) {
      failures.push(msg);
      console.error(`FAIL: ${msg}`);
    }
  }

  // 1. Date normalization tests
  assert(
    normalizeIndianDate('15/10/2025') === '2025-10-15',
    'Normalizes DD/MM/YYYY format'
  );
  assert(
    normalizeIndianDate('05-04-2024') === '2024-04-05',
    'Normalizes DD-MM-YYYY format'
  );
  assert(
    normalizeIndianDate('2025-11-20') === '2025-11-20',
    'Preserves ISO YYYY-MM-DD format'
  );
  assert(
    normalizeIndianDate('12-Oct-2025') === '2025-10-12',
    'Normalizes DD-MMM-YYYY format'
  );

  // 2. Narration Categorization tests
  assert(
    categorizeNarration('UPI/523984/SWIGGY/PAY') === 'Food',
    'Categorizes Swiggy as Food'
  );
  assert(
    categorizeNarration('POS 9384 RELIANCE FRESH') === 'Groceries',
    'Categorizes Reliance Fresh as Groceries'
  );
  assert(
    categorizeNarration('BLINKIT INSTANT GROCERIES') === 'Groceries',
    'Categorizes Blinkit as Groceries'
  );
  assert(
    categorizeNarration('BESCOM ELECTRICITY BILL') === 'Electricity',
    'Categorizes Bescom as Electricity'
  );
  assert(
    categorizeNarration('UBER INDIA TRIP COMMUTE') === 'Transport',
    'Categorizes Uber as Transport'
  );
  assert(
    categorizeNarration('HPCL PETROL PUMP FUEL') === 'Transport',
    'Categorizes HPCL Petrol as Transport'
  );
  assert(
    categorizeNarration('APOLLO PHARMACY BANGALORE') === 'Healthcare',
    'Categorizes Apollo Pharmacy as Healthcare'
  );
  assert(
    categorizeNarration('AIRTEL PREPAID RECHARGE') === 'Mobile Recharge',
    'Categorizes Airtel as Mobile Recharge'
  );
  assert(
    categorizeNarration('AMAZON PAY ONLINE SHOPPING') === 'Shopping',
    'Categorizes Amazon as Shopping'
  );
  assert(
    categorizeNarration('HOUSE RENT TO LANDLORD OCT') === 'Rent',
    'Categorizes House Rent as Rent'
  );

  // 3. Payment Method detection tests
  assert(
    detectPaymentMethod('UPI/5298492049/Swiggy/swiggy@okhdfc') === 'UPI',
    'Detects UPI payment'
  );
  assert(
    detectPaymentMethod('POS 9384 RELIANCE FRESH') === 'Card',
    'Detects Card POS payment'
  );
  assert(
    detectPaymentMethod('ATM WDL KORAMANGALA 5TH BLOCK CASH') === 'Cash',
    'Detects ATM Cash withdrawal'
  );

  // 4. Narration cleaning tests
  const cleanedSwiggy = cleanNarrationDescription('UPI/5298492049/Swiggy/Order');
  assert(
    cleanedSwiggy.toLowerCase().includes('swiggy'),
    'Cleans UPI narration to human-friendly merchant'
  );

  // 5. Sample Statement Parsing tests
  const samples = getSampleBankStatements();
  const sbiResult = parseBankStatement(samples.sbi, 'SBI Statement.csv');
  assert(sbiResult.totalDebits === 12, 'SBI sample parses exactly 12 debit expenses');
  assert(sbiResult.totalDebitAmount > 0, 'SBI sample debit total is positive');
  assert(sbiResult.bankName.includes('SBI'), 'SBI bank name recognized');

  const hdfcResult = parseBankStatement(samples.hdfc, 'HDFC Statement.csv');
  assert(hdfcResult.totalDebits === 10, 'HDFC sample parses exactly 10 debit expenses');
  assert(hdfcResult.bankName.includes('HDFC'), 'HDFC bank name recognized');

  const iciciResult = parseBankStatement(samples.icici, 'ICICI Statement.csv');
  assert(iciciResult.totalDebits === 9, 'ICICI sample parses exactly 9 debit expenses');
  assert(iciciResult.bankName.includes('ICICI'), 'ICICI bank name recognized');

  return {
    total: testCount,
    passed: testCount - failures.length,
    failures,
  };
}

// Self-run when executed directly via tsx
const result = runBankStatementTests();
console.log(`Bank Statement Tests: ${result.passed}/${result.total} passed`);
if (result.failures.length > 0) {
  process.exit(1);
}
