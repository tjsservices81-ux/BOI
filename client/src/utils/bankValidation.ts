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
  
  // Chase UK - Specific codes
  { prefix: "609926", bank: "Chase UK" },
  { prefix: "609927", bank: "Chase UK" },
  { prefix: "609928", bank: "Chase UK" },
  
  // Barclaycard (part of Barclays but separate)
  { prefix: "204967", bank: "Barclaycard" },
  
  // American Express Banking - UK
  { prefix: "232857", bank: "American Express" },
  
  // M&S Bank - 30-91-xx range
  { prefix: "3091", bank: "M&S Bank" },
  
  // Tesco Bank - 30-96-xx range
  { prefix: "3096", bank: "Tesco Bank" },
  
  // The Co-operative Bank - Additional ranges
  { prefix: "089", bank: "Co-operative Bank" },
  
  // Yorkshire Building Society - 60-99-xx range (except Chase specific)
  { prefix: "6099", bank: "Yorkshire Building Society" },
  
  // Coventry Building Society - 40-30-xx range
  { prefix: "4030", bank: "Coventry Building Society" },
  
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
  
  // Apple Bank / Goldman Sachs - 23-69-xx range
  { prefix: "236926", bank: "Apple Bank (Goldman Sachs)" },
  
  // Curve - 23-14-xx range
  { prefix: "231454", bank: "Curve" },
  
  // Chip Savings - 23-26-xx range
  { prefix: "232653", bank: "Chip" },
  
  // Tandem Bank - 23-14-xx range
  { prefix: "231428", bank: "Tandem Bank" },
  
  // Modulr - 23-14-xx range
  { prefix: "231403", bank: "Modulr" },
  
  // ClearBank (used by many fintechs) - 23-14-xx range
  { prefix: "2314", bank: "ClearBank" },
  
  // Lloyds Business Banking - 30-xx-xx range (subset)
  { prefix: "309274", bank: "Lloyds Business" },
  
  // Ulster Bank - 98-xx-xx range
  { prefix: "98", bank: "Ulster Bank" },
  
  // Danske Bank - 95-xx-xx range
  { prefix: "95", bank: "Danske Bank" },
  
  // AIB (GB) - 23-69-xx range
  { prefix: "236940", bank: "AIB (GB)" },
  
  // Starling Bank (additional codes)
  { prefix: "608372", bank: "Starling Bank" },
  { prefix: "608373", bank: "Starling Bank" },
  
  // Monzo (additional codes)
  { prefix: "040039", bank: "Monzo" },
  { prefix: "040040", bank: "Monzo" },
  
  // N26 - 23-14-xx range
  { prefix: "231448", bank: "N26" },
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
  "CHAS": "Chase UK",
  "CPBK": "Co-operative Bank",
  
  // German Banks (DE)
  "DEUT": "Deutsche Bank",
  "DEUTDE": "Deutsche Bank",
  "DEUTDEFF": "Deutsche Bank",
  "COBADEFF": "Commerzbank",
  "COBA": "Commerzbank",
  "DRSD": "Commerzbank (Dresdner Bank)",
  "DRESDEFF": "Commerzbank (Dresdner Bank)",
  "HYVEDEMM": "HypoVereinsbank (UniCredit)",
  "HYVE": "HypoVereinsbank",
  "BYLADEM1": "Bayerische Landesbank",
  "MARKDEF1": "Bundesbank",
  "SOLADEST": "Landesbank Baden-Württemberg",
  "WELADED1": "Landesbank Hessen-Thüringen",
  "NOLADE21": "Nord/LB Norddeutsche Landesbank",
  "WELADE3L": "Helaba Landesbank Hessen-Thüringen",
  "PBNKDEFF": "Postbank (Deutsche Bank)",
  "ESSEDE5F": "Santander Consumer Bank",
  "GENODE51": "DZ Bank",
  "GENODEFF": "DZ Bank",
  "GENODEF1": "Volksbanken Raiffeisenbanken",
  "VBRSDE33": "Volksbank",
  "DGPBDEFF": "DG HYP (Deutsche Genossenschafts-Hypothekenbank)",
  "N26DEFF": "N26 Bank",
  
  // French Banks (FR)
  "BNPA": "BNP Paribas",
  "BNPAFRPP": "BNP Paribas",
  "SOGEFRPP": "Société Générale",
  "CRLYFRPP": "Crédit Lyonnais (LCL)",
  "AGRIFRPP": "Crédit Agricole",
  "CEPAFRPP": "Banque Populaire",
  "CMCIFRPP": "Crédit Mutuel",
  "CCFRFRPP": "HSBC France",
  "PSSTFRPP": "La Banque Postale",
  "BDFEFRPP": "Banque de France",
  "CAIXFRPP": "CaixaBank France",
  "NATXFRPP": "Natixis",
  "BFCMFRPP": "Banque Fédérative du Crédit Mutuel",
  "CCHQFRPP": "Crédit Coopératif",
  "CMCIFR2A": "CIC (Crédit Industriel et Commercial)",
  "ILADFRPP": "Caisse d'Épargne",
  "TRIOFRPP": "Triodos Bank France",
  "REVOLT21": "Revolut France",
  
  // Spanish Banks (ES)
  "BBVA": "BBVA",
  "BBVAESMM": "BBVA",
  "BSCH": "Santander",
  "BSCHESMM": "Santander Spain",
  "SABH": "Banco Sabadell",
  "SABADELL": "Banco Sabadell",
  "CAIXESBB": "CaixaBank",
  "CAIXESBBXXX": "CaixaBank",
  "POPUESMM": "Banco Popular",
  "INGDESMM": "ING Spain",
  "OPENESMM": "Openbank (Santander)",
  
  // Dutch Banks (NL)
  "ABNA": "ABN AMRO",
  "ABNANL2A": "ABN AMRO",
  "INGB": "ING Bank",
  "INGBNL2A": "ING Netherlands",
  "RABO": "Rabobank",
  "RABONL2U": "Rabobank",
  "TRIO": "Triodos Bank",
  "TRIONL2U": "Triodos Bank Netherlands",
  "SNSBNL2A": "SNS Bank (de Volksbank)",
  "ASNBNL21": "ASN Bank",
  "RBRBNL21": "RegioBank",
  "BUNQNL2A": "bunq",
  "KNABNL2H": "Knab",
  "MOYONL21": "Moneyou (ABN AMRO)",
  
  // Swiss Banks (CH)
  "UBSW": "UBS",
  "UBSWCHZH": "UBS Switzerland",
  "CRESCHZZ": "Credit Suisse",
  "CRESCHZ8": "Credit Suisse",
  "RAIF": "Raiffeisen Switzerland",
  "RAIFCH22": "Raiffeisen Schweiz",
  "ZKBKCHZZ": "Zürcher Kantonalbank",
  "POFICHBE": "PostFinance",
  "BCVLCH2L": "Banque Cantonale Vaudoise",
  "BPCVCH21": "Banque Cantonale de Genève",
  "LUKBCH2L": "Luzerner Kantonalbank",
  "MIGRCHZZ": "Migros Bank",
  "HYPLCH22": "Hypothekarbank Lenzburg",
  "RBABCH22": "Basler Kantonalbank",
  
  // Belgian Banks (BE)
  "GEBA": "BNP Paribas Fortis",
  "GEBABEBB": "BNP Paribas Fortis",
  "KRBE": "KBC Bank",
  "KREDBEBB": "KBC Bank Belgium",
  "CEBA": "Belfius",
  "GKCCBEBB": "Belfius Bank",
  "INGA": "ING Belgium",
  "BBRUBEBB": "ING Belgium",
  "AXABBE22": "AXA Bank Belgium",
  "ARSPBE22": "Argenta",
  "VDSPBE91": "Vdk Bank",
  
  // Italian Banks (IT)
  "UNCRITMM": "UniCredit",
  "BCITITMM": "Intesa Sanpaolo",
  "BNLIITRR": "BNL (BNP Paribas)",
  "BLOPIT22": "Banca Popolare di Milano",
  "BPPIITRRXXX": "Banca Popolare",
  
  // Austrian Banks (AT)
  "BKAU": "Bank Austria (UniCredit)",
  "BKAUATWW": "Bank Austria",
  "RLNW": "Raiffeisen",
  "RLNWATWW": "Raiffeisen Landesbank",
  "BAWAATWW": "BAWAG",
  "OPSKATWW": "Erste Bank",
  "GIBAATWW": "Erste Group Bank",
  
  // Portuguese Banks (PT)
  "CGDIPTPL": "Caixa Geral de Depósitos",
  "BCOMPTPL": "Millennium BCP",
  "BNIFPTPL": "BNI Europa",
  "BBPIPTPL": "Banco BPI",
  
  // Polish Banks (PL)
  "PKOPPLPW": "PKO Bank Polski",
  "WBKPPLPP": "Santander Bank Polska",
  "BPKOPLPW": "Bank Pekao",
  "INGBPLPW": "ING Bank Śląski",
  "ALBPPLPW": "Alior Bank"
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
  
  // Look up bank name - try multiple code lengths for better matching
  // Try 8 characters first (full BIC codes like DEUTDEFF)
  if (cleanIban.length >= 12) {
    const code8 = cleanIban.substring(4, 12);
    bankName = ibanBankCodeMap[code8] || null;
  }
  
  // Try 6 characters (like DEUTDE)
  if (!bankName && cleanIban.length >= 10) {
    const code6 = cleanIban.substring(4, 10);
    bankName = ibanBankCodeMap[code6] || null;
  }
  
  // Try 4 characters (standard BIC like DEUT, BNPA)
  if (!bankName) {
    bankName = ibanBankCodeMap[bankCode] || null;
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
