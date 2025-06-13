// UK bank sort code identification system

export interface BankInfo {
  name: string;
  shortName: string;
}

// Function to identify banks from sort codes
function identifyBankFromPrefix(prefix: string): BankInfo | null {
  const bankMappings: Array<{ prefixes: string[], bank: BankInfo }> = [
    { prefixes: ['07'], bank: { name: 'Nationwide Building Society', shortName: 'Nationwide' } },
    { prefixes: ['08'], bank: { name: 'The Co-operative Bank PLC', shortName: 'Co-operative Bank' } },
    { prefixes: ['09'], bank: { name: 'Santander UK PLC', shortName: 'Santander' } },
    { prefixes: ['11'], bank: { name: 'Halifax', shortName: 'Halifax' } },
    { prefixes: ['16', '18', '83'], bank: { name: 'Royal Bank of Scotland PLC', shortName: 'RBS' } },
    { prefixes: ['20', '23'], bank: { name: 'Barclays Bank PLC', shortName: 'Barclays' } },
    { prefixes: ['30', '77'], bank: { name: 'Lloyds Bank PLC', shortName: 'Lloyds Bank' } },
    { prefixes: ['40', '44'], bank: { name: 'HSBC Bank PLC', shortName: 'HSBC' } },
    { prefixes: ['50', '51', '52', '53', '54', '55', '56', '60'], bank: { name: 'National Westminster Bank PLC', shortName: 'NatWest' } },
    { prefixes: ['72'], bank: { name: 'Santander UK PLC', shortName: 'Santander' } },
    { prefixes: ['82'], bank: { name: 'Clydesdale Bank PLC', shortName: 'Clydesdale Bank' } },
    { prefixes: ['90'], bank: { name: 'Bank of Ireland (UK) PLC', shortName: 'Bank of Ireland UK' } },
    { prefixes: ['98'], bank: { name: 'Ulster Bank Ltd', shortName: 'Ulster Bank' } },
  ];

  for (const mapping of bankMappings) {
    if (mapping.prefixes.includes(prefix)) {
      return mapping.bank;
    }
  }
  return null;
}

// Detailed sort code mappings for more precise identification
export const DETAILED_SORT_CODE_MAPPINGS: Record<string, BankInfo> = {
  // Barclays ranges
  '200000': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  '200001': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  '200002': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  '200003': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  '200004': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  '200005': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  '208000': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  '234567': { name: 'Barclays Bank PLC', shortName: 'Barclays' },
  
  // HSBC ranges
  '400000': { name: 'HSBC Bank PLC', shortName: 'HSBC' },
  '400001': { name: 'HSBC Bank PLC', shortName: 'HSBC' },
  '404784': { name: 'HSBC Bank PLC', shortName: 'HSBC' },
  '444444': { name: 'HSBC Bank PLC', shortName: 'HSBC' },
  
  // NatWest ranges
  '500000': { name: 'National Westminster Bank PLC', shortName: 'NatWest' },
  '500001': { name: 'National Westminster Bank PLC', shortName: 'NatWest' },
  '560003': { name: 'National Westminster Bank PLC', shortName: 'NatWest' },
  '601613': { name: 'National Westminster Bank PLC', shortName: 'NatWest' },
  
  // Lloyds ranges
  '300000': { name: 'Lloyds Bank PLC', shortName: 'Lloyds Bank' },
  '309634': { name: 'Lloyds Bank PLC', shortName: 'Lloyds Bank' },
  '770000': { name: 'Lloyds Bank PLC', shortName: 'Lloyds Bank' },
  
  // Santander ranges
  '090128': { name: 'Santander UK PLC', shortName: 'Santander' },
  '721234': { name: 'Santander UK PLC', shortName: 'Santander' },
  
  // Halifax ranges
  '110000': { name: 'Halifax', shortName: 'Halifax' },
  '113344': { name: 'Halifax', shortName: 'Halifax' },
  
  // Nationwide ranges
  '070000': { name: 'Nationwide Building Society', shortName: 'Nationwide' },
  '070116': { name: 'Nationwide Building Society', shortName: 'Nationwide' },
  
  // Monzo
  '040004': { name: 'Monzo Bank Ltd', shortName: 'Monzo' },
  
  // Starling Bank
  '608371': { name: 'Starling Bank Ltd', shortName: 'Starling Bank' },
  
  // Metro Bank
  '238000': { name: 'Metro Bank PLC', shortName: 'Metro Bank' },
  
  // TSB
  '773300': { name: 'TSB Bank PLC', shortName: 'TSB' },
  
  // Co-operative Bank
  '089999': { name: 'The Co-operative Bank PLC', shortName: 'Co-operative Bank' },
  
  // First Direct
  '401276': { name: 'First Direct', shortName: 'First Direct' },
  
  // Bank of Ireland UK
  '902010': { name: 'Bank of Ireland (UK) PLC', shortName: 'Bank of Ireland UK' },
  
  // Ulster Bank
  '983100': { name: 'Ulster Bank Ltd', shortName: 'Ulster Bank' },
  
  // Yorkshire Bank
  '050000': { name: 'Yorkshire Bank PLC', shortName: 'Yorkshire Bank' },
  
  // Clydesdale Bank
  '820000': { name: 'Clydesdale Bank PLC', shortName: 'Clydesdale Bank' },
};

/**
 * Identifies the bank name from a UK sort code
 * @param sortCode - 6-digit sort code (with or without hyphens)
 * @returns Bank information or null if not found
 */
export function identifyBankFromSortCode(sortCode: string): BankInfo | null {
  if (!sortCode) return null;
  
  // Clean the sort code - remove any hyphens or spaces
  const cleanSortCode = sortCode.replace(/[-\s]/g, '');
  
  // Must be exactly 6 digits
  if (!/^\d{6}$/.test(cleanSortCode)) return null;
  
  // First try exact match in detailed mappings
  if (DETAILED_SORT_CODE_MAPPINGS[cleanSortCode]) {
    return DETAILED_SORT_CODE_MAPPINGS[cleanSortCode];
  }
  
  // Then try prefix matching (first 2 digits)
  const prefix = cleanSortCode.substring(0, 2);
  return identifyBankFromPrefix(prefix);
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