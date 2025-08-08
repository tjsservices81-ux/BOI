import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function AccessCodeScreen() {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    // Check if user already has valid access
    checkExistingAccess();
  }, []);

  const checkExistingAccess = async () => {
    try {
      const storedAccess = await SecureStore.getItemAsync('accessGranted');
      const storedCode = await SecureStore.getItemAsync('accessCode');
      
      if (storedAccess === 'true' && storedCode) {
        router.replace('/dashboard');
      }
    } catch (error) {
      console.log('No existing access found');
    }
  };

  const validateAccessCode = async () => {
    if (!accessCode.trim()) {
      Alert.alert('Error', 'Please enter an access code');
      return;
    }

    setIsLoading(true);

    try {
      // Replace with your actual backend URL
      const response = await fetch('http://localhost:5000/api/validate-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: accessCode }),
      });

      const result = await response.json();

      if (result.success) {
        // Store access credentials securely
        await SecureStore.setItemAsync('accessGranted', 'true');
        await SecureStore.setItemAsync('accessCode', accessCode);
        
        // Navigate to authentication
        router.replace('/auth');
      } else {
        Alert.alert('Invalid Code', result.message || 'Please check your access code and try again');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to validate access code. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Bank of Ireland Branding */}
      <View style={styles.header}>
        <Image 
          source={require('../assets/boi-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Mobile Banking</Text>
        <Text style={styles.subtitle}>Secure Access Required</Text>
      </View>

      {/* Access Code Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Enter Access Code</Text>
        <TextInput
          style={styles.input}
          value={accessCode}
          onChangeText={setAccessCode}
          placeholder="BOI######"
          placeholderTextColor="#8E8E93"
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          returnKeyType="done"
          onSubmitEditing={validateAccessCode}
        />
        
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={validateAccessCode}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#1a5490', '#2d6ab4']}
            style={styles.gradient}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Validating...' : 'Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Security Notice */}
      <View style={styles.footer}>
        <Text style={styles.securityText}>
          This app is protected by Bank of Ireland security protocols
        </Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'space-between',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a5490',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
  },
  button: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 10,
    color: '#999',
  },
});