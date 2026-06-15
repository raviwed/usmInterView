import React, {useEffect, useState} from 'react';
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

type OrderListProps = {
  navigation: any;
};

const OrderList = ({navigation}: OrderListProps) => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await EncryptedStorage.getItem('cart_products');
        const session = await EncryptedStorage.getItem('user_session');
        let items = savedCart ? JSON.parse(savedCart) : [];
        if (!Array.isArray(items)) {
          items = [];
        }

        if (session) {
          const parsed = JSON.parse(session);
          const idValue = parsed?.data?.user_id || parsed?.data?.userId || parsed?.data?.id || parsed?.data?.user?.id;
          const retailerValue = parsed?.data?.retailer_id || parsed?.data?.retailerId || parsed?.data?.retailer?.id || parsed?.data?.user?.retailer_id;
          setUserId(idValue ? String(idValue) : null);
          setRetailerId(retailerValue ? String(retailerValue) : null);
        }


        setCartItems(items);
      } catch (err) {
        console.log('OrderList load error:', err);
        Alert.alert('Load error', 'Unable to load cart items.');
      }
    };

    loadCart();
  }, []);

  useEffect(() => {
    if (cartItems.length > 0 && userId) {
      addProductsToCart(cartItems);
    }
  }, [cartItems, userId]);

  const addProductsToCart = async (items: any[]) => {
    setLoading(true);
    const newStatuses: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const productId = item?.product_id || item?.id || item?.productId || item?.product_code || item?.sku;

      if (!productId) {
        newStatuses.push(`Item ${i + 1} skipped: missing product_id`);
        failureCount += 1;
        continue;
      }

      const currentRetailerId = retailerId ?? '';
      const currentUserId = userId ?? '';
      const itemRetailerId = item?.retailer_id || item?.retailerId || currentRetailerId;

      if (!itemRetailerId) {
        newStatuses.push(`Item ${i + 1} skipped: missing retailer_id`);
        failureCount += 1;
        continue;
      }

      const url = `${BASEURL}/services/retailer/cart/add-product/${itemRetailerId}`;
      const form = new FormData();
      const payload: Record<string, string> = {
        product_id: String(productId),
        user_id: currentUserId,
        quantity: '1',
      };

      form.append('product_id', payload.product_id);
      form.append('user_id', payload.user_id);
      form.append('quantity', payload.quantity);

      Object.entries(item).forEach(([key, value]) => {
        if (key === 'product_id' || key === 'retailer_id') {
          return;
        }
        if (value === undefined || value === null) {
          return;
        }
        const appendValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        form.append(key, appendValue);
        payload[key] = appendValue;
      });

      console.log(`Cart request #${i + 1} URL:`, url);
      console.log(`Cart payload for item ${i + 1}:`, payload);

      try {
        const response = await axios.post(url, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          validateStatus: () => true,
        });
        if (response.status >= 200 && response.status < 300) {
          newStatuses.push(`Added ${productId} successfully`);
          successCount += 1;
        } else {
          const message = response.data?.message || (typeof response.data === 'string' ? response.data : JSON.stringify(response.data || {}));
          console.log(`Cart add failed for ${productId}:`, response.data);
          newStatuses.push(`Failed ${productId}: ${message}`);
          failureCount += 1;
        }
      } catch (err: any) {
        const errorData = err?.response?.data ?? err?.message ?? err;
        console.log(`Cart add error for ${productId}:`, errorData);
        newStatuses.push(`Error ${productId}: ${JSON.stringify(errorData)}`);
        failureCount += 1;
      }
    }

    if (items.length > 0 && failureCount === 0) {
      newStatuses.unshift(`All ${successCount} items posted successfully`);
    } else if (items.length > 0) {
      newStatuses.unshift(`${successCount} items posted successfully, ${failureCount} failed`);
    }

    setStatuses(newStatuses);
    setLoading(false);
  };

  const renderItem = ({item}: {item: any}) => {
    const title = item?.product_name || item?.name || item?.title || JSON.stringify(item);
    const productId = item?.product_id || item?.id || item?.productId || item?.product_code || item?.sku;
    const distributorName = item?.distributor_name || item?.distributorName || item?.distributor?.name;
    const distributorId = item?.distributor_id || item?.distributorId || item?.distributor?.id;

    return (
      <View style={styles.itemRow}>
        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle}>{title}</Text>
          {productId ? <Text style={styles.itemSubtitle}>Product ID: {productId}</Text> : null}
          {distributorName ? <Text style={styles.itemSubtitle}>Distributor: {distributorName}</Text> : null}
          {distributorId ? <Text style={styles.itemSubtitle}>Distributor ID: {distributorId}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Order List</Text>
          <Text style={styles.subtitle}>Stored items from encrypted storage</Text>
        </View>
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('CartPage')}>
          <Text style={styles.cartButtonText}>Cart items</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color="#6fb8ff" style={styles.loading} /> : null}
      <FlatList
        data={cartItems}
        keyExtractor={(item, index) => `${item?.product_id || item?.id || item?.productId || item?.sku || index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No saved cart items found.</Text> : null}
      />
      {statuses.length > 0 ? (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Add to cart results</Text>
          {statuses.map((status, index) => (
            <Text key={index} style={styles.statusText}>{status}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  itemRow: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  itemDetails: {
    flexDirection: 'column',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  itemSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
  },
  loading: {
    marginVertical: 16,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  statusContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cartButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  cartButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default OrderList;
