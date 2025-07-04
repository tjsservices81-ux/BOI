// UK Bank Sort Code Database - Exact mapping
const sortCodeMap = {
  // High Street Banks
  "110062": "Halifax",
  "309783": "Lloyds Bank",
  "390000": "Lloyds Bank", 
  "770000": "Lloyds Bank",
  "200003": "Barclays",
  "200000": "Barclays",
  "400515": "HSBC UK",
  "400000": "HSBC UK",
  "600001": "NatWest",
  "072500": "Nationwide Building Society",
  "089299": "Co-operative Bank",
  "300083": "TSB Bank",
  "870000": "TSB Bank",
  "090128": "Santander",
  "090000": "Santander",
  
  // NatWest
  "011001": "NatWest",
  "500000": "NatWest",
  "536107": "NatWest",
  "557013": "NatWest",
  "606004": "NatWest",
  "600846": "NatWest",
  "603030": "NatWest",
  
  // Bank of Scotland
  "802000": "Bank of Scotland",
  "802260": "Bank of Scotland",
  "802045": "Bank of Scotland",
  "804635": "Bank of Scotland",
  
  // Online / Challenger Banks
  "040004": "Monzo",
  "608371": "Starling Bank",
  "230801": "Wise (Wise Payments Ltd)",
  "231470": "Wise (via ClearBank)",
  "232144": "Wise (ClearBank)",
  "230553": "Cashplus Bank",
  "239202": "Revolut",
  "232715": "Monese",
  "233114": "Tide (via ClearBank)",
  "234105": "Atom Bank",
  "234342": "Allica Bank",
  "232328": "Kroo Bank",
  "232422": "Zopa Bank"
};

export function validateUKSortCode(sortCode: string): string | null {
  if (!sortCode || sortCode.length < 6) {
    return null;
  }

  // Clean the sort code - remove any non-digits
  const cleanCode = sortCode.replace(/\D/g, '');
  
  // Must be exactly 6 digits
  if (cleanCode.length !== 6) {
    return null;
  }

  // Look up the bank name using exact match
  const bankName = sortCodeMap[cleanCode as keyof typeof sortCodeMap];
  
  return bankName || null;
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