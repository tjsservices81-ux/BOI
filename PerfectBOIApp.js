import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  ImageBackground,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ onLogin }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2d5a6b" />
      
      {/* Full screen background with scenic image */}
      <ImageBackground
        source={require('./background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.gradientOverlay} />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Header with Bank of Ireland branding */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <Text style={styles.bankTitle}>Bank of Ireland</Text>
              <View style={styles.logoContainer}>
                <Text style={styles.logoSymbol}>⚪</Text>
              </View>
            </View>
          </View>

          {/* Main content area */}
          <View style={styles.mainContent}>
            {/* Main login card */}
            <View style={styles.mainLoginCard}>
              {/* Biometric login section */}
              <View style={styles.biometricSection}>
                <View style={styles.fingerprintContainer}>
                  <Text style={styles.fingerprintIcon}>👆</Text>
                </View>
                <Text style={styles.biometricTitle}>Biometric login</Text>
              </View>

              {/* Primary login button */}
              <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
                <Text style={styles.loginButtonText}>Log in</Text>
              </TouchableOpacity>

              {/* Forgot PIN link */}
              <View style={styles.forgotPinContainer}>
                <TouchableOpacity style={styles.forgotPinButton}>
                  <Text style={styles.forgotPinText}>Forgot your PIN?</Text>
                  <Text style={styles.arrowText}> ↗</Text>
                </TouchableOpacity>
              </View>

              {/* Alternative login option */}
              <View style={styles.divider} />
              
              <TouchableOpacity style={styles.alternativeOption}>
                <Text style={styles.userIcon}>👤</Text>
                <Text style={styles.alternativeText}>Log in with another ID</Text>
              </TouchableOpacity>
            </View>

            {/* Separate smaller cards for PIN and approval options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.smallOptionCard}>
                <View style={styles.optionIconWrapper}>
                  <Text style={styles.dotsIcon}>⋯</Text>
                </View>
                <Text style={styles.optionText}>Use your PIN instead</Text>
                <Text style={styles.chevronRight}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.smallOptionCard}>
                <View style={styles.optionIconWrapper}>
                  <Text style={styles.clockIcon}>🕐</Text>
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionText}>Waiting for your approval</Text>
                  <Text style={styles.optionSubtext}>Tap here to complete any unfinished actions</Text>
                </View>
                <Text style={styles.chevronRight}>›</Text>
              </TouchableOpacity>
            </View>
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
      <StatusBar barStyle="light-content" backgroundColor="#4a90a4" />
      
      <SafeAreaView style={styles.dashboardContainer}>
        {/* Header section */}
        <View style={styles.dashboardHeader}>
          <ImageBackground
            source={require('./background.jpg')}
            style={styles.headerBackground}
            resizeMode="cover"
          >
            <View style={styles.headerOverlay} />
            
            <View style={styles.headerContent}>
              <View style={styles.headerTopRow}>
                <Image
                  source={require('./boi_logo.png')}
                  style={styles.dashboardLogo}
                  resizeMode="contain"
                />
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

        {/* Main content */}
        <View style={styles.mainDashboardContent}>
          {/* Accounts section */}
          <View style={styles.accountCard}>
            <TouchableOpacity style={styles.accountRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountTitle}>CURRENT ACCOUNT</Text>
                <Text style={styles.accountNumber}>-2091</Text>
              </View>
              <View style={styles.accountBalance}>
                <Text style={styles.balanceAmount}>€ 2,322.40</Text>
                <Text style={styles.chevronRight}>›</Text>
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
                <Text style={styles.chevronRight}>›</Text>
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
                <Text style={styles.chevronRight}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick actions */}
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

        {/* Bottom navigation */}
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

export default function PerfectBOIApp() {
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
    backgroundColor: '#4a90a4',
  },
  
  // Login Screen Styles
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
    fontFamily: 'System',
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
  mainLoginCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  optionsContainer: {
    marginHorizontal: 8,
  },
  smallOptionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fingerprintContainer: {
    marginBottom: 16,
  },
  fingerprintIcon: {
    fontSize: 48,
    color: '#333',
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    fontFamily: 'System',
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
    fontFamily: 'System',
  },
  forgotPinContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotPinText: {
    color: '#2d6a75',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'System',
  },
  arrowText: {
    color: '#2d6a75',
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 18,
  },
  alternativeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  optionSmallIcon: {
    width: 16,
    height: 16,
    marginRight: 12,
    tintColor: '#4a90a4',
  },
  alternativeText: {
    fontSize: 15,
    color: '#4a90a4',
    fontWeight: '500',
    fontFamily: 'BOI-Regular',
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
  userIcon: {
    fontSize: 16,
    color: '#2d6a75',
    marginRight: 8,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    fontFamily: 'BOI-Regular',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'BOI-Regular',
  },
  chevronRight: {
    fontSize: 18,
    color: '#ccc',
    marginLeft: 8,
  },
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
    width: 20,
    height: 20,
    marginBottom: 6,
    tintColor: 'white',
  },
  bottomNavText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '500',
    fontFamily: 'BOI-Regular',
  },
  
  // Dashboard Screen Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dashboardHeader: {
    height: 140,
    backgroundColor: '#4a90a4',
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    flex: 1,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 144, 164, 0.8)',
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
  dashboardLogo: {
    width: 80,
    height: 20,
    tintColor: 'white',
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
    fontFamily: 'BOI-Bold',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'BOI-Regular',
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    fontFamily: 'BOI-Bold',
  },
  accountNumber: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'BOI-Regular',
  },
  accountBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a90a4',
    marginRight: 8,
    fontFamily: 'BOI-Bold',
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
    fontFamily: 'BOI-Bold',
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
    fontFamily: 'BOI-Regular',
  },
  activeNavItem: {},
  activeNavIcon: {
    opacity: 1,
  },
  activeNavText: {
    color: '#4a90a4',
  },
});