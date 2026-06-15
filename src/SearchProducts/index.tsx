import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import {BASEURL} from '../api/api';
import styles from './styles';

type SearchProductsProps = {
  navigation: any;
};

const SearchProducts = ({navigation}: SearchProductsProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const session = await EncryptedStorage.getItem('user_session');
        if (session) {
          const parsed = JSON.parse(session);
          const idValue = parsed?.data?.user_id || parsed?.data?.userId || parsed?.data?.id || parsed?.data?.user?.id;
          if (idValue) {
            setUserId(String(idValue));
            return;
          }
        }
        Alert.alert('Missing session', 'User ID not found in encrypted storage. Please login again.');
      } catch (err) {
        console.log('EncryptedStorage getItem error:', err);
        Alert.alert('Storage error', 'Unable to read user data from secure storage.');
      }
    };
    loadUserId();
  }, []);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      Alert.alert('Search required', 'Please enter a search term.');
      return;
    }

    setLoading(true);
    try {
      if (!userId) {
        Alert.alert('User required', 'User ID not available. Please login first.');
        return;
      }

      const url = `${BASEURL}/services/retailer/products-autocomplete/${userId}`;
      const form = new FormData();
      form.append('user_id', userId);
      form.append('no_stock_flag', '0');
      form.append('scheme_flag', '0');
      form.append('first_word_exact_match', '0');
      form.append('term', trimmedQuery);

      const response = await axios.post(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        console.log(data);
        setResults(Array.isArray(data) ? data : [data]);
      } else {
        const message = response.data?.message || (typeof response.data === 'string' ? response.data : JSON.stringify(response.data || {}));
        Alert.alert('Search failed', message || `Search failed with status ${response.status}`);
      }
    } catch (error: any) {
      console.log('SearchProducts error:', error);
      Alert.alert('Search error', 'Unable to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveProduct = async (item: any) => {
    try {
      const saved = await EncryptedStorage.getItem('cart_products');
      let items = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(items)) {
        items = [];
      }

      const itemId = item?.product_id || item?.id || item?.productId || item?.product_code || item?.sku;
      if (!itemId) {
        Alert.alert('Save failed', 'Product ID not found.');
        return;
      }

      const existingRetailerId = item?.retailer_id || item?.retailerId || item?.retailer?.id;
      const session = await EncryptedStorage.getItem('user_session');
      let sessionRetailerId: string | null = null;
      let sessionUserId: string | null = null;
      if (session) {
        const parsed = JSON.parse(session);
        sessionUserId = String(parsed?.data?.user_id || parsed?.data?.userId || parsed?.data?.id || parsed?.data?.user?.id || '');
        sessionRetailerId = String(parsed?.data?.retailer_id || parsed?.data?.retailerId || parsed?.data?.retailer?.id || parsed?.data?.user?.retailer_id || '');
      }

      const savedItem = {
        ...item,
        product_id: item?.product_id || item?.id || item?.productId || item?.product_code || item?.sku,
        user_id: sessionUserId || undefined,
        retailer_id: existingRetailerId || sessionRetailerId || undefined,
        quantity: item?.quantity ? String(item.quantity) : '1',
      };

      const exists = items.some((existing: any) => {
        const existingId = existing?.product_id || existing?.id || existing?.productId || existing?.product_code || existing?.sku;
        return existingId === itemId;
      });

      if (exists) {
        Alert.alert('Already added', 'This product is already saved.');
        return;
      }

      items.push(savedItem);
      await EncryptedStorage.setItem('cart_products', JSON.stringify(items));
      Alert.alert('Saved', 'Product saved to encrypted storage.');
    } catch (err) {
      console.log('EncryptedStorage setItem error:', err);
      Alert.alert('Save error', 'Unable to save this product.');
    }
  };

  const handleAddToCart = async () => {
    try {
      // await EncryptedStorage.removeItem('cart_products');
      console.log('cart_products cleared before navigating to OrderList');
    } catch (err) {
      console.log('EncryptedStorage removeItem error:', err);
    }
    navigation.navigate('OrderList');
  };

  const renderItem = ({item}: {item: any}) => {
    const title = item?.product_name || item?.name || item?.title || JSON.stringify(item);
    const subtitle = item?.sku || item?.product_code || '';
    const distributorName = item?.distributor_name || item?.distributorName || item?.distributor?.name;
    const distributorId = item?.distributor_id || item?.distributorId || item?.distributor?.id;

    return (
      <View style={styles.resultItem}>
        <View style={styles.resultRow}>
          <View style={styles.resultDetails}>
            <Text style={styles.resultTitle}>{title}</Text>
            {subtitle ? <Text style={styles.resultSubtitle}>{subtitle}</Text> : null}
            {distributorName ? <Text style={styles.resultSubtitle}>{`Distributor: ${distributorName}`}</Text> : null}
            {distributorId ? <Text style={styles.resultSubtitle}>{`Distributor ID: ${distributorId}`}</Text> : null}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => saveProduct(item)}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Products</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Enter product name"
        placeholderTextColor="#909090"
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />
      <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={loading}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Search</Text>}
      </TouchableOpacity>
      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item?.id || item?.sku || index}`}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        contentContainerStyle={styles.resultsList}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No results yet.</Text> : null}
      />
      <View style={styles.addToCartContainer}>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SearchProducts;
