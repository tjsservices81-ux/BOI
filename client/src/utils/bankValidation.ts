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
  "301342": "TSB Bank",
  "301350": "TSB Bank",
  "301352": "TSB Bank",
  "301353": "TSB Bank",
  "776836": "TSB Bank",
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

// IBAN Bank Code Database
const ibanBankCodeMap: Record<string, string> = {
  // Irish Banks (IE)
  "AIBK": "AIB (Allied Irish Banks)",
  "BOFI": "Bank of Ireland",
  "ULST": "Ulster Bank Ireland",
  "PTSB": "Permanent TSB",
  "EIRE": "EBS Ireland",
  "ULSB": "Ulster Bank",
  
  // UK Banks (GB)
  "NWBK": "NatWest",
  "BARC": "Barclays",
  "LOYD": "Lloyds Bank",
  "HBUK": "HSBC UK",
  "MIDL": "HSBC (Midland Bank)",
  "HLFX": "Halifax",
  "TSBS": "TSB Bank",
  "SPSB": "Santander",
  "NAIA": "Nationwide",
  "BOFS": "Bank of Scotland",
  "RBSS": "Royal Bank of Scotland",
  "REVO": "Revolut",
  "MONZ": "Monzo",
  "SRLG": "Starling Bank",
  
  // German Banks (DE)
  "DEUT": "Deutsche Bank",
  "COBA": "Commerzbank",
  "DRSD": "Commerzbank (Dresdner Bank)",
  "HYVE": "HypoVereinsbank",
  "BYLADEM1": "Bayern LB",
  
  // French Banks (FR)
  "BNPA": "BNP Paribas",
  "SOGEFRPP": "Société Générale",
  "CRLYFRPP": "Crédit Lyonnais",
  "AGRIFRPP": "Crédit Agricole",
  
  // Spanish Banks (ES)
  "BBVA": "BBVA",
  "BSCH": "Santander",
  "SABH": "Banco Sabadell",
  "CAIXESBB": "CaixaBank",
  
  // Dutch Banks (NL)
  "ABNA": "ABN AMRO",
  "INGB": "ING Bank",
  "RABO": "Rabobank",
  "TRIO": "Triodos Bank",
  
  // Belgian Banks (BE)
  "GEBA": "BNP Paribas Fortis",
  "KRBE": "KBC Bank",
  "CEBA": "Belfius",
  "INGA": "ING Belgium",
  
  // Italian Banks (IT)
  "UNCRITMM": "UniCredit",
  "BCITITMM": "Intesa Sanpaolo",
  "BNLIITRR": "BNL (BNP Paribas)",
  
  // Austrian Banks (AT)
  "BKAU": "Bank Austria (UniCredit)",
  "RLNW": "Raiffeisen",
  "BAWAATWW": "BAWAG",
  
  // Swiss Banks (CH)
  "UBSW": "UBS",
  "CRESCHZZ": "Credit Suisse",
  "RAIF": "Raiffeisen Switzerland"
};

export function validateIBAN(iban: string): { isValid: boolean; bankName: string | null; country: string | null } {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Basic validation - minimum 15 characters, starts with 2 letters
  if (cleanIban.length < 15 || !/^[A-Z]{2}/.test(cleanIban)) {
    return { isValid: false, bankName: null, country: null };
  }
  
  // Extract country code
  const countryCode = cleanIban.substring(0, 2);
  
  // Extract bank code (typically characters 4-8, but varies by country)
  let bankCode = '';
  let bankName: string | null = null;
  
  // Country-specific bank code extraction
  switch (countryCode) {
    case 'IE': // Ireland - chars 4-7 (4 chars)
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'GB': // UK - chars 4-7 (4 chars)
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'DE': // Germany - chars 4-11 (8 chars, but we check first 4)
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'FR': // France - chars 4-8 (5 chars, but we check first 4)
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'ES': // Spain - chars 4-7 (4 chars)
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'NL': // Netherlands - chars 4-7 (4 chars)
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'BE': // Belgium - chars 4-6 (3 chars, but we check 4)
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'IT': // Italy - chars 5-10 (check chars after X)
      bankCode = cleanIban.substring(5, 9);
      break;
    case 'AT': // Austria - chars 4-8
      bankCode = cleanIban.substring(4, 8);
      break;
    case 'CH': // Switzerland - chars 4-8
      bankCode = cleanIban.substring(4, 8);
      break;
    default:
      bankCode = cleanIban.substring(4, 8);
  }
  
  // Look up bank name
  bankName = ibanBankCodeMap[bankCode] || null;
  
  // Also try longer codes for some banks
  if (!bankName && cleanIban.length >= 12) {
    const longerCode = cleanIban.substring(4, 12);
    bankName = ibanBankCodeMap[longerCode] || null;
  }
  
  const countryNames: Record<string, string> = {
    'IE': 'Ireland',
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'IT': 'Italy',
    'AT': 'Austria',
    'CH': 'Switzerland',
    'PT': 'Portugal',
    'GR': 'Greece',
    'PL': 'Poland',
    'SE': 'Sweden',
    'DK': 'Denmark',
    'NO': 'Norway',
    'FI': 'Finland'
  };
  
  return {
    isValid: cleanIban.length >= 15 && cleanIban.length <= 34,
    bankName,
    country: countryNames[countryCode] || countryCode
  };
}

export function formatIBAN(iban: string): string {
  // Remove all spaces
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Add space every 4 characters
  return cleanIban.match(/.{1,4}/g)?.join(' ') || cleanIban;
}