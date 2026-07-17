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
  
  // TSB Bank - 87-xx-xx range. TSB also issues some 30-xx-xx and 77-xx-xx
  // codes inherited from the 2013 Lloyds/TSB split, but those specific
  // ranges are shared with Lloyds Bank branches at the individual-branch
  // level, not distinguishable by prefix alone - only TSB's own dedicated
  // 87-xx-xx range is listed here to avoid misidentifying either bank.
  { prefix: "87", bank: "TSB Bank" },

  // Co-operative Bank - 08-xx-xx range
  { prefix: "08", bank: "Co-operative Bank" },

  // Metro Bank - 23-05-xx range (23 is a shared clearing prefix used by many
  // challenger banks, so only Metro Bank's specific sub-range is mapped here)
  { prefix: "2305", bank: "Metro Bank" },

  // Virgin Money / Clydesdale Bank - 82-xx-xx range (Clydesdale rebranded to
  // Virgin Money; both names still appear on sort code records for this range)
  { prefix: "82", bank: "Virgin Money (Clydesdale Bank)" },

  // First Direct - 40-47-xx range specifically (a division of HSBC UK, but
  // with its own dedicated sub-range distinct from general HSBC UK codes)
  { prefix: "4047", bank: "First Direct" },

  // Monzo - 04-00-04 (and additional allocated codes)
  { prefix: "040004", bank: "Monzo" },
  { prefix: "040039", bank: "Monzo" },
  { prefix: "040040", bank: "Monzo" },

  // Starling Bank - 60-83-71 (and additional allocated codes)
  { prefix: "608371", bank: "Starling Bank" },
  { prefix: "608372", bank: "Starling Bank" },
  { prefix: "608373", bank: "Starling Bank" },

  // Wise (formerly TransferWise) - 23-14-70 and 23-08-01
  { prefix: "231470", bank: "Wise" },
  { prefix: "230801", bank: "Wise" },

  // Monese - 23-27-15
  { prefix: "232715", bank: "Monese" },

  // Tide - 23-31-14
  { prefix: "233114", bank: "Tide" },

  // Atom Bank - 04-40-01
  { prefix: "044001", bank: "Atom Bank" },

  // Zempler Bank (formerly Cashplus) - 08-71-99
  { prefix: "087199", bank: "Zempler Bank (formerly Cashplus)" },

  // Allica Bank - 23-43-42
  { prefix: "234342", bank: "Allica Bank" },

  // Kroo Bank - 23-23-28
  { prefix: "232328", bank: "Kroo Bank" },

  // Zopa Bank - 60-84-00
  { prefix: "608400", bank: "Zopa Bank" },

  // Triodos Bank - 16-58-xx range
  { prefix: "1658", bank: "Triodos Bank" },

  // Yorkshire Bank - 05-xx-xx range
  { prefix: "05", bank: "Yorkshire Bank" },

  // Chase UK - Specific codes
  { prefix: "609926", bank: "Chase UK" },
  { prefix: "609927", bank: "Chase UK" },
  { prefix: "609928", bank: "Chase UK" },

  // Barclaycard (part of Barclays but separate)
  { prefix: "204967", bank: "Barclaycard" },

  // M&S Bank (HSBC-operated) - 40-12-xx range
  { prefix: "4012", bank: "M&S Bank" },

  // Tesco Bank - 40-64-xx range
  { prefix: "4064", bank: "Tesco Bank" },

  // The Co-operative Bank - Additional ranges
  { prefix: "089", bank: "Co-operative Bank" },

  // Yorkshire Building Society - 60-99-xx range (except Chase specific)
  { prefix: "6099", bank: "Yorkshire Building Society" },

  // Coventry Building Society - 40-63-xx range
  { prefix: "4063", bank: "Coventry Building Society" },

  // Leeds Building Society - 08-90-xx range
  { prefix: "0890", bank: "Leeds Building Society" },

  // Principality Building Society - 20-31-xx range
  { prefix: "2031", bank: "Principality Building Society" },

  // Newcastle Building Society - 55-61-xx range
  { prefix: "5561", bank: "Newcastle Building Society" },

  // Nottingham Building Society - 60-70-xx range
  { prefix: "6070", bank: "Nottingham Building Society" },

  // Skipton Building Society - 30-97-xx range
  { prefix: "3097", bank: "Skipton Building Society" },

  // Tandem Bank - 60-83-63
  { prefix: "608363", bank: "Tandem Bank" },

  // Curve - 23-14-xx range
  { prefix: "231454", bank: "Curve" },

  // Chip Savings - 23-26-xx range
  { prefix: "232653", bank: "Chip" },

  // Modulr (payments infrastructure used by several fintechs) - 23-14-03
  { prefix: "231403", bank: "Modulr" },

  // ClearBank (payments infrastructure used by many fintechs) - 23-14-xx range
  { prefix: "2314", bank: "ClearBank" },

  // Lloyds Business Banking - 30-92-74 (subset of Lloyds' own range)
  { prefix: "309274", bank: "Lloyds Business" },

  // Ulster Bank - 98-xx-xx range
  { prefix: "98", bank: "Ulster Bank" },

  // Danske Bank - 95-xx-xx range
  { prefix: "95", bank: "Danske Bank" },

  // AIB (GB) - 23-69-40
  { prefix: "236940", bank: "AIB (GB)" },
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

// IBAN Bank Code Database - for countries whose IBAN embeds the bank's
// actual 4-letter BIC code directly in the account number (Ireland, UK,
// Netherlands). Most other SEPA countries embed a purely NUMERIC national
// bank code instead (see numericIbanBankCodes below) - an alphabetic BIC
// like "COBADEFF" never actually appears inside a real German/French/
// Spanish/Italian IBAN, so those countries must be looked up differently.
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
  "CHAS": "Chase UK",
  "CPBK": "Co-operative Bank",

  // Dutch Banks (NL)
  "ABNA": "ABN AMRO",
  "INGB": "ING Bank",
  "RABO": "Rabobank",
  "TRIO": "Triodos Bank",
  "SNSB": "SNS Bank (de Volksbank)",
  "ASNB": "ASN Bank",
  "RBRB": "RegioBank",
  "BUNQ": "bunq",
  "KNAB": "Knab",
  "MOYO": "Moneyou (ABN AMRO)",

  // Romanian Banks (RO) - Romania also embeds a real 4-letter BIC directly
  "RNCB": "Banca Comercială Română (BCR)",
  "BRDE": "BRD (Groupe Société Générale)",
  "BTRL": "Banca Transilvania",
  "CECE": "CEC Bank",
  "RZBR": "Raiffeisen Bank Romania",
  "BACX": "UniCredit Bank Romania",

  // Bulgarian Banks (BG) - Bulgaria also embeds a real 4-letter BIC directly
  "UNCR": "UniCredit Bulbank",
};

// Numeric national bank codes, keyed by country then by the exact digit
// string as it appears in the IBAN. Germany/France/Spain/Italy (and most
// other SEPA countries) identify the bank with a number, not a BIC, so this
// is the only way to recognise them. Coverage here is necessarily partial -
// each of these countries has thousands of individual bank/branch codes -
// but includes the major, most commonly encountered banks.
const numericIbanBankCodes: Record<string, Record<string, string>> = {
  DE: {
    "37040044": "Deutsche Bank",
    "50040000": "Commerzbank",
  },
  FR: {
    "30004": "BNP Paribas",
    "30003": "Société Générale",
    "30006": "Crédit Agricole",
    "30002": "LCL (Crédit Lyonnais)",
    "20041": "La Banque Postale",
  },
  ES: {
    "0049": "Santander",
    "0182": "BBVA",
    "2100": "CaixaBank",
    "0128": "Bankinter",
    "0081": "Banco Sabadell",
    "1465": "ING Spain",
    "0073": "Openbank",
    "0019": "Deutsche Bank Spain",
  },
  IT: {
    "02008": "UniCredit",
    "03069": "Intesa Sanpaolo",
  },
  BE: {
    "734": "KBC Bank",
    "363": "ING Belgium",
  },
  PL: {
    "1020": "PKO Bank Polski",
    "1140": "mBank",
    "1090": "Santander Bank Polska",
    "1240": "Bank Pekao",
    "1050": "ING Bank Śląski",
  },
  PT: {
    "0035": "Caixa Geral de Depósitos",
    "0018": "Santander Totta",
    "0033": "Millennium BCP",
    "0010": "Banco BPI",
    "0007": "Novo Banco",
  },
  DK: {
    "3000": "Danske Bank",
  },
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
  let bankName: string | null = null;

  // Ireland, the UK, the Netherlands, Romania and Bulgaria embed the bank's
  // actual 4-letter BIC code directly after the check digits
  // (e.g. GB29 NWBK ... -> NWBK).
  if (countryCode === 'IE' || countryCode === 'GB' || countryCode === 'NL' || countryCode === 'RO' || countryCode === 'BG') {
    const bicCode = cleanIban.substring(4, 8);
    bankName = ibanBankCodeMap[bicCode] || null;
  } else {
    // Most other SEPA countries embed a purely numeric national bank code
    // instead, at a country-specific position/length.
    let numericCode = '';
    switch (countryCode) {
      case 'DE': // Germany - 8-digit Bankleitzahl at position 4-11
        numericCode = cleanIban.substring(4, 12);
        break;
      case 'FR': // France - 5-digit code banque at position 4-8
        numericCode = cleanIban.substring(4, 9);
        break;
      case 'ES': // Spain - 4-digit entity code at position 4-7
        numericCode = cleanIban.substring(4, 8);
        break;
      case 'IT': // Italy - 5-digit ABI code at position 5-9 (after 1-letter CIN)
        numericCode = cleanIban.substring(5, 10);
        break;
      case 'BE': // Belgium - 3-digit bank code at position 4-6
        numericCode = cleanIban.substring(4, 7);
        break;
      case 'PL': // Poland - 4-digit bank code at position 4-7 (of an 8-digit segment)
        numericCode = cleanIban.substring(4, 8);
        break;
      case 'PT': // Portugal - 4-digit bank code at position 4-7
        numericCode = cleanIban.substring(4, 8);
        break;
      case 'DK': // Denmark - 4-digit registration number at position 4-7
        numericCode = cleanIban.substring(4, 8);
        break;
    }
    if (numericCode) {
      bankName = numericIbanBankCodes[countryCode]?.[numericCode] || null;
    }
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
    'FI': 'Finland',
    'LU': 'Luxembourg',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'SK': 'Slovakia',
    'CY': 'Cyprus',
    'MT': 'Malta',
    'EE': 'Estonia',
    'LV': 'Latvia',
    'LT': 'Lithuania',
    'IS': 'Iceland',
    'LI': 'Liechtenstein',
    'MC': 'Monaco',
    'SM': 'San Marino',
    'AD': 'Andorra',
    'VA': 'Vatican City'
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
