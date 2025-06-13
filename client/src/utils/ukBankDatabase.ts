// UK Extended Industry Sort Code Directory (EISCD) lookup system
import eiscdData from '../data/eiscd.json';

export interface BankInfo {
  bank: string;
  branch: string;
}

export interface LegacyBankInfo {
  name: string;
  shortName: string;
}

// Pre-compiled EISCD lookup map for optimal performance
const EISCD_LOOKUP: Record<string, BankInfo> = eiscdData as Record<string, BankInfo>;

/**
 * Fast EISCD lookup using the official Extended Industry Sort Code Directory
 * @param sortCode - 6-digit UK sort code
 * @returns Official bank and branch information or null if not found
 */
export function lookupEISCD(sortCode: string): BankInfo | null {
  if (!sortCode) return null;
  
  // Clean the sort code - remove any hyphens or spaces
  const cleanSortCode = sortCode.replace(/[-\s]/g, '');
  
  // Must be exactly 6 digits
  if (!/^\d{6}$/.test(cleanSortCode)) return null;
  
  // Direct lookup in EISCD database
  return EISCD_LOOKUP[cleanSortCode] || null;
}

/**
 * Creates a display-friendly bank name from EISCD data
 * @param bankInfo - EISCD bank information
 * @returns Short bank name for display
 */
export function getBankDisplayName(bankInfo: BankInfo): string {
  // Extract short name from full bank name
  const bankName = bankInfo.bank;
  
  if (bankName.includes('Barclays')) return 'Barclays';
  if (bankName.includes('HSBC')) return 'HSBC';
  if (bankName.includes('National Westminster') || bankName.includes('NatWest')) return 'NatWest';
  if (bankName.includes('Lloyds')) return 'Lloyds Bank';
  if (bankName.includes('Santander')) return 'Santander';
  if (bankName.includes('Halifax')) return 'Halifax';
  if (bankName.includes('Nationwide')) return 'Nationwide';
  if (bankName.includes('Monzo')) return 'Monzo';
  if (bankName.includes('Starling')) return 'Starling Bank';
  if (bankName.includes('Metro Bank')) return 'Metro Bank';
  if (bankName.includes('TSB')) return 'TSB';
  if (bankName.includes('Co-operative')) return 'Co-operative Bank';
  if (bankName.includes('Bank of Ireland')) return 'Bank of Ireland UK';
  if (bankName.includes('Ulster Bank')) return 'Ulster Bank';
  if (bankName.includes('Clydesdale')) return 'Clydesdale Bank';
  if (bankName.includes('Royal Bank of Scotland')) return 'RBS';
  if (bankName.includes('Revolut')) return 'Revolut';
  if (bankName.includes('Aviva')) return 'Aviva';
  if (bankName.includes('Virgin Money')) return 'Virgin Money';
  if (bankName.includes('Yorkshire Building Society')) return 'Yorkshire Building Society';
  if (bankName.includes('Coventry Building Society')) return 'Coventry Building Society';
  if (bankName.includes('Bank of Scotland')) return 'Bank of Scotland';
  
  // Default to first two words of bank name
  return bankName.split(' ').slice(0, 2).join(' ');
}

/**
 * Identifies the bank name from a UK sort code using EISCD
 * @param sortCode - 6-digit sort code (with or without hyphens)
 * @returns Bank information from EISCD or null if not found
 */
export function identifyBankFromSortCode(sortCode: string): BankInfo | null {
  return lookupEISCD(sortCode);
}

/**
 * Formats a sort code with hyphens
 * @param sortCode - 6-digit sort code
 * @returns Formatted sort code (XX-XX-XX)
 */
export function formatSortCodeDisplay(sortCode: string): string {
  const cleanSortCode = sortCode.replace(/[-\s]/g, '');
  if (cleanSortCode.length === 6) {
    return cleanSortCode.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3');
  }
  return sortCode;
}

/**
 * Validates if a sort code is a valid UK format
 * @param sortCode - Sort code to validate
 * @returns True if valid format
 */
export function isValidUKSortCode(sortCode: string): boolean {
  const cleanSortCode = sortCode.replace(/[-\s]/g, '');
  return /^\d{6}$/.test(cleanSortCode);
}