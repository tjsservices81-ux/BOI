import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ onLogin }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2d5a6b" />
      
      <ImageBackground
        source={require('./background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.gradientOverlay} />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Text style={styles.bankTitle}>Bank of Ireland</Text>
              <View style={styles.logoContainer}>
                <Text style={styles.logoSymbol}>◉</Text>
              </View>
            </View>
          </View>

          {/* Main content */}
          <View style={styles.mainContent}>
            {/* Main login card */}
            <View style={styles.mainLoginCard}>
              <View style={styles.biometricSection}>
                <Text style={styles.fingerprintIcon}>👆</Text>
                <Text style={styles.biometricTitle}>Biometric login</Text>
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
                <Text style={styles.loginButtonText}>Log in</Text>
              </TouchableOpacity>

              <View style={styles.forgotPinContainer}>
                <TouchableOpacity>
                  <Text style={styles.forgotPinText}>Forgot your PIN? ↗</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />
              
              <TouchableOpacity style={styles.alternativeOption}>
                <Text style={styles.userIcon}>👤</Text>
                <Text style={styles.alternativeText}>Log in with another ID</Text>
              </TouchableOpacity>
            </View>

            {/* Separate option cards */}
            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIconWrapper}>
                <Text style={styles.dotsIcon}>⋯</Text>
              </View>
              <Text style={styles.optionText}>Use your PIN instead</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIconWrapper}>
                <Text style={styles.clockIcon}>🕐</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Waiting for your approval</Text>
                <Text style={styles.optionSubtext}>Tap here to complete any unfinished actions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom navigation */}
          <View style={styles.bottomNavigation}>
            <TouchableOpacity style={styles.bottomNavItem}>
              <Text style={styles.bottomNavIcon}>📍</Text>
              <Text style={styles.bottomNavText}>ATM/Branch</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomNavItem}>
              <Text style={styles.bottomNavIcon}>🛡️</Text>
              <Text style={styles.bottomNavText}>Security</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomNavItem}>
              <Text style={styles.bottomNavIcon}>⋯</Text>
              <Text style={styles.bottomNavText}>More</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const DashboardScreen = ({ onLogout }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2d5a6b" />
      
      <SafeAreaView style={styles.dashboardContainer}>
        <View style={styles.dashboardHeader}>
          <ImageBackground
            source={require('./background.jpg')}
            style={styles.headerBackground}
            resizeMode="cover"
          >
            <View style={styles.headerOverlay} />
            
            <View style={styles.headerContent}>
              <View style={styles.headerTopRow}>
                <Text style={styles.dashboardBankTitle}>Bank of Ireland</Text>
                <TouchableOpacity onPress={onLogout} style={styles.profileButton}>
                  <Text style={styles.profileIcon}>👤</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>Good evening John</Text>
                <Text style={styles.welcomeSubtitle}>Welcome to Bank of Ireland</Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.mainDashboardContent}>
          <View style={styles.accountCard}>
            <TouchableOpacity style={styles.accountRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountTitle}>CURRENT ACCOUNT</Text>
                <Text style={styles.accountNumber}>-2091</Text>
              </View>
              <View style={styles.accountBalance}>
                <Text style={styles.balanceAmount}>€ 2,322.40</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.accountDivider} />

            <TouchableOpacity style={styles.accountRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountTitle}>CREDIT CARD</Text>
                <Text style={styles.accountNumber}>-1820</Text>
              </View>
              <View style={styles.accountBalance}>
                <Text style={styles.balanceAmount}>€2,000.00</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.accountDivider} />

            <TouchableOpacity style={styles.accountRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountTitle}>SAVINGS ACCOUNT</Text>
                <Text style={styles.accountNumber}>-0978</Text>
              </View>
              <View style={styles.accountBalance}>
                <Text style={styles.balanceAmount}>€7,500.00</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsContainer}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionIcon}>€</Text>
              <Text style={styles.quickActionText}>Transfer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionIcon}>💳</Text>
              <Text style={styles.quickActionText}>Bill Pay</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dashboardBottomNav}>
          <TouchableOpacity style={[styles.dashboardNavItem, styles.activeNavItem]}>
            <Text style={[styles.dashboardNavIcon, styles.activeNavIcon]}>🏦</Text>
            <Text style={[styles.dashboardNavText, styles.activeNavText]}>Accounts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardNavItem}>
            <Text style={styles.dashboardNavIcon}>💰</Text>
            <Text style={styles.dashboardNavText}>Payments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardNavItem}>
            <Text style={styles.dashboardNavIcon}>💳</Text>
            <Text style={styles.dashboardNavText}>Cards</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardNavItem}>
            <Text style={styles.dashboardNavIcon}>⚙️</Text>
            <Text style={styles.dashboardNavText}>Services</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dashboardNavItem}>
            <Text style={styles.dashboardNavIcon}>➕</Text>
            <Text style={styles.dashboardNavText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default function CleanBOIApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (isLoggedIn) {
    return <DashboardScreen onLogout={handleLogout} />;
  }

  return <LoginScreen onLogin={handleLogin} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d5a6b',
  },
  
  // Login Screen
  backgroundImage: {
    flex: 1,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 90, 107, 0.85)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 15,
    paddingBottom: 25,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  logoContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSymbol: {
    fontSize: 8,
    color: 'white',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Main login card
  mainLoginCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fingerprintIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  biometricTitle: {
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#2d6a75',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPinContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPinText: {
    color: '#2d6a75',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  alternativeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  userIcon: {
    fontSize: 16,
    color: '#2d6a75',
    marginRight: 8,
  },
  alternativeText: {
    fontSize: 15,
    color: '#2d6a75',
  },
  
  // Separate option cards
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dotsIcon: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  clockIcon: {
    fontSize: 14,
    color: '#666',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: '#ccc',
    marginLeft: 8,
  },
  
  // Bottom navigation
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: 'rgba(45, 90, 107, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomNavIcon: {
    fontSize: 18,
    marginBottom: 4,
    color: 'white',
  },
  bottomNavText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '500',
  },
  
  // Dashboard styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dashboardHeader: {
    height: 140,
    backgroundColor: '#2d5a6b',
  },
  headerBackground: {
    flex: 1,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 90, 107, 0.8)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dashboardBankTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 16,
    color: 'white',
  },
  welcomeSection: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mainDashboardContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -16,
    paddingBottom: 100,
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 12,
    color: '#999',
  },
  accountBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d6a75',
    marginRight: 8,
  },
  accountDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  dashboardBottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    paddingVertical: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dashboardNavItem: {
    flex: 1,
    alignItems: 'center',
  },
  dashboardNavIcon: {
    fontSize: 16,
    marginBottom: 4,
    opacity: 0.6,
  },
  dashboardNavText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  activeNavItem: {},
  activeNavIcon: {
    opacity: 1,
  },
  activeNavText: {
    color: '#2d6a75',
  },
});