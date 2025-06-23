# Bank of Ireland Mobile Banking Application

## Overview

This is a comprehensive mobile banking application built as a Progressive Web App (PWA) mimicking the Bank of Ireland mobile banking experience. The application features a React-based frontend with TypeScript, an Express.js backend with Node.js, and implements sophisticated authentication and access control systems.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6 for client-side navigation
- **State Management**: React Context API with custom hooks
- **UI Framework**: Custom CSS with mobile-first responsive design
- **PWA Configuration**: Custom service worker with offline capabilities
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Session Management**: Express-session with custom configuration
- **Database**: Replit Database for persistent storage with file-based fallback
- **Authentication**: Device-specific access code system with usage limits
- **External Services**: Twilio integration for SMS notifications

### Progressive Web App Features
- **Dynamic Manifest**: Customized app manifest based on access codes
- **Service Worker**: Custom offline functionality and caching
- **Installation**: Native app-like installation on mobile devices
- **Standalone Mode**: Launches as standalone application without browser UI

## Key Components

### Access Code System
The application implements a sophisticated device-specific access control mechanism:
- **iOS Devices**: 2 uses per access code (iPhone/iPad detection)
- **Non-iOS Devices**: 1 use per access code
- **Code Format**: BOI followed by 6 random digits (e.g., BOI968736)
- **Usage Tracking**: Real-time monitoring of code consumption
- **Revocation Support**: Instant access revocation capabilities

### Authentication Flow
1. **Access Code Entry**: Users enter BOI-format access codes
2. **Device Detection**: System identifies device type for usage limits
3. **Code Validation**: Verifies code availability and usage limits
4. **Session Creation**: Establishes persistent user sessions
5. **Heartbeat Monitoring**: Maintains session activity with regular pings

### User Management
- **Customer Registration**: Multi-step registration with validation
- **Profile Management**: Personal information and settings
- **Account Linking**: Multiple bank account management
- **Transaction History**: Comprehensive transaction tracking

### Banking Features
- **Account Overview**: Balance display and account summaries
- **Transaction Management**: Add, edit, and categorize transactions
- **Transfer System**: Internal and external transfer capabilities
- **Payment Processing**: Bill payments and recurring payments
- **Card Management**: Credit/debit card administration

## Data Flow

### Client-Side Data Flow
1. **Authentication State**: Managed through React Context
2. **Local Storage**: Persistent user data and session information
3. **Session Storage**: Temporary application state
4. **API Communication**: RESTful endpoints with JSON data exchange

### Server-Side Data Flow
1. **Request Processing**: Express middleware for authentication and validation
2. **Database Operations**: Replit Database with JSON storage format
3. **Session Management**: Server-side session persistence
4. **External API Integration**: Twilio for SMS services

### Data Persistence Strategy
- **Primary Storage**: Replit Database for cloud persistence
- **Fallback Storage**: Local file system for reliability
- **Client Storage**: localStorage and sessionStorage for user experience
- **Session Backup**: Multiple storage locations for session recovery

## External Dependencies

### Backend Dependencies
- **express**: Web application framework
- **express-session**: Session management middleware
- **@replit/database**: Cloud database service
- **twilio**: SMS notification service
- **cors**: Cross-origin resource sharing
- **body-parser**: Request body parsing

### Frontend Dependencies
- **react**: Core React library
- **react-dom**: React DOM rendering
- **react-router-dom**: Client-side routing
- **typescript**: Type safety and development tooling
- **vite**: Build tool and development server

### Development Dependencies
- **@types/react**: TypeScript definitions for React
- **@types/node**: Node.js type definitions
- **@vitejs/plugin-react**: Vite React plugin

## Deployment Strategy

### Development Environment
- **Platform**: Replit cloud development environment
- **Port Configuration**: Server runs on port 5000
- **Live Reload**: Automatic reloading during development
- **Database**: Replit Database with instant synchronization

### Production Configuration
- **Build Process**: Vite production build with optimization
- **Static Assets**: Served through Express static middleware
- **Environment Variables**: Secure configuration management
- **PWA Deployment**: Manifest and service worker configuration

### Scalability Considerations
- **Database Sharding**: Access codes and user data separation
- **Session Clustering**: Distributed session management capability
- **CDN Integration**: Static asset delivery optimization
- **Load Balancing**: Multiple instance deployment support

## Changelog

- June 23, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.