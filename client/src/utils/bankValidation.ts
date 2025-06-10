// UK Bank Sort Code Database with ranges
export const ukBankRanges = [
  // Monzo Bank - All 04 codes (040000-049999)
  { start: '040000', end: '049999', bank: 'Monzo Bank' },
  
  // Royal Bank of Scotland
  { start: '830000', end: '839999', bank: 'Royal Bank of Scotland' },
  
  // Barclays Bank
  { start: '200000', end: '209999', bank: 'Barclays Bank' },
  
  // HSBC Bank
  { start: '400000', end: '404699', bank: 'HSBC Bank' },
  { start: '404800', end: '409999', bank: 'HSBC Bank' },
  
  // First Direct (HSBC subsidiary)
  { start: '404700', end: '404799', bank: 'First Direct' },
  
  // Lloyds Bank
  { start: '300000', end: '309599', bank: 'Lloyds Bank' },
  { start: '309700', end: '309999', bank: 'Lloyds Bank' },
  
  // TSB Bank (formerly part of Lloyds)
  { start: '309600', end: '309699', bank: 'TSB Bank' },
  { start: '777100', end: '779999', bank: 'TSB Bank' },
  
  // National Westminster Bank (NatWest)
  { start: '600000', end: '608299', bank: 'National Westminster Bank' },
  { start: '608400', end: '609999', bank: 'National Westminster Bank' },
  
  // Ulster Bank (RBS subsidiary)
  { start: '608300', end: '608349', bank: 'Ulster Bank' },
  
  // Starling Bank
  { start: '608350', end: '608399', bank: 'Starling Bank' },
  { start: '236900', end: '236949', bank: 'Starling Bank' },
  
  // Santander UK
  { start: '090100', end: '090199', bank: 'Santander UK' },
  { start: '720000', end: '729999', bank: 'Santander UK' },
  
  // Halifax (Lloyds subsidiary)
  { start: '110000', end: '119999', bank: 'Halifax' },
  
  // Bank of Scotland (Lloyds subsidiary)
  { start: '120100', end: '129999', bank: 'Bank of Scotland' },
  { start: '800000', end: '809999', bank: 'Bank of Scotland' },
  
  // Nationwide Building Society
  { start: '070000', end: '079999', bank: 'Nationwide Building Society' },
  
  // Co-operative Bank
  { start: '089000', end: '089999', bank: 'Co-operative Bank' },
  
  // Revolut
  { start: '231400', end: '231499', bank: 'Revolut' },
  
  // Metro Bank
  { start: '230500', end: '230599', bank: 'Metro Bank' },
  
  // Virgin Money
  { start: '826200', end: '826299', bank: 'Virgin Money' },
  { start: '051500', end: '051599', bank: 'Virgin Money' },
  
  // Tesco Bank
  { start: '772000', end: '772099', bank: 'Tesco Bank' },
  
  // Yorkshire Bank
  { start: '055000', end: '059999', bank: 'Yorkshire Bank' },
  
  // Bank of Ireland UK
  { start: '902100', end: '902199', bank: 'Bank of Ireland (UK)' },
  { start: '904800', end: '904899', bank: 'Bank of Ireland (UK)' },
  
  // Danske Bank (Northern Ireland)
  { start: '950000', end: '959999', bank: 'Danske Bank (Northern Ireland)' },
  
  // First Trust Bank (Northern Ireland)
  { start: '930000', end: '939999', bank: 'First Trust Bank (Northern Ireland)' },
  
  // Atom Bank
  { start: '608380', end: '608389', bank: 'Atom Bank' },
  
  // Aldermore Bank
  { start: '234800', end: '234899', bank: 'Aldermore Bank' },
  
  // Shawbrook Bank
  { start: '234600', end: '234699', bank: 'Shawbrook Bank' },
  
  // OakNorth Bank
  { start: '236100', end: '236199', bank: 'OakNorth Bank' },
  
  // ClearBank
  { start: '235700', end: '235799', bank: 'ClearBank' },
  
  // Tide
  { start: '236950', end: '236999', bank: 'Tide' },
  
  // Cashplus Bank
  { start: '088700', end: '088799', bank: 'Cashplus Bank' },
  
  // Modulr Finance
  { start: '235600', end: '235699', bank: 'Modulr Finance' }
];

export function validateUKSortCode(sortCode: string): string | null {
  if (!sortCode || sortCode.length < 4) {
    return null;
  }

  // Clean and pad the sort code
  const cleanCode = sortCode.replace(/\D/g, '').padEnd(6, '0');
  
  if (cleanCode.length < 6) {
    return null;
  }

  // Check against ranges
  for (const range of ukBankRanges) {
    if (cleanCode >= range.start && cleanCode <= range.end) {
      return range.bank;
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