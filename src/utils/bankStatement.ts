/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, PaymentMethod, ParsedBankTransaction, BankStatementSummary } from '../types';
import { getTodayString } from './formatters';

/**
 * Normalizes various Indian date representations to ISO YYYY-MM-DD
 */
export function normalizeIndianDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const clean = rawDate.trim().replace(/['"]/g, '');

  // 1. Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Check DD/MM/YY or DD-MM-YY
  const dmyShortMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, '0');
    const month = dmyShortMatch[2].padStart(2, '0');
    const year = `20${dmyShortMatch[3]}`;
    return `${year}-${month}-${day}`;
  }

  // 4. Check DD-MMM-YYYY or DD MMM YYYY (e.g. 15-Oct-2025, 05 Nov 2024)
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const namedMatch = clean.match(/^(\d{1,2})[/\-.\s]([a-zA-Z]{3,9})[/\-.\s](\d{2,4})$/);
  if (namedMatch) {
    const day = namedMatch[1].padStart(2, '0');
    const monthKey = namedMatch[2].substring(0, 3).toLowerCase();
    const month = monthNames[monthKey];
    let year = namedMatch[3];
    if (year.length === 2) year = `20${year}`;
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Intelligent categorization of Indian merchant narrations
 */
export function categorizeNarration(narration: string): Category {
  const text = narration.toLowerCase();

  // Groceries
  if (
    text.includes('blinkit') ||
    text.includes('zepto') ||
    text.includes('instamart') ||
    text.includes('dmart') ||
    text.includes('d-mart') ||
    text.includes('bigbasket') ||
    text.includes('reliance fresh') ||
    text.includes('more retail') ||
    text.includes('nature basket') ||
    text.includes('supermarket') ||
    text.includes('provision') ||
    text.includes('kirana') ||
    text.includes('vegetable') ||
    text.includes('fruit') ||
    text.includes('milk') ||
    text.includes('amul') ||
    text.includes('mother dairy') ||
    text.includes('heritage foods') ||
    text.includes('country delight')
  ) {
    return 'Groceries';
  }

  // Food & Dining
  if (
    text.includes('swiggy') ||
    text.includes('zomato') ||
    text.includes('mcdonald') ||
    text.includes('domino') ||
    text.includes('kfc') ||
    text.includes('pizza') ||
    text.includes('burger') ||
    text.includes('biryani') ||
    text.includes('restaurant') ||
    text.includes('hotel') ||
    text.includes('cafe') ||
    text.includes('coffee') ||
    text.includes('starbucks') ||
    text.includes('chai') ||
    text.includes('tea') ||
    text.includes('haldiram') ||
    text.includes('bikanervala') ||
    text.includes('eatclub') ||
    text.includes('subway') ||
    text.includes('bakery') ||
    text.includes('sweets') ||
    text.includes('canteen')
  ) {
    return 'Food';
  }

  // Transport & Fuel
  if (
    text.includes('uber') ||
    text.includes('ola') ||
    text.includes('rapido') ||
    text.includes('metro') ||
    text.includes('irctc') ||
    text.includes('railway') ||
    text.includes('redbus') ||
    text.includes('petrol') ||
    text.includes('fuel') ||
    text.includes('diesel') ||
    text.includes('indian oil') ||
    text.includes('iocl') ||
    text.includes('hpcl') ||
    text.includes('hindustan petroleum') ||
    text.includes('bpcl') ||
    text.includes('bharat petroleum') ||
    text.includes('shell') ||
    text.includes('fastag') ||
    text.includes('toll') ||
    text.includes('auto') ||
    text.includes('taxi') ||
    text.includes('indigo') ||
    text.includes('air india')
  ) {
    return 'Transport';
  }

  // Rent & Housing
  if (
    text.includes('rent') ||
    text.includes('landlord') ||
    text.includes('pg') ||
    text.includes('maintenance') ||
    text.includes('society') ||
    text.includes('apartment') ||
    text.includes('flat') ||
    text.includes('housing')
  ) {
    return 'Rent';
  }

  // Electricity
  if (
    text.includes('bescom') ||
    text.includes('tneb') ||
    text.includes('tsspdcl') ||
    text.includes('msedcl') ||
    text.includes('cesc') ||
    text.includes('discom') ||
    text.includes('electricity') ||
    text.includes('power') ||
    text.includes('tata power') ||
    text.includes('torrent power') ||
    text.includes('adani elec')
  ) {
    return 'Electricity';
  }

  // Education
  if (
    text.includes('school') ||
    text.includes('college') ||
    text.includes('tuition') ||
    text.includes('fees') ||
    text.includes('exam') ||
    text.includes('university') ||
    text.includes('udemy') ||
    text.includes('coursera') ||
    text.includes('books') ||
    text.includes('stationery') ||
    text.includes('institute') ||
    text.includes('allen') ||
    text.includes('aakash') ||
    text.includes('fiitjee')
  ) {
    return 'Education';
  }

  // Healthcare & Medicine
  if (
    text.includes('apollo') ||
    text.includes('medplus') ||
    text.includes('1mg') ||
    text.includes('pharmeasy') ||
    text.includes('pharmacy') ||
    text.includes('hospital') ||
    text.includes('clinic') ||
    text.includes('doctor') ||
    text.includes('dr.') ||
    text.includes('dental') ||
    text.includes('diagnostic') ||
    text.includes('pathology') ||
    text.includes('lab') ||
    text.includes('medical') ||
    text.includes('lenskart') ||
    text.includes('netmeds')
  ) {
    return 'Healthcare';
  }

  // Mobile Recharge & Internet
  if (
    text.includes('airtel') ||
    text.includes('jio') ||
    text.includes('vi ') ||
    text.includes('vodafone') ||
    text.includes('idea') ||
    text.includes('bsnl') ||
    text.includes('recharge') ||
    text.includes('broadband') ||
    text.includes('wifi') ||
    text.includes('act fibernet') ||
    text.includes('hathway') ||
    text.includes('tata play') ||
    text.includes('dth') ||
    text.includes('dish tv')
  ) {
    return 'Mobile Recharge';
  }

  // Shopping & Lifestyle
  if (
    text.includes('amazon') ||
    text.includes('flipkart') ||
    text.includes('myntra') ||
    text.includes('ajio') ||
    text.includes('meesho') ||
    text.includes('nykaa') ||
    text.includes('zudio') ||
    text.includes('decathlon') ||
    text.includes('zara') ||
    text.includes('h&m') ||
    text.includes('trends') ||
    text.includes('max ') ||
    text.includes('pantaloons') ||
    text.includes('westside') ||
    text.includes('croma') ||
    text.includes('vijay sales') ||
    text.includes('reliance digital') ||
    text.includes('ikea') ||
    text.includes('mall') ||
    text.includes('clothing')
  ) {
    return 'Shopping';
  }

  return 'Other';
}

/**
 * Intelligent detection of Payment Method from Indian statement narrations
 */
export function detectPaymentMethod(narration: string): PaymentMethod {
  const text = narration.toLowerCase();

  // UPI
  if (
    text.includes('upi') ||
    text.includes('vpa') ||
    text.includes('gpay') ||
    text.includes('google pay') ||
    text.includes('phonepe') ||
    text.includes('paytm') ||
    text.includes('@ok') ||
    text.includes('@upi') ||
    text.includes('@ibl') ||
    text.includes('@ybl') ||
    text.includes('@axl') ||
    text.includes('@paytm')
  ) {
    return 'UPI';
  }

  // Cash / ATM
  if (
    text.includes('atm') ||
    text.includes('cash wdl') ||
    text.includes('cash withdrawal') ||
    text.includes('cwdr') ||
    text.includes('self')
  ) {
    return 'Cash';
  }

  // Card / POS
  if (
    text.includes('pos') ||
    text.includes('debit card') ||
    text.includes('credit card') ||
    text.includes('card wdl') ||
    text.includes('visa') ||
    text.includes('mastercard') ||
    text.includes('rupay') ||
    text.includes('swipe')
  ) {
    return 'Card';
  }

  return 'Other';
}

/**
 * Cleans up Indian bank statement transaction narrations to produce friendly descriptions
 */
export function cleanNarrationDescription(narration: string): string {
  if (!narration) return 'Bank Expense';
  let cleaned = narration.trim();

  // Remove common banking prefixes
  cleaned = cleaned.replace(/^(UPI\/[A-Z0-9_-]+\/|UPI\/DR\/|UPI\/CR\/|UPI\/|POS\s*[\d-]*|POS\/|IMPS\/[\d-]*\/|NEFT\/[\d-]*\/|BIL\/ONL\/|ATM\s*WDL\/|ECOM\/|ACH\/|NACH\/)/i, '');

  // If narration is split by slashes (typical UPI format e.g. "UPI/5298492049/Swiggy/swiggy@okhdfc/Payment")
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/').map(p => p.trim()).filter(Boolean);
    // Find part that is likely merchant name (not pure numbers, not UPI address)
    const merchantCandidate = parts.find(p => !/^\d+$/.test(p) && !p.includes('@') && p.length > 2);
    if (merchantCandidate) {
      cleaned = merchantCandidate;
    }
  }

  // Remove excessive whitespace, trailing reference codes
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 50).trim();
  }

  return cleaned || narration.trim();
}

/**
 * Detects Bank Name from file content or file name
 */
export function detectBankName(content: string, fileName?: string): string {
  const combined = `${fileName || ''} ${content.substring(0, 2000)}`.toLowerCase();

  if (combined.includes('state bank') || combined.includes('sbi') || combined.includes('onlinesbi')) {
    return 'State Bank of India (SBI)';
  }
  if (combined.includes('hdfc')) {
    return 'HDFC Bank';
  }
  if (combined.includes('icici')) {
    return 'ICICI Bank';
  }
  if (combined.includes('axis')) {
    return 'Axis Bank';
  }
  if (combined.includes('kotak')) {
    return 'Kotak Mahindra Bank';
  }
  if (combined.includes('punjab national') || combined.includes('pnb')) {
    return 'Punjab National Bank (PNB)';
  }
  if (combined.includes('bank of baroda') || combined.includes('bob')) {
    return 'Bank of Baroda';
  }
  if (combined.includes('canara')) {
    return 'Canara Bank';
  }
  if (combined.includes('paytm')) {
    return 'Paytm Payments Bank';
  }

  return 'Monthly Bank Statement';
}

/**
 * Parses CSV lines considering quotes
 */
function parseCSVLine(text: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Cleans string currency value into a floating point number
 */
function parseAmountValue(raw: string): number {
  if (!raw) return 0;
  // Remove currency symbols, commas, spaces, 'Cr', 'Dr'
  const cleaned = raw.replace(/[₹$,\s]/g, '').replace(/[a-zA-Z]/g, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.abs(val);
}

/**
 * Main parser: Parses monthly bank statements in CSV, TSV, or plain text table format
 */
export function parseBankStatement(
  content: string,
  fileName?: string
): BankStatementSummary {
  const bankName = detectBankName(content, fileName);
  const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  if (rawLines.length === 0) {
    return {
      bankName,
      monthYear: 'Current Month',
      totalDebits: 0,
      totalDebitAmount: 0,
      transactions: [],
    };
  }

  // Detect delimiter (, or \t or ;)
  let delimiter = ',';
  const firstFew = rawLines.slice(0, 10).join('\n');
  if (firstFew.includes('\t') && !firstFew.includes(',')) {
    delimiter = '\t';
  } else if (firstFew.includes(';') && !firstFew.includes(',')) {
    delimiter = ';';
  }

  // Look for header row index
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(rawLines.length, 25); i++) {
    const cells = parseCSVLine(rawLines[i], delimiter).map(c => c.toLowerCase());
    const hasDate = cells.some(c => c.includes('date') || c.includes('txn') || c.includes('dt'));
    const hasAmount = cells.some(c => c.includes('amount') || c.includes('debit') || c.includes('withdrawal') || c.includes('dr'));
    const hasDesc = cells.some(c => c.includes('particular') || c.includes('narration') || c.includes('description') || c.includes('remark'));

    if (hasDate && (hasAmount || hasDesc)) {
      headerIndex = i;
      headers = cells;
      break;
    }
  }

  let dateColIdx = -1;
  let descColIdx = -1;
  let debitColIdx = -1;
  let creditColIdx = -1;
  let amountColIdx = -1;
  let typeColIdx = -1;

  if (headerIndex !== -1) {
    headers.forEach((h, idx) => {
      if (dateColIdx === -1 && (h.includes('txn date') || h.includes('transaction date') || h.includes('date') || h.includes('value dt'))) {
        dateColIdx = idx;
      }
      if (descColIdx === -1 && (h.includes('narration') || h.includes('description') || h.includes('particulars') || h.includes('remark') || h.includes('details'))) {
        descColIdx = idx;
      }
      if (h.includes('debit') || h.includes('withdrawal') || h.includes('dr amt')) {
        debitColIdx = idx;
      }
      if (h.includes('credit') || h.includes('deposit') || h.includes('cr amt')) {
        creditColIdx = idx;
      }
      if (h.includes('amount') && debitColIdx === -1) {
        amountColIdx = idx;
      }
      if (h.includes('type') || h.includes('cr/dr') || h.includes('dr/cr')) {
        typeColIdx = idx;
      }
    });
  }

  const parsedTransactions: ParsedBankTransaction[] = [];
  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;
  const datesSeen: string[] = [];

  for (let i = startRow; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cells = parseCSVLine(line, delimiter);

    let parsedDate: string | null = null;
    let rawNarration = '';
    let debitAmount = 0;
    let isDebit = false;

    if (headerIndex !== -1 && dateColIdx !== -1) {
      // Structured row parsing using detected columns
      parsedDate = normalizeIndianDate(cells[dateColIdx] || '');
      rawNarration = cells[descColIdx] || '';

      if (debitColIdx !== -1 && cells[debitColIdx]) {
        debitAmount = parseAmountValue(cells[debitColIdx]);
        if (debitAmount > 0) isDebit = true;
      } else if (creditColIdx !== -1 && cells[creditColIdx]) {
        // This is a credit, skip unless negative
        const cr = parseAmountValue(cells[creditColIdx]);
        if (cr > 0) isDebit = false;
      } else if (amountColIdx !== -1 && cells[amountColIdx]) {
        const amt = parseAmountValue(cells[amountColIdx]);
        if (amt > 0) {
          if (typeColIdx !== -1) {
            const typeStr = (cells[typeColIdx] || '').toUpperCase();
            if (typeStr.includes('DR') || typeStr.includes('DEBIT')) {
              isDebit = true;
              debitAmount = amt;
            }
          } else {
            // Check if narration has 'DR' or doesn't have 'CR'
            const upperLine = line.toUpperCase();
            if (!upperLine.includes(' CR') && !upperLine.includes('CREDIT') && !upperLine.includes('SALARY')) {
              isDebit = true;
              debitAmount = amt;
            }
          }
        }
      }
    } else {
      // Unstructured or headerless fallback parsing
      // Search for first valid date in row
      for (const cell of cells) {
        const maybeDate = normalizeIndianDate(cell);
        if (maybeDate) {
          parsedDate = maybeDate;
          break;
        }
      }

      // Check for numeric amount
      for (let c = cells.length - 1; c >= 0; c--) {
        const val = parseAmountValue(cells[c]);
        if (val > 0) {
          const upperLine = line.toUpperCase();
          const hasDr = upperLine.includes('DR') || upperLine.includes('DEBIT') || upperLine.includes('WDL');
          const hasCr = upperLine.includes('CR') || upperLine.includes('CREDIT') || upperLine.includes('SALARY');

          if (hasDr || (!hasCr && !cells[c].includes('+'))) {
            isDebit = true;
            debitAmount = val;
            break;
          }
        }
      }

      // Narration is typically longest cell that isn't date or number
      let longestStr = '';
      for (const cell of cells) {
        if (!normalizeIndianDate(cell) && parseAmountValue(cell) === 0 && cell.length > longestStr.length) {
          longestStr = cell;
        }
      }
      rawNarration = longestStr || line;
    }

    if (isDebit && debitAmount > 0 && parsedDate) {
      datesSeen.push(parsedDate);
      const category = categorizeNarration(rawNarration);
      const payment = detectPaymentMethod(rawNarration);
      const cleanDesc = cleanNarrationDescription(rawNarration);

      parsedTransactions.push({
        id: `stmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
        date: parsedDate,
        desc: cleanDesc,
        originalNarration: rawNarration,
        amount: Math.round(debitAmount * 100) / 100,
        category,
        payment,
        selected: true,
      });
    }
  }

  // Determine statement month/year
  let monthYear = 'Current Month';
  if (datesSeen.length > 0) {
    const sampleDate = datesSeen[0];
    const [y, m] = sampleDate.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      monthYear = `${monthNames[monthIdx]} ${y}`;
    }
  }

  const totalDebitAmount = parsedTransactions.reduce((acc, t) => acc + t.amount, 0);

  return {
    bankName,
    monthYear,
    totalDebits: parsedTransactions.length,
    totalDebitAmount: Math.round(totalDebitAmount * 100) / 100,
    transactions: parsedTransactions,
  };
}

/**
 * Pre-configured realistic sample Indian bank monthly statements
 * for instant one-click testing
 */
export function getSampleBankStatements(): {
  sbi: string;
  hdfc: string;
  icici: string;
} {
  const today = getTodayString();
  const [year, month] = today.split('-');

  // Generate dates in the current month
  const d = (day: number) => `${year}-${month}-${String(day).padStart(2, '0')}`;

  const sbi = `State Bank of India (SBI) - Savings Bank Monthly Statement
Account No: XXXXXXXX4821 | Branch: KORAMANGALA | IFSC: SBIN0001234
Txn Date,Description,Debit,Credit,Balance
${d(2)},UPI/5298492049/SWIGGY/Swiggy Bangalore/PAYMENT,340.00,,45210.00
${d(4)},POS 9384 RELIANCE FRESH KORAMANGALA,1450.00,,43760.00
${d(6)},BESCOM ELECTRICITY BILL BANGALORE,1280.00,,42480.00
${d(8)},UPI/5299482711/AIRTEL PREPAID/Recharge,299.00,,42181.00
${d(11)},ATM WDL KORAMANGALA 5TH BLOCK CASH,2000.00,,40181.00
${d(13)},UPI/5301849201/UBER INDIA/Trip to Office,320.00,,39861.00
${d(15)},POS 4829 APOLLO PHARMACY BANGALORE,640.00,,39221.00
${d(18)},UPI/5304928192/ZOMATO/Dinner Biryani,520.00,,38701.00
${d(21)},UPI/5306829104/ZEPTO GROCERIES/Daily Milk & Veg,480.00,,38221.00
${d(23)},HPCL PETROL PUMP KORAMANGALA FUEL,850.00,,37371.00
${d(26)},AMAZON PAY INDIA ONLINE SHOPPING,1690.00,,35681.00
${d(28)},UPI/5309827112/HOUSE RENT TRANSFER/OCTOBER,12000.00,,23681.00`;

  const hdfc = `HDFC BANK LIMITED - Monthly Statement of Account
Account Number: 50100492817291 | Currency: INR
Transaction Date,Narration,Withdrawal (Dr),Deposit (Cr),Closing Balance
${d(1)},UPI-SWIGGY-swiggy@okhdfc-Order Lunch,410.00,,68200.00
${d(3)},POS 7281 BLINKIT INSTANT GROCERIES,920.00,,67280.00
${d(5)},BHARAT PETROLEUM FUEL STATION,1100.00,,66180.00
${d(7)},UPI-ZOMATO-zomato@hdfcbank-Weekend Dinner,680.00,,65500.00
${d(10)},ACT FIBERNET BROADBAND BILL,1050.00,,64450.00
${d(14)},DMART HYPERMARKET MONTHLY PROVISIONS,3420.00,,61030.00
${d(17)},MEDPLUS PHARMACY HEALTHCARE MEDICINES,450.00,,60580.00
${d(20)},OLA CABS COMMUTE TO INDIRANAGAR,240.00,,60340.00
${d(22)},MYNTRA DESIGNS LIFESTYLE SHOPPING,1890.00,,58450.00
${d(25)},UDEMY ONLINE EDUCATION COURSE,549.00,,57901.00`;

  const icici = `ICICI BANK - Savings Account Statement
Customer ID: 94820184 | Account: 004801592810
Date,Particulars,Debit Amount,Credit Amount,Balance
${d(3)},UPI/5039281902/DOMINOS PIZZA/Order,599.00,,52400.00
${d(6)},BIGBASKET TATA GROCERY STORE,1680.00,,50720.00
${d(9)},INDIAN OIL PETROL PUMP WHITEFIELD,750.00,,49970.00
${d(12)},JIO RECHARGE PREPAID 5G PLAN,349.00,,49621.00
${d(15)},FLIPKART INDIA ONLINE ORDER,1299.00,,48322.00
${d(18)},ATM CASH WITHDRAWAL ICICI ATM WHITEFIELD,1500.00,,46822.00
${d(21)},BANGALORE METRO SMART CARD RECHARGE,200.00,,46622.00
${d(24)},1MG HEALTHCARE WELLNESS LAB TEST,890.00,,45732.00
${d(27)},STARBUCKS COFFEE KORAMANGALA,380.00,,45352.00`;

  return { sbi, hdfc, icici };
}
