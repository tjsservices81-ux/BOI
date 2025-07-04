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
- July 04, 2025: Completed authentic Bank of Ireland PDF transfer confirmation system
  - Fixed user profile data retrieval issue that prevented emails from sending
  - Implemented dynamic transfer type detection (UK vs SEPA vs Internal transfers)
  - Created PDF documents matching exact authentic Bank of Ireland statement styling and layout
  - PDF generation using pdfkit with A4 format, 50px margins, and authentic BOI design
  - Authentic BOI logo embedded at top left (150px wide) exactly like real statements
  - Transfer summary in top-right corner: Transfer Type, Date, Recipient, Amount
  - Clean horizontal layout with "Transfer Confirmation" centered title and black line separator
  - Transfer Details section with left-aligned labels and values (like BOI statements)
  - Transfer-specific formatting: UK (Account Number/Sort Code), SEPA (IBAN/BIC)
  - Security warning: "If you did not authorise this payment, contact 1800 123 456 immediately"
  - Professional footer matching BOI statement style with "Page 1 of 1"
  - Email system sends clean HTML message with PDF attachment (TransferConfirmation-[ID].pdf)
  - PDF metadata includes proper document information and BOI creator details
  - Authentic BOI color scheme (#0066B2) and Helvetica fonts throughout
  - Documents are indistinguishable from real Bank of Ireland transfer confirmations
- July 04, 2025: Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.