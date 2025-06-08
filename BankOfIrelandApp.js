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
  ScrollView,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ onLogin }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a90a4" />
      
      {/* Full screen gradient background */}
      <View style={styles.gradientBackground}>
        {/* Background image overlay */}
        <View style={styles.backgroundImageContainer}>
          <Image
            source={{ uri: 'https://via.placeholder.com/400x200/4a90a4/ffffff?text=BOI+Background' }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.backgroundOverlay} />
        </View>
        
        {/* Header with logo */}
        <View style={styles.header}>
          <Text style={styles.bankTitle}>Bank of Ireland</Text>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>BOI</Text>
          </View>
        </View>

        {/* Main login card */}
        <View style={styles.loginCardContainer}>
          <View style={styles.loginCard}>
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
            <TouchableOpacity style={styles.forgotPinContainer}>
              <Text style={styles.forgotPinText}>Forgot your PIN?</Text>
              <Text style={styles.arrow}> →</Text>
            </TouchableOpacity>

            {/* Alternative login section */}
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.alternativeLoginButton}>
              <Text style={styles.userIcon}>👤</Text>
              <Text style={styles.alternativeLoginText}>Log in with another ID</Text>
            </TouchableOpacity>

            {/* Additional options */}
            <TouchableOpacity style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionIcon}>🔐</Text>
              </View>
              <Text style={styles.optionText}>Use your PIN instead</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionIcon}>⏳</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Waiting for your approval</Text>
                <Text style={styles.optionSubtext}>Tap here to complete any unfinished actions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom navigation */}
        <View style={styles.bottomNavigation}>
          <TouchableOpacity style={styles.bottomNavItem}>
            <Text style={styles.bottomNavIcon}>🏪</Text>
            <Text style={styles.bottomNavText}>ATM/Branch</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.bottomNavItem}>
            <Text style={styles.bottomNavIcon}>🔒</Text>
            <Text style={styles.bottomNavText}>Security</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.bottomNavItem}>
            <Text style={styles.bottomNavIcon}>⋯</Text>
            <Text style={styles.bottomNavText}>More</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const DashboardScreen = ({ onLogout }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a90a4" />
      
      <View style={styles.dashboardContainer}>
        {/* Header section */}
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardHeaderContent}>
            <View style={styles.headerTopRow}>
              <Text style={styles.dashboardLogo}>BOI</Text>
              <TouchableOpacity onPress={onLogout} style={styles.profileButton}>
                <Text style={styles.profileIcon}>👤</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Good evening John</Text>
              <Text style={styles.welcomeSubtitle}>Welcome to Bank of Ireland</Text>
            </View>
          </View>
          
          {/* Background image overlay */}
          <View style={styles.headerBackgroundOverlay}>
            <Image
              source={{ uri: 'https://via.placeholder.com/400x100/2d5a6b/ffffff?text=Scenic+View' }}
              style={styles.headerBackgroundImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Main content */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          {/* Accounts section */}
          <View style={styles.accountsContainer}>
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
        </ScrollView>

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
      </View>
    </SafeAreaView>
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
    backgroundColor: '#4a90a4',
  },
  
  // Login Screen Styles
  gradientBackground: {
    flex: 1,
    backgroundColor: '#4a90a4',
  },
  backgroundImageContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 144, 164, 0.7)',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  bankTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  loginCardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  fingerprintContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fingerprintIcon: {
    fontSize: 40,
  },
  biometricTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#4a90a4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPinText: {
    color: '#4a90a4',
    fontSize: 14,
    fontWeight: '500',
  },
  arrow: {
    color: '#4a90a4',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 20,
  },
  alternativeLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  userIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  alternativeLoginText: {
    fontSize: 16,
    color: '#4a90a4',
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  optionSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: 8,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
  },
  bottomNavIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  bottomNavText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  dashboardHeaderContent: {
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
    fontSize: 16,
    fontWeight: 'bold',
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
  headerBackgroundOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    opacity: 0.3,
    zIndex: 1,
  },
  headerBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -16,
  },
  accountsContainer: {
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
    color: '#4a90a4',
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
    color: '#4a90a4',
  },
});