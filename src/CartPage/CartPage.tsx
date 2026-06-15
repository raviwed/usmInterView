import React, {useEffect, useState, useCallback, useLayoutEffect} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import {BASEURL} from '../api/api';
import styles from './styles';

type CartPageProps = {
  navigation: any;
};

const CartPage = ({navigation}: CartPageProps) => {
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [distributorProducts, setDistributorProducts] = useState<any[]>([]);
  const [reviewData, setReviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [firstCartDistributorId, setFirstCartDistributorId] = useState<string | null>(null);

  const parseRetailerId = (rawRetailerValue: any) => {
    if (typeof rawRetailerValue === 'string' || typeof rawRetailerValue === 'number') {
      return String(rawRetailerValue);
    }

    if (rawRetailerValue && typeof rawRetailerValue === 'object') {
      return String(
        rawRetailerValue?.retailer_id ||
        rawRetailerValue?.id ||
        rawRetailerValue?.retailerId ||
        rawRetailerValue?.distributor_id ||
        rawRetailerValue?.distributorId ||
        '',
      );
    }

    return null;
  };

  const handlePlaceOrder = useCallback(async () => {
    if (placingOrder) {
      return;
    }

    if (!userId) {
      Alert.alert('Missing data', 'User ID is missing. Please try again later.');
      return;
    }

    setPlacingOrder(true);
    try {
      const session = await EncryptedStorage.getItem('user_session');
      const parsedSession = session ? JSON.parse(session) : null;
      const rawRetailerValue = parsedSession?.data?.retailer_id || parsedSession?.data?.retailerId || parsedSession?.data?.retailer || parsedSession?.data?.user?.retailer_id;
      const retailerIdFromRaw = parseRetailerId(rawRetailerValue);
      const tokenApi = parsedSession?.data?.api_token;
      
      if (!retailerIdFromRaw) {
        Alert.alert('Missing data', 'Retailer ID is missing. Please try again later.');
        return;
      }

      if (!firstCartDistributorId) {
        Alert.alert('Missing data', 'Distributor ID is missing. Please try again later.');
        return;
      }

      // console.log(retailerIdFromRaw, userId, tokenApi, firstCartDistributorId, '<---userId, retailerId, tokenApi, distId--->');
      const url = `${BASEURL}/services/retailer/place-all-orders/${retailerIdFromRaw}?user_id=${userId}&api_token=${tokenApi}&dist_checked=${firstCartDistributorId}`;
      console.log(url);

      const response = await axios.post(url, {}, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('Place order success', response.data);
        navigation.navigate('Home');
        await EncryptedStorage.removeItem('cart_products');
      } else {
        console.log('Place order failed', response.status, response.data);
        Alert.alert('Order failed', response.data?.message || `Status ${response.status}`);
      }
    } catch (err: any) {
      console.log('Place order error', err?.response?.data || err.message || err);
      Alert.alert('Order error', 'Unable to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  }, [navigation, placingOrder, firstCartDistributorId, retailerId, userId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handlePlaceOrder}
          disabled={placingOrder}
        >
          <Text style={styles.headerButtonText}>{placingOrder ? 'Placing...' : 'Place Order'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handlePlaceOrder, placingOrder]);

  useEffect(() => {
    loadCartReview();
  }, []);

  const loadCartReview = async () => {
    setLoading(true);
    try {
      const savedCart = await EncryptedStorage.getItem('cart_products');
      const session = await EncryptedStorage.getItem('user_session');
      const items = savedCart ? JSON.parse(savedCart) : [];
      const parsedSession = session ? JSON.parse(session) : null;
      const idValue = parsedSession?.data?.user_id || parsedSession?.data?.userId || parsedSession?.data?.id || parsedSession?.data?.user?.id;
      const rawRetailerValue = parsedSession?.data?.retailer_id || parsedSession?.data?.retailerId || parsedSession?.data?.retailer || parsedSession?.data?.user?.retailer_id;
      const retailerIdFromRaw = parseRetailerId(rawRetailerValue);

      // console.log(parsedSession,items,"<--parsedSession--->")
      const cartItems = Array.isArray(items) ? items : [];
      const firstDistId = cartItems[0]?.distributor_id || cartItems[0]?.distributorId || cartItems[0]?.distributor?.id || cartItems[0]?.distributor?.distributor_id;
      const distributorId = firstDistId ? String(firstDistId) : parsedSession?.data?.distributor_id ? String(parsedSession.data.distributor_id) : parsedSession?.data?.distributorId ? String(parsedSession.data.distributorId) : null;
      
      setSavedItems(cartItems);
      setUserId(idValue ? String(idValue) : null);
      setRetailerId(retailerIdFromRaw);
      setFirstCartDistributorId(firstDistId ? String(firstDistId) : null);

      if (!idValue || !retailerIdFromRaw || !distributorId) {
        Alert.alert('Missing session', 'Unable to load retailer or distributor ID from secure storage.');
        setReviewData([]);
        setDistributorProducts([]);
        return;
      }

      // console.log({retailerIdFromRaw, distributorId, items: cartItems, parsedSession}, "<---cartAdded--->")
      const url = `${BASEURL}/services/retailer/cart/review/${retailerIdFromRaw}/${distributorId}?page=1&user_id=${idValue}`;
      const form = new FormData();
      form.append('page', '1');
      form.append('user_id', String(idValue));

      const response = await axios.post(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true,
      });

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        const products = Array.isArray(data?.distributor_products) ? data.distributor_products : [];
        setDistributorProducts(products);
        setReviewData(Array.isArray(data) ? data : [data]);
      } else {
        console.log('Cart review failed:', response.data);
        Alert.alert('Review failed', response.data?.message || `Status ${response.status}`);
        setReviewData([]);
      }
    } catch (err: any) {
      console.log('CartPage error:', err);
      Alert.alert('Review error', 'Unable to load cart review data.');
      setReviewData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderReviewItem = ({item}: {item: any}) => {
    const title = item?.product_name || item?.name || item?.title || `Item ${item?.product_id || item?.id || ''}`;
    const subtitle = item?.sku || item?.product_code || item?.category || '';
    const details = Object.entries(item || {}).filter(([key]) => key !== 'product_name' && key !== 'name' && key !== 'title');

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        {details.map(([key, value]) => (
          <Text key={key} style={styles.cardText}>
            {`${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`}
          </Text>
        ))}
      </View>
    );
  };

  const renderSavedItem = ({item}: {item: any}) => {
    const title = item?.name || item?.product_name || item?.title || `Item ${item?.product_id || item?.id || ''}`;
    return (
      <View style={styles.savedCard}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>Product ID: {item?.product_id || item?.id || item?.productId}</Text>
        {item?.quantity ? <Text style={styles.cardText}>Quantity: {String(item.quantity)}</Text> : null}
        {item?.rate ? <Text style={styles.cardText}>Rate: {String(item.rate)}</Text> : null}
        {item?.total ? <Text style={styles.cardText}>Total: {String(item.total)}</Text> : null}
        {item?.distributor_name ? <Text style={styles.cardText}>Distributor: {item.distributor_name}</Text> : null}
        {item?.distributor_id ? <Text style={styles.cardText}>Distributor ID: {String(item.distributor_id)}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cart Review</Text>
      <Text style={styles.subtitle}>Review response from backend and saved cart items.</Text>
      {loading ? <ActivityIndicator size="large" color="#6fb8ff" style={styles.loading} /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distributor Products</Text>
        <FlatList
          data={distributorProducts}
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
          keyExtractor={(item, index) => `${item?.product_id || item?.id || item?.productId || item?.distributor_id || index}`}
          renderItem={renderSavedItem}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No distributor items available.</Text> : null}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Review Data</Text>
        <FlatList
          data={reviewData}
          keyExtractor={(item, index) => `${item?.product_id || item?.id || item?.productId || index}`}
          renderItem={renderReviewItem}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No review data loaded.</Text> : null}
        />
      </View>
    </View>
  );
};

export default CartPage;
