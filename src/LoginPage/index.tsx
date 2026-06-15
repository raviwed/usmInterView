import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import styles from './styles';
import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';

type LoginPageProps = {
  navigation: any;
};

const LoginPage = ({navigation}: LoginPageProps) => {
  const [fieldId, setFieldId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await EncryptedStorage.getItem('user_session');
        if (session) {
          navigation.replace('Home');
        }
      } catch (err) {
        console.log('EncryptedStorage getItem error:', err);
      }
    };
    checkSession();
  }, [navigation]);

  const handleLogin = async () => {
    const trimmedFieldId = fieldId.trim();
    const trimmedPassword = password.trim();

    if (!trimmedFieldId || !trimmedPassword) {
      Alert.alert('Login required', 'Please fill in Field ID and Password.');
      return;
    }

    const payload = {
      field: trimmedFieldId,
      password: trimmedPassword,
    };

    console.log('LOGIN payload:', payload);
    setLoading(true);

    try {
      const url = 'http://137.59.201.246/~spikeuat/testing/test/api/services/profile/login';
      const form = new FormData();
      form.append('field', trimmedFieldId);
      form.append('password', trimmedPassword);

      const response = await axios.post(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true, // handle non-2xx ourselves
      });

      const status = response.status;
      const contentTypeRaw = (response.headers && (response.headers['content-type'] || response.headers['Content-Type'])) || '';
      const contentType = typeof contentTypeRaw === 'string' ? contentTypeRaw : String(contentTypeRaw);
      let data: any = response.data;

      if (typeof data === 'string') {
        // server returned text/html (like a 404 HTML page) or plain text
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.log('Failed to parse JSON response string:', e);
          }
        } else {
          console.log('Login response is not JSON:', data.substring ? data.substring(0, 800) : data);
        }
      }

      if (status >= 200 && status < 300) {
        try {
          await EncryptedStorage.setItem('user_session', JSON.stringify(data || {}));
        } catch (esErr) {
          console.log('EncryptedStorage setItem error:', esErr);
        }

        navigation.reset({
          index: 0,
          routes: [{name: 'Home'}],
        });
        Alert.alert('Login successful', 'Your login request completed successfully.');
      } else {
        const message = data?.message || (typeof data === 'string' ? data : JSON.stringify(data || {}));
        Alert.alert('Login failed', message || `Login failed with status ${status}`);
      }
    } catch (error: any) {
      const message = error?.message || 'Unable to reach the login service. Please try again later.';
      console.log('Login request error:', error);
      Alert.alert('Network error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Page</Text>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Field ID</Text>
          <TextInput
            style={styles.input}
            value={fieldId}
            onChangeText={setFieldId}
            placeholder="Field ID"
            placeholderTextColor="#909090"
            autoCapitalize="none"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#909090"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default LoginPage;
