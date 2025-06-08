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
} from 'react-native';

const LoginScreen = ({ onLogin }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a90a4" />
      
      {/* Background with gradient overlay */}
      <ImageBackground
        source={{ uri: '/background.jpg' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.gradientOverlay} />
        
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: '/boi_logo.svg' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.loginCard}>
            {/* Biometric Section */}
            <View style={styles.biometricSection}>
              <Image
                source={{ uri: '/Icons_Fingerprint.svg' }}
                style={styles.fingerprintIcon}
                resizeMode="contain"
              />
              <Text style={styles.biometricTitle}>Biometric login</Text>
            </View>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
              <Text style={styles.loginButtonText}>Log in</Text>
            </TouchableOpacity>

            {/* Forgot PIN Link */}
            <TouchableOpacity style={styles.forgotPinLink}>
              <Text style={styles.forgotPinText}>Forgot your PIN?</Text>
              <Text style={styles.arrow}> →</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Alternative Login Options */}
            <TouchableOpacity style={styles.alternativeOption}>
              <Image
                source={{ uri: '/user_icon.svg' }}
                style={styles.optionIcon}
                resizeMode="contain"
              />
              <Text style={styles.optionText}>Log in with another ID</Text>
            </TouchableOpacity>

            {/* PIN Option */}
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionEmoji}>🔐</Text>
              </View>
              <Text style={styles.optionText}>Use your PIN instead</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            {/* Approval Waiting */}
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionEmoji}>⏳</Text>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Waiting for your approval</Text>
                <Text style={styles.optionSubtext}>
                  Tap here to complete any unfinished actions
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Image
              source={{ uri: '/branch-locator.svg' }}
              style={styles.navIcon}
              resizeMode="contain"
            />
            <Text style={styles.navText}>ATM/Branch</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <Image
              source={{ uri: '/cert.svg' }}
              style={styles.navIcon}
              resizeMode="contain"
            />
            <Text style={styles.navText}>Security</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>⋯</Text>
            <Text style={styles.navText}>More</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const DashboardScreen = ({ onLogout }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a90a4" />
      
      {/* Header with gradient */}
      <View style={styles.dashboardHeader}>
        <ImageBackground
          source={{ uri: '/background.jpg' }}
          style={styles.headerBackground}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay} />
          
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Image
                source={{ uri: '/boi_logo.svg' }}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <TouchableOpacity onPress={onLogout}>
                <Text style={styles.userIcon}>👤</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Good evening John</Text>
              <Text style={styles.welcomeSubtitle}>Welcome to Bank of Ireland</Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.dashboardContent} showsVerticalScrollIndicator={false}>
        {/* Account Cards */}
        <View style={styles.accountsCard}>
          <TouchableOpacity style={styles.accountItem}>
            <View>
              <Text style={styles.accountTitle}>CURRENT ACCOUNT</Text>
              <Text style={styles.accountNumber}>-2091</Text>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountBalance}>€ 2,322.40</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.accountDivider} />

          <TouchableOpacity style={styles.accountItem}>
            <View>
              <Text style={styles.accountTitle}>CREDIT CARD</Text>
              <Text style={styles.accountNumber}>-1820</Text>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountBalance}>€2,000.00</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.accountDivider} />

          <TouchableOpacity style={styles.accountItem}>
            <View>
              <Text style={styles.accountTitle}>SAVINGS ACCOUNT</Text>
              <Text style={styles.accountNumber}>-0978</Text>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountBalance}>€7,500.00</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>€</Text>
            <Text style={styles.actionText}>Transfer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionText}>Bill Pay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.dashboardBottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Image
            source={{ uri: '/icon-footer-accounts-highlight.svg' }}
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={[styles.navText, styles.activeNavText]}>Accounts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={{ uri: '/icon-footer-payments.svg' }}
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={styles.navText}>Payments</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={{ uri: '/roi_debit_card_consumer-200px.png' }}
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={styles.navText}>Cards</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={{ uri: '/icon-footer-services.svg' }}
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={styles.navText}>Services</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={{ uri: '/icon-footer-apply.svg' }}
            style={styles.navIcon}
            resizeMode="contain"
          />
          <Text style={styles.navText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return isLoggedIn ? (
    <DashboardScreen onLogout={handleLogout} />
  ) : (
    <LoginScreen onLogin={handleLogin} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4a90a4',
  },
  backgroundImage: {
    flex: 1,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 144, 164, 0.9)',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  logo: {
    width: 120,
    height: 30,
    tintColor: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fingerprintIcon: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#4a90a4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPinLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPinText: {
    color: '#4a90a4',
    fontSize: 14,
  },
  arrow: {
    color: '#4a90a4',
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
    marginBottom: 12,
  },
  optionIcon: {
    width: 16,
    height: 16,
    marginRight: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
  optionEmoji: {
    fontSize: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: '#ccc',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    width: 20,
    height: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: '#666',
  },
  activeNavItem: {},
  activeNavText: {
    color: '#4a90a4',
  },
  // Dashboard Styles
  dashboardHeader: {
    height: 120,
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLogo: {
    width: 80,
    height: 20,
    tintColor: 'white',
  },
  userIcon: {
    fontSize: 16,
    color: 'white',
  },
  welcomeSection: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dashboardContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    marginTop: -8,
  },
  accountsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  accountTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  accountNumber: {
    fontSize: 10,
    color: '#999',
  },
  accountRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a90a4',
    marginRight: 8,
  },
  accountDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionIcon: {
    fontSize: 16,
    color: '#4a90a4',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  dashboardBottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  },
});