// UK Bank Sort Code Database
export const ukBankDatabase: Record<string, string> = {
  // Major UK Banks
  '04-00': 'Royal Bank of Scotland',
  '05-00': 'Barclays Bank',
  '20-00': 'Barclays Bank',
  '09-01': 'Santander UK',
  '72-00': 'Santander UK',
  '16-00': 'Lloyds Bank',
  '30-00': 'Lloyds Bank',
  '77-00': 'Lloyds Bank',
  '40-00': 'HSBC Bank',
  '40-05': 'HSBC Bank',
  '60-00': 'National Westminster Bank',
  '98-01': 'Yorkshire Bank',
  '05-07': 'Nationwide Building Society',
  '07-01': 'Nationwide Building Society',
  '08-32': 'Co-operative Bank',
  '08-90': 'Co-operative Bank',
  '23-05': 'Metro Bank',
  '04-06': 'Monzo Bank',
  '38-05': 'Revolut',
  '23-14': 'Revolut',
  '77-71': 'TSB Bank',
  '30-96': 'TSB Bank',
  '40-47': 'First Direct',
  '11-00': 'Halifax',
  '11-01': 'Halifax',
  '12-01': 'Bank of Scotland',
  '80-00': 'Bank of Scotland',
  '82-62': 'Virgin Money',
  '05-15': 'Virgin Money',
  '77-20': 'Tesco Bank',
  '95-00': 'Danske Bank (Northern Ireland)',
  '93-00': 'First Trust Bank (Northern Ireland)',
  '90-21': 'Bank of Ireland (UK)',
  '90-48': 'Bank of Ireland (UK)',
  '60-83': 'Ulster Bank',
  '23-48': 'Aldermore Bank',
  '23-46': 'Shawbrook Bank',
  '23-61': 'OakNorth Bank',
  '23-57': 'ClearBank',
  '23-69': 'Starling Bank',
  '08-87': 'Cashplus Bank',
  '23-56': 'Modulr Finance'
};

export function validateUKSortCode(sortCode: string): string | null {
  if (!sortCode || sortCode.length !== 6) {
    return null;
  }

  // Format sort code with dashes
  const formattedSortCode = `${sortCode.slice(0, 2)}-${sortCode.slice(2, 4)}`;
  
  // Check exact match first
  if (ukBankDatabase[formattedSortCode]) {
    return ukBankDatabase[formattedSortCode];
  }

  // Check for partial matches (first 4 digits)
  const partialCode = sortCode.slice(0, 4);
  for (const [code, bankName] of Object.entries(ukBankDatabase)) {
    if (code.replace('-', '').startsWith(partialCode)) {
      return bankName;
    }
  }

  return 'Unknown Bank';
}

export function validateUKAccountNumber(accountNumber: string): boolean {
  // UK account numbers are typically 8 digits
  return /^[0-9]{8}$/.test(accountNumber);
}

export function formatSortCode(sortCode: string): string {
  // Remove any existing formatting
  const cleanCode = sortCode.replace(/\D/g, '');
  
  // Format as XX-XX-XX
  if (cleanCode.length >= 6) {
    return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2, 4)}-${cleanCode.slice(4, 6)}`;
  } else if (cleanCode.length >= 4) {
    return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2, 4)}-${cleanCode.slice(4)}`;
  } else if (cleanCode.length >= 2) {
    return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2)}`;
  }
  
  return cleanCode;
}