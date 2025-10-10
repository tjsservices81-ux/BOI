// UK Bank Sort Code Prefix Ranges - Comprehensive mapping
const sortCodePrefixes: { prefix: string; bank: string }[] = [
  // Barclays - 20-xx-xx range
  { prefix: "20", bank: "Barclays" },
  
  // HSBC UK - 40-xx-xx range
  { prefix: "40", bank: "HSBC UK" },
  
  // NatWest - Multiple ranges
  { prefix: "01", bank: "NatWest" },
  { prefix: "50", bank: "NatWest" },
  { prefix: "51", bank: "NatWest" },
  { prefix: "52", bank: "NatWest" },
  { prefix: "53", bank: "NatWest" },
  { prefix: "54", bank: "NatWest" },
  { prefix: "55", bank: "NatWest" },
  { prefix: "56", bank: "NatWest" },
  { prefix: "57", bank: "NatWest" },
  { prefix: "58", bank: "NatWest" },
  { prefix: "59", bank: "NatWest" },
  { prefix: "60", bank: "NatWest" },
  { prefix: "61", bank: "NatWest" },
  
  // Lloyds Bank - Multiple ranges
  { prefix: "30", bank: "Lloyds Bank" },
  { prefix: "77", bank: "Lloyds Bank" },
  
  // Halifax - 11-xx-xx range
  { prefix: "11", bank: "Halifax" },
  
  // Bank of Scotland - 80-xx-xx, 81-xx-xx ranges
  { prefix: "80", bank: "Bank of Scotland" },
  { prefix: "81", bank: "Bank of Scotland" },
  
  // Royal Bank of Scotland - 83-xx-xx range
  { prefix: "83", bank: "Royal Bank of Scotland" },
  
  // Santander - 09-xx-xx range
  { prefix: "09", bank: "Santander" },
  
  // Nationwide Building Society - 07-xx-xx range
  { prefix: "07", bank: "Nationwide Building Society" },
  
  // TSB Bank - Multiple ranges
  { prefix: "30", bank: "TSB Bank" },
  { prefix: "87", bank: "TSB Bank" },
  
  // Co-operative Bank - 08-xx-xx range
  { prefix: "08", bank: "Co-operative Bank" },
  
  // Metro Bank - 23-xx-xx range
  { prefix: "23", bank: "Metro Bank" },
  
  // Virgin Money - 82-xx-xx range
  { prefix: "82", bank: "Virgin Money" },
  
  // First Direct - 40-xx-xx range (HSBC)
  { prefix: "40", bank: "First Direct" },
  
  // Monzo - 04-00-04
  { prefix: "040004", bank: "Monzo" },
  
  // Starling Bank - 60-83-71
  { prefix: "608371", bank: "Starling Bank" },
  
  // Revolut - 23-92-02
  { prefix: "239202", bank: "Revolut" },
  
  // Wise - Multiple ranges
  { prefix: "231470", bank: "Wise" },
  { prefix: "232144", bank: "Wise" },
  { prefix: "230801", bank: "Wise" },
  
  // Monese - 23-27-15
  { prefix: "232715", bank: "Monese" },
  
  // Tide - 23-31-14
  { prefix: "233114", bank: "Tide" },
  
  // Atom Bank - 23-41-05
  { prefix: "234105", bank: "Atom Bank" },
  
  // Cashplus Bank - 23-05-53
  { prefix: "230553", bank: "Cashplus Bank" },
  
  // Allica Bank - 23-43-42
  { prefix: "234342", bank: "Allica Bank" },
  
  // Kroo Bank - 23-23-28
  { prefix: "232328", bank: "Kroo Bank" },
  
  // Zopa Bank - 23-24-22
  { prefix: "232422", bank: "Zopa Bank" },
  
  // Triodos Bank - 16-58-xx range
  { prefix: "1658", bank: "Triodos Bank" },
  
  // Clydesdale Bank - 82-xx-xx range
  { prefix: "82", bank: "Clydesdale Bank" },
  
  // Yorkshire Bank - 05-xx-xx range
  { prefix: "05", bank: "Yorkshire Bank" },
];

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

  // Match by prefix (longest match first for specificity)
  // Sort by prefix length descending to match specific codes before general prefixes
  const sortedPrefixes = [...sortCodePrefixes].sort((a, b) => b.prefix.length - a.prefix.length);
  
  for (const { prefix, bank } of sortedPrefixes) {
    if (cleanCode.startsWith(prefix)) {
      return bank;
    }
  }
  
  return null;
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
