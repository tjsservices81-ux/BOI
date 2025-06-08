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
      <StatusBar barStyle="light-content" backgroundColor="#4a90a4" />
      
      {/* Full screen background with gradient overlay */}
      <ImageBackground
        source={require('./background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.gradientOverlay} />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Header with Bank of Ireland branding */}
          <View style={styles.header}>
            <Text style={styles.bankTitle}>Bank of Ireland</Text>
            <Image
              source={require('./boi_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Main content area */}
          <View style={styles.mainContent}>
            {/* Login card */}
            <View style={styles.loginCard}>
              {/* Biometric login section */}
              <View style={styles.biometricSection}>
                <Image
                  source={require('./fingerprint.png')}
                  style={styles.fingerprintIcon}
                  resizeMode="contain"
                />
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
                  <Image
                    source={require('./arrow.png')}
                    style={styles.arrowIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Alternative login options */}
              <View style={styles.divider} />
              
              <TouchableOpacity style={styles.alternativeOption}>
                <Image
                  source={require('./user.png')}
                  style={styles.optionSmallIcon}
                  resizeMode="contain"
                />
                <Text style={styles.alternativeText}>Log in with another ID</Text>
              </TouchableOpacity>

              {/* PIN and approval options */}
              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionIconWrapper}>
                  <Image
                    source={require('./dots.png')}
                    style={styles.optionIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.optionText}>Use your PIN instead</Text>
                <Text style={styles.chevronRight}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionRow}>
                <View style={styles.optionIconWrapper}>
                  <Image
                    source={require('./lock.png')}
                    style={styles.optionIcon}
                    resizeMode="contain"
                  />
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
              <Image
                source={require('./atm.png')}
                style={styles.bottomNavIcon}
                resizeMode="contain"
              />
              <Text style={styles.bottomNavText}>ATM/Branch</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomNavItem}>
              <Image
                source={require('./security.png')}
                style={styles.bottomNavIcon}
                resizeMode="contain"
              />
              <Text style={styles.bottomNavText}>Security</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bottomNavItem}>
              <Image
                source={require('./more.png')}
                style={styles.bottomNavIcon}
                resizeMode="contain"
              />
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
    backgroundColor: 'rgba(74, 144, 164, 0.8)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  bankTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
    fontFamily: 'BOI-Bold',
  },
  logoImage: {
    width: 60,
    height: 20,
    tintColor: 'white',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  fingerprintIcon: {
    width: 64,
    height: 64,
    marginBottom: 20,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    fontFamily: 'BOI-Regular',
  },
  loginButton: {
    backgroundColor: '#4a90a4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'BOI-Bold',
  },
  forgotPinContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotPinText: {
    color: '#4a90a4',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'BOI-Regular',
  },
  arrowIcon: {
    width: 12,
    height: 12,
    marginLeft: 6,
    tintColor: '#4a90a4',
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  optionIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionIcon: {
    width: 12,
    height: 12,
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