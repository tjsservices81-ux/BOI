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

const FingerprintIcon = () => (
  <View style={styles.fingerprintIcon}>
    <View style={styles.fingerprintCenter} />
    <View style={[styles.fingerprintRing, styles.ring1]} />
    <View style={[styles.fingerprintRing, styles.ring2]} />
    <View style={[styles.fingerprintRing, styles.ring3]} />
  </View>
);

const LoginScreen = ({ onLogin }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6b75" />
      
      <ImageBackground
        source={require('./background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.bankTitle}>Bank of Ireland</Text>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle} />
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Main Login Card */}
            <View style={styles.loginCard}>
              <View style={styles.biometricSection}>
                <FingerprintIcon />
                <Text style={styles.biometricTitle}>Biometric login</Text>
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
                <Text style={styles.loginButtonText}>Log in</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotPin}>
                <Text style={styles.forgotPinText}>Forgot your PIN? </Text>
                <Text style={styles.arrowIcon}>↗</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.alternativeLogin}>
                <View style={styles.personIconContainer}>
                  <Text style={styles.personIcon}>👤</Text>
                </View>
                <Text style={styles.alternativeLoginText}>Log in with another ID</Text>
              </TouchableOpacity>
            </View>

            {/* PIN Option Card */}
            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.dotsIcon}>⋯⋯⋯</Text>
              </View>
              <Text style={styles.optionText}>Use your PIN instead</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            {/* Approval Option Card */}
            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Waiting for your approval</Text>
                <Text style={styles.optionSubtext}>Tap here to complete any unfinished actions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Navigation */}
          <View style={styles.bottomNavigation}>
            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navIcon}>📍</Text>
              <Text style={styles.navText}>ATM/Branch</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navIcon}>🛡️</Text>
              <Text style={styles.navText}>Security</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navItem}>
              <Text style={styles.navIcon}>⋯</Text>
              <Text style={styles.navText}>More</Text>
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
      <StatusBar barStyle="light-content" backgroundColor="#4a6b75" />
      
      <SafeAreaView style={styles.dashboardContainer}>
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <ImageBackground
            source={require('./background.jpg')}
            style={styles.headerBackground}
            resizeMode="cover"
          >
            <View style={styles.headerOverlay} />
            
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
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

        {/* Main Dashboard Content */}
        <View style={styles.dashboardContent}>
          <View style={styles.accountsCard}>
            <TouchableOpacity style={styles.accountRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountType}>CURRENT ACCOUNT</Text>
                <Text style={styles.accountNumber}>-2091</Text>
              </View>
              <View style={styles.accountBalanceContainer}>
                <Text style={styles.accountBalance}>€ 2,322.40</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.accountDivider} />

            <TouchableOpacity style={styles.accountRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountType}>CREDIT CARD</Text>
                <Text style={styles.accountNumber}>-1820</Text>
              </View>
              <View style={styles.accountBalanceContainer}>
                <Text style={styles.accountBalance}>€2,000.00</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.accountDivider} />

            <TouchableOpacity style={styles.accountRow}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountType}>SAVINGS ACCOUNT</Text>
                <Text style={styles.accountNumber}>-0978</Text>
              </View>
              <View style={styles.accountBalanceContainer}>
                <Text style={styles.accountBalance}>€7,500.00</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
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

        {/* Dashboard Bottom Navigation */}
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

export default function BankOfIrelandApp() {
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
    backgroundColor: '#4a6b75',
  },
  
  // Background
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 107, 117, 0.75)',
  },
  safeArea: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  bankTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  
  // Main Content
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingBottom: 120,
  },
  
  // Login Card
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Biometric Section
  biometricSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  fingerprintIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  fingerprintCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    position: 'absolute',
  },
  fingerprintRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 50,
  },
  ring1: {
    width: 20,
    height: 20,
    top: 20,
    left: 20,
  },
  ring2: {
    width: 35,
    height: 35,
    top: 12.5,
    left: 12.5,
  },
  ring3: {
    width: 50,
    height: 50,
    top: 5,
    left: 5,
  },
  biometricTitle: {
    fontSize: 17,
    color: '#333',
    fontWeight: '400',
  },
  
  // Login Button
  loginButton: {
    backgroundColor: '#4a6b75',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Forgot PIN
  forgotPin: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPinText: {
    color: '#4a6b75',
    fontSize: 14,
  },
  arrowIcon: {
    color: '#4a6b75',
    fontSize: 14,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  
  // Alternative Login
  alternativeLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  personIconContainer: {
    marginRight: 8,
  },
  personIcon: {
    fontSize: 16,
    color: '#4a6b75',
  },
  alternativeLoginText: {
    color: '#4a6b75',
    fontSize: 15,
  },
  
  // Option Cards
  optionCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  optionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dotsIcon: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  lockIcon: {
    fontSize: 10,
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
  
  // Bottom Navigation
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 107, 117, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  navText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '500',
  },
  
  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  dashboardHeader: {
    height: 140,
    backgroundColor: '#4a6b75',
  },
  headerBackground: {
    flex: 1,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 107, 117, 0.8)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 2,
  },
  headerTop: {
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
  dashboardContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -16,
    paddingBottom: 100,
  },
  accountsCard: {
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
  accountType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 12,
    color: '#999',
  },
  accountBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a6b75',
    marginRight: 8,
  },
  accountDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
  },
  quickActions: {
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
    color: '#4a6b75',
  },
});