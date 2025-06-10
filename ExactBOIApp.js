import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
} from 'react-native';

const LoginScreen = ({ onLogin }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4a6b75" />
      
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Bank of Ireland Header */}
          <View style={styles.header}>
            <Text style={styles.bankTitle}>Bank of Ireland</Text>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>○</Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* White Login Card */}
            <View style={styles.loginCard}>
              {/* Fingerprint Section */}
              <View style={styles.fingerprintSection}>
                <View style={styles.fingerprintCircle}>
                  <Text style={styles.fingerprintIcon}>⚬</Text>
                  <View style={styles.fingerprintLines}>
                    <View style={styles.line1} />
                    <View style={styles.line2} />
                    <View style={styles.line3} />
                  </View>
                </View>
                <Text style={styles.biometricText}>Biometric login</Text>
              </View>

              {/* Log in Button */}
              <TouchableOpacity style={styles.loginBtn} onPress={onLogin}>
                <Text style={styles.loginBtnText}>Log in</Text>
              </TouchableOpacity>

              {/* Forgot PIN */}
              <TouchableOpacity style={styles.forgotPin}>
                <Text style={styles.forgotPinText}>Forgot your PIN? </Text>
                <Text style={styles.arrow}>↗</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Another ID Option */}
              <TouchableOpacity style={styles.anotherIdBtn}>
                <Text style={styles.personIcon}>👤</Text>
                <Text style={styles.anotherIdText}>Log in with another ID</Text>
              </TouchableOpacity>
            </View>

            {/* PIN Option Card */}
            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIconCircle}>
                <Text style={styles.dotsIcon}>⋯</Text>
              </View>
              <Text style={styles.optionText}>Use your PIN instead</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            {/* Approval Option Card */}
            <TouchableOpacity style={styles.optionCard}>
              <View style={styles.optionIconCircle}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <View style={styles.optionTextArea}>
                <Text style={styles.optionText}>Waiting for your approval</Text>
                <Text style={styles.optionSubtext}>Tap here to complete any unfinished actions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navBtn}>
              <Text style={styles.navIcon}>📍</Text>
              <Text style={styles.navText}>ATM/Branch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn}>
              <Text style={styles.navIcon}>🛡</Text>
              <Text style={styles.navText}>Security</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn}>
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
      <SafeAreaView style={styles.dashboardSafe}>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>← Back to Login</Text>
        </TouchableOpacity>
        
        <View style={styles.dashboardContent}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
          <Text style={styles.welcomeText}>Welcome to Bank of Ireland</Text>
          
          <View style={styles.accountsCard}>
            <Text style={styles.accountTitle}>Your Accounts</Text>
            
            <View style={styles.accountItem}>
              <Text style={styles.accountName}>Current Account</Text>
              <Text style={styles.accountBalance}>€2,322.40</Text>
            </View>
            
            <View style={styles.accountItem}>
              <Text style={styles.accountName}>Savings Account</Text>
              <Text style={styles.accountBalance}>€7,500.00</Text>
            </View>
            
            <View style={styles.accountItem}>
              <Text style={styles.accountName}>Credit Card</Text>
              <Text style={styles.accountBalance}>€2,000.00</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default function ExactBOIApp() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (loggedIn) {
    return <DashboardScreen onLogout={() => setLoggedIn(false)} />;
  }

  return <LoginScreen onLogin={() => setLoggedIn(true)} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4a6b75',
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 107, 117, 0.8)',
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
  logoCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 8,
  },
  
  // Content
  content: {
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Fingerprint
  fingerprintSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  fingerprintCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  fingerprintIcon: {
    fontSize: 32,
    color: '#333',
  },
  fingerprintLines: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  line1: {
    position: 'absolute',
    top: 10,
    left: 15,
    width: 10,
    height: 1,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  line2: {
    position: 'absolute',
    top: 20,
    left: 10,
    width: 20,
    height: 1,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  line3: {
    position: 'absolute',
    top: 30,
    left: 15,
    width: 10,
    height: 1,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  biometricText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  
  // Login Button
  loginBtn: {
    backgroundColor: '#4a6b75',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginBtnText: {
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
  arrow: {
    color: '#4a6b75',
    fontSize: 14,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  
  // Another ID
  anotherIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  personIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#4a6b75',
  },
  anotherIdText: {
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
  optionIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dotsIcon: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  lockIcon: {
    fontSize: 10,
    color: '#666',
  },
  optionTextArea: {
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
  bottomNav: {
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
  navBtn: {
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
  
  // Dashboard
  dashboardSafe: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  logoutBtn: {
    padding: 20,
  },
  logoutText: {
    fontSize: 16,
    color: '#4a6b75',
  },
  dashboardContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  accountsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountName: {
    fontSize: 16,
    color: '#333',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a6b75',
  },
});