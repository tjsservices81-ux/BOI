# Bank of Ireland Mobile Banking Application - BOI Mobile

## Overview
This project is a comprehensive mobile banking application, implemented as a Progressive Web App (PWA), designed to offer a full banking experience for Bank of Ireland customers. Its primary purpose is to provide secure and convenient access to banking services, featuring device-specific access control, persistent authentication, extensive transaction management, and robust offline capabilities. The application aims to deliver a high-quality, app-like user experience on web platforms, expanding Bank of Ireland's digital reach and enhancing customer engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript.
- **Build Tool**: Vite.
- **Styling**: Tailwind CSS with custom components.
- **State Management**: React Context API, persisted via localStorage.
- **PWA**: Service Worker for offline functionality; custom manifest for an app-like experience; device detection via user-agent for access control.

### Backend
- **Runtime**: Node.js with Express.js.
- **Database**: Replit Database (primary storage); PostgreSQL for customers table and session store; Drizzle ORM for PostgreSQL configuration.
- **Authentication**: Session-based with 1-year persistent cookies; PostgreSQL session store with connect-pg-simple for reliable session persistence.
- **API**: RESTful endpoints for authentication, banking operations, and administration.
- **Security**: Device-specific one-time access codes, PIN-based authentication, session validation; automatic logout within 15 seconds when customer is deleted from admin panel; per-user data isolation (localStorage stores only authenticated user's data, not all customers); secure `/api/users/me` endpoint requires authentication before returning user data.

### Key Features
- **Authentication**: Device-specific one-time codes (iOS: 2 uses, Android/Other: 1 use); persistent login for 1 year; PIN-based user registration with customer number validation; Admin Panel for user management with OTC code display (codes shown ONLY in admin oversight interface at `/admin-oversight` with PIN protection 270309200207, live countdown timers, auto-refresh every 5 seconds, NO EMAIL SENDING); instant access revocation with automatic logout within 15 seconds; Face ID/biometric authentication with WebAuthn passkey integration (saved as "BOI Customer Login"); post-OTC verification alert prompts explaining device ID system and requesting location (for ATMs) and notification permissions.
- **Admin Oversight Features**: Admin-only name/alias field for internal customer notes (saved only to admin oversight); App replacement selector (0-5 scale) for tracking customer app replacement status; Both fields are database-persisted and editable directly in the admin interface; Location tracking with small map thumbnails in customer dropdown showing last known location, clickable to view larger map modal; Developer account separation with toggle to filter between real customers and developer test accounts (isDeveloper flag in database); visual indicators showing account type (Developer/Real Customer) with toggle button to mark/unmark accounts as developers via API endpoint; Real-time search functionality to filter customers by alias name; Automatic sorting of customers by customer number (ascending order, smallest first); Safe index-based HTML element IDs (c0, c1, c2...) to prevent deletion bugs while maintaining correct customer number mapping for API calls.
- **Device Detection & Security**: Automatic device change detection system that prevents data transfer between devices; generates unique device ID on first load; clears all local storage (localStorage, sessionStorage, IndexedDB, service worker caches) if app is opened on a new device (e.g., after iPhone restore/data transfer); ensures app always starts fresh on new devices to prevent customer data leakage.
- **Banking Operations**: Management of multiple account types (Current, Savings, Credit Cards); comprehensive transaction history with categorization; UK transfers with exchange rate calculations.
- **Offline Functionality**: 24-hour offline access with IndexedDB caching; real-time balance updates with transaction impact.
- **PWA Features**: Installable via "Add to Home Screen"; full offline support; push notifications for account alerts and transactions; native app feel with standalone display mode and custom splash screen.
- **Data Flow**: Secure user authentication flow with device validation and persistent session establishment; robust transaction processing with real-time balance updates; seamless offline synchronization with conflict resolution.
- **PDF Generation**: Comprehensive PDF statement generation system for bank statements and transfer confirmations, utilizing an authentic Bank of Ireland template image for branding, with dynamic content overlay, multi-page support, and date range filtering; statement generation UI with success state showing Open/Share/Save quick actions (Share uses Web Share API for mobile devices).
- **Settings & Preferences**: User-controlled notification and email settings that properly gate email/notification sending; toggles for enabling/disabling transfer confirmations, bank statement emails, and push notifications; "Show Transfer Confirmation" toggle in Customer Panel (Profile > Customer Panel) to hide/show the "Open Transfer Confirmation" button on transaction details modals (excludes custom transactions).
- **Validation & Enhancements**: Comprehensive IBAN/BIC validation for international transfers with 80+ European banks (Germany: Deutsche Bank, Commerzbank, HypoVereinsbank, Postbank, DZ Bank, N26, Landesbanken; France: BNP Paribas, Société Générale, Crédit Agricole, Crédit Mutuel, La Banque Postale, Caisse d'Épargne; Switzerland: UBS, Credit Suisse, Raiffeisen, PostFinance, Cantonal Banks; Netherlands: ABN AMRO, ING, Rabobank, Triodos, bunq, SNS Bank); displays bank name when detected (prioritized) with country as secondary info; comprehensive prefix-based sort code validation system covering 60+ UK banks including major banks (Barclays, HSBC, NatWest, Lloyds, Halifax, Bank of Scotland, Royal Bank of Scotland, Santander, Nationwide), retail banks (Tesco Bank, M&S Bank), digital/challenger banks (Chase UK, Monzo, Starling, Revolut, Wise, N26, Curve, Chip, Tandem, Atom, Zopa, Kroo, Tide), building societies (Yorkshire, Coventry, Leeds, Principality, Newcastle, Nottingham, Skipton), and others (Ulster Bank, Danske Bank, American Express, Apple Bank/Goldman Sachs, Barclaycard, ClearBank, AIB GB, Modulr) with proper prefix ranges and visual bank icons; restoration of "Secure Connection Active" status display during transfer processing.

### UI/UX Decisions
- Professional Bank of Ireland branding across the application, including the admin panel, push notifications, and generated PDFs.
- Responsive design for optimal viewing across various devices.
- Integration of accessible components via Radix UI.
- Use of specific Bank of Ireland color schemes (e.g., #1a5490) in PDF generation.

## External Dependencies

- **Database/ORM**: Replit Database, Drizzle ORM (configured for PostgreSQL).
- **Backend Libraries**: Express Session for session management.
- **Frontend Libraries/Tools**: Tailwind CSS, Radix UI, React, Vite, TypeScript.
- **Client-Side Storage**: IndexedDB for offline data caching.
- **Runtime**: Node.js.