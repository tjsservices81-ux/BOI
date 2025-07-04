# Bank of Ireland Mobile Banking Application - BOI Mobile

## Overview
This is a comprehensive mobile banking application built as a Progressive Web App (PWA) that provides a complete banking experience for Bank of Ireland customers. The application features device-specific access control, persistent authentication, comprehensive transaction management, and robust offline functionality.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom UI components
- **State Management**: React Context API with persistent localStorage
- **PWA Features**: Service Worker for offline functionality, Custom manifest for app-like experience
- **Device Detection**: User-agent based device categorization for access control

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: Replit Database for primary storage with optional Drizzle ORM configuration
- **Authentication**: Session-based with persistent cookies (1-year duration)
- **API Design**: RESTful endpoints for authentication, banking operations, and admin functions
- **Security**: Device-specific access codes, PIN-based authentication, session validation

## Key Components

### Authentication System
- **Access Control**: Device-specific one-time codes (iOS: 2 uses, Android/Other: 1 use)
- **Session Management**: Persistent login system with 1-year duration
- **User Registration**: PIN-based authentication with customer number validation
- **Admin Panel**: User management with instant access revocation capabilities

### Banking Features
- **Account Management**: Multiple account types (Current, Savings, Credit Cards)
- **Transaction System**: Comprehensive transaction history with categorization
- **Transfer System**: UK transfers with exchange rate calculations
- **Offline Mode**: 24-hour offline access with IndexedDB caching
- **Balance Tracking**: Real-time balance updates with transaction impact

### Progressive Web App Features
- **Installation**: Add to home screen functionality on iOS and Android
- **Offline Support**: Complete banking functionality without internet connection
- **Push Notifications**: Account alerts and transaction notifications
- **Native App Feel**: Standalone display mode with custom splash screen

## Data Flow

### User Authentication Flow
1. User accesses application with device-specific access code
2. System validates code against device limits and usage tracking
3. User registers/logs in with customer number and PIN
4. Session established with persistent storage across multiple layers
5. Banking data cached locally for offline access

### Transaction Processing Flow
1. User initiates transaction through UI
2. Transaction validated against account balance and limits
3. Transaction recorded in local storage and database
4. Account balance updated in real-time
5. Transaction history synchronized across all storage layers

### Offline Synchronization Flow
1. User actions cached locally when offline
2. Service worker serves cached content for UI consistency
3. Upon reconnection, cached data synchronized with server
4. Conflict resolution for concurrent offline modifications

## External Dependencies

### Third-Party Services
- **Replit Database**: Primary data storage for user accounts and access codes
- **Drizzle ORM**: Database abstraction layer (configured for PostgreSQL)
- **Express Session**: Session management with persistent cookies
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Radix UI**: Accessible component library for complex UI elements

### Runtime Dependencies
- **Node.js**: Server runtime environment
- **TypeScript**: Type safety and development experience
- **Vite**: Frontend build tool and development server
- **React**: UI library with hooks and context
- **IndexedDB**: Client-side database for offline storage

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server on port 3000, Express server on port 5000
- **Hot Reload**: Automatic code updates during development
- **Database**: Replit Database for persistent storage
- **Testing**: Comprehensive diagnostic scripts for all system components

### Production Deployment
- **Build Process**: Vite production build with TypeScript compilation
- **Static Assets**: Served directly by Express server
- **Service Worker**: Cached assets and offline functionality
- **Session Storage**: Persistent across browser restarts and app updates
- **Security**: HTTPS required for PWA installation and service worker functionality

## Changelog
- July 04, 2025: SORT CODE ENHANCEMENT - Added Bank of Scotland sort codes to validation system
  - Added sort codes: 80-20-00, 80-22-60, 80-20-45, 80-46-35
  - Updated both bankValidation.ts and knownSortCodes in uk-transfer.tsx
  - Bank of Scotland now properly identified during UK transfers with these specific sort codes
  - Includes general "80" prefix recognition for all Bank of Scotland sort codes
- July 04, 2025: VALIDATION IMPROVEMENT - Made IBAN and BIC validation flexible for international transfers
  - Removed strict formatting requirements for IBAN and BIC codes
  - Users can now enter any format without validation errors
  - Improved user experience for international SEPA transfers
- July 04, 2025: CHAT PROFESSIONALISM - Updated live chat agents for professional banking communication
  - All banking queries now use professional language while maintaining agent personalities
  - Standardized responses for transfers, card issues, and account information
  - Maintained individual agent character traits for non-banking conversations
- July 04, 2025: FEATURE RESTORATION - Restored "Secure Connection Active" status display during transfer processing
  - Restored secure connection indicator with green pulsing dot and description
  - Added to both UK Transfer and IBAN Transfer processing screens
  - Shows "Your transfer is being processed through Bank of Ireland's secure payment network with 256-bit encryption"
  - Displays during transfer progress animation (78% Complete screen)
  - Maintains professional Bank of Ireland branding and security messaging
- July 04, 2025: MAJOR ARCHITECTURAL CHANGE - Replaced PDF generation with template-based system
  - Completely rebuilt PDF generation service using user-provided Bank of Ireland template image
  - Template-based approach: Uses IMG_1972_1751639044089.png as full-page A4 background (595x842 points)
  - Content overlay system: Transfer details overlaid on authentic BOI template ensuring perfect branding
  - PDF size increased to ~260KB (from ~5KB) confirming full template embedding with authentic logo
  - Template path: attached_assets/IMG_1972_1751639044089.png embedded at document coordinates (0,0)
  - Eliminated all PNG transparency issues by using complete template image as base
  - Bank of Ireland logo now guaranteed visible as part of the template background
  - Professional content positioning: Transfer details positioned over template at precise coordinates
  - Two-column layout maintained with proper spacing and BOI color scheme (#1a5490)
  - All transfer types supported: UK transfers (Account/Sort Code), SEPA transfers (IBAN/BIC)
  - Security warnings and footer maintained with original authentic BOI styling
  - Email integration unchanged: PDF attached as TransferConfirmation-[ID].pdf
  - Template fallback system: Simple BOI header if template file unavailable
- July 04, 2025: CRITICAL FIX - Resolved PNG transparency issue in PDF logo embedding (SUPERSEDED)
- July 04, 2025: Completed official Bank of Ireland PDF transfer confirmation system (SUPERSEDED)
- July 04, 2025: Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.