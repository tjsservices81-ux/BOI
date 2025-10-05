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
- **Database**: Replit Database (primary storage); Drizzle ORM for PostgreSQL configuration.
- **Authentication**: Session-based with 1-year persistent cookies.
- **API**: RESTful endpoints for authentication, banking operations, and administration.
- **Security**: Device-specific one-time access codes, PIN-based authentication, session validation.

### Key Features
- **Authentication**: Device-specific one-time codes (iOS: 2 uses, Android/Other: 1 use); persistent login for 1 year; PIN-based user registration with customer number validation; Admin Panel for user management and instant access revocation.
- **Banking Operations**: Management of multiple account types (Current, Savings, Credit Cards); comprehensive transaction history with categorization; UK transfers with exchange rate calculations.
- **Offline Functionality**: 24-hour offline access with IndexedDB caching; real-time balance updates with transaction impact.
- **PWA Features**: Installable via "Add to Home Screen"; full offline support; push notifications for account alerts and transactions; native app feel with standalone display mode and custom splash screen.
- **Data Flow**: Secure user authentication flow with device validation and persistent session establishment; robust transaction processing with real-time balance updates; seamless offline synchronization with conflict resolution.
- **PDF Generation**: Comprehensive PDF statement generation system for bank statements and transfer confirmations, utilizing an authentic Bank of Ireland template image for branding, with dynamic content overlay, multi-page support, and date range filtering.
- **Validation & Enhancements**: Flexible IBAN/BIC validation for international transfers; enhanced sort code validation with identification of various UK banks (e.g., Barclays, Lloyds, TSB, NatWest, Bank of Scotland) including visual bank icons; restoration of "Secure Connection Active" status display during transfer processing.

### UI/UX Decisions
- Professional Bank of Ireland branding across the application, including the admin panel, push notifications, and generated PDFs.
- Responsive design for optimal viewing across various devices.
- Integration of accessible components via Radix UI.
- Use of specific Bank of Ireland color schemes (e.g., #1a5490) in PDF generation.
- **PWA Scroll Locking**: Comprehensive multi-layer scroll prevention during modal states and transfer processing screens. Uses JavaScript inline styles on html, body, and #root elements combined with conditional overflow control on inner scrollable containers to prevent unwanted page scrolling during processing animations in PWA mode.

## External Dependencies

- **Database/ORM**: Replit Database, Drizzle ORM (configured for PostgreSQL).
- **Backend Libraries**: Express Session for session management.
- **Frontend Libraries/Tools**: Tailwind CSS, Radix UI, React, Vite, TypeScript.
- **Client-Side Storage**: IndexedDB for offline data caching.
- **Runtime**: Node.js.