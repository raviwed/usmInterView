import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import {useRoute} from '@react-navigation/native';
import {BASEURL} from '../api/api';

const SingleProduct = () => {
  const route = useRoute();
  const params = route.params || {};
  const {orderId, retailerId, userId: routeUserId, apiToken: routeApiToken} = params as {
    orderId?: string | number;
    retailerId?: string | number;
    userId?: string | number;
    apiToken?: string;
  };

  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        let currentUserId = routeUserId;
        let currentRetailerId = retailerId;
        let currentApiToken = routeApiToken;

        if (!currentUserId || !currentRetailerId || !currentApiToken) {
          const session = await EncryptedStorage.getItem('user_session');
          const parsedSession = session ? JSON.parse(session) : null;
          const sessionData = parsedSession?.data || parsedSession;

          currentUserId = currentUserId || sessionData?.user_id || sessionData?.userId || sessionData?.id || sessionData?.user?.id;
          currentRetailerId = currentRetailerId || sessionData?.retailer_id || sessionData?.retailerId || sessionData?.retailer?.id || sessionData?.user?.retailer_id;
          currentApiToken = currentApiToken || sessionData?.api_token;
        }
		console.log(orderId,currentRetailerId,currentApiToken,currentUserId)

        if (!orderId || !currentRetailerId || !currentUserId || !currentApiToken) {
          setError('Unable to load order details. Missing required parameters.');
          return;
        }

        const url = `${BASEURL}/services/retailer/orders/${currentRetailerId}/${orderId}?api_token=${encodeURIComponent(
          String(currentApiToken),
        )}&user_id=${encodeURIComponent(String(currentUserId))}`;

        const response = await axios.post(url, {validateStatus: () => true});

        if (response.status >= 200 && response.status < 300) {
          setOrderDetail(response.data);
        } else {
          setError(
            response.data?.message || `Order details request failed with status ${response.status}`,
          );
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderId, retailerId, routeApiToken, routeUserId]);

  const fieldLabels: Record<string, string> = {
    order_id: 'Order ID',
    retailer_id: 'Retailer ID',
    distributor_id: 'Distributor ID',
    dist_user_id: 'Distributor User ID',
    dist_name: 'Distributor',
    zennx_id: 'Zennx ID',
    mobile: 'Mobile',
    location: 'Location',
    city: 'City',
    status: 'Status',
    status_name: 'Status',
    total: 'Total Amount',
    total_discount: 'Total Discount',
    no_of_products: 'Product Count',
    shortage_count: 'Shortage Count',
    created_date: 'Created Date',
    created_time: 'Created Time',
    update_date: 'Updated Date',
    update_time: 'Updated Time',
    billed_date: 'Billed Date',
    billed_time: 'Billed Time',
    date: 'Order Date',
    cancel_flag: 'Cancelled',
    owner_mobile: 'Owner Mobile',
    primary_contact: 'Primary Contact',
    additional_phones: 'Additional Phones',
    delivery_status: 'Delivery Status',
    sales_rep_id: 'Sales Rep ID',
    salesrep_name: 'Sales Rep Name',
    additional_info: 'Additional Info',
    offer_flag: 'Offer Flag',
    offer_bill: 'Offer Bill',
    offer_bill_doc: 'Offer Bill Doc',
    benefit_amt: 'Benefit Amount',
    benefit_amt_val: 'Benefit Value',
  };

  const productFieldLabels: Record<string, string> = {
    product_id: 'Product ID',
    product_name: 'Product',
    item_name: 'Product',
    sku: 'SKU',
    mrp: 'MRP',
    rate: 'Rate',
    qty: 'Quantity',
    quantity: 'Quantity',
    amount: 'Amount',
    total: 'Total',
    no_of_products: 'Quantity',
  };

  const detailObject =
    orderDetail?.data && !Array.isArray(orderDetail?.data)
      ? orderDetail.data
      : orderDetail?.order || orderDetail;

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderDetailRow = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Primitive values
    if (typeof value !== 'object') {
      return (
        <View key={label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{String(value)}</Text>
        </View>
      );
    }

    // Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      // If array of primitives, join and show inline
      const primitives = value.every(v => typeof v !== 'object');
      if (primitives) {
        return (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value.join(', ')}</Text>
          </View>
        );
      }

      // Array of objects: render each as sub-card
      return (
        <View key={label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          {value.map((item: any, idx: number) => (
            <View key={`${label}-item-${idx}`} style={styles.subCard}>
              {Object.entries(item)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => (
                  <View key={k} style={styles.subRow}>
                    <Text style={styles.subRowLabel}>{fieldLabels[k] || productFieldLabels[k] || k}</Text>
                    <Text style={styles.subRowValue}>{
                      typeof v === 'object' ? JSON.stringify(v) : String(v)
                    }</Text>
                  </View>
                ))}
            </View>
          ))}
        </View>
      );
    }

    // Plain object: render entries as a sub-card
    return (
      <View key={label} style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <View style={styles.subCard}>
          {Object.entries(value)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => (
              <View key={k} style={styles.subRow}>
                <Text style={styles.subRowLabel}>{fieldLabels[k] || productFieldLabels[k] || k}</Text>
                <Text style={styles.subRowValue}>{
                  typeof v === 'object' ? JSON.stringify(v) : String(v)
                }</Text>
              </View>
            ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Details</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1E88E5" style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : detailObject ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {Object.entries(detailObject)
              .filter(([key]) =>
                [
                  'order_id',
                  'status_name',
                  'status',
                  'total',
                  'total_discount',
                  'no_of_products',
                  'shortage_count',
                  'created_date',
                  'created_time',
                  'date',
                  'dist_name',
                  'city',
                ].includes(key),
              )
              .map(([key, value]) => renderDetailRow(fieldLabels[key] || key, value))}
          </View>

          {Array.isArray(detailObject.get_orders) && detailObject.get_orders.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              {detailObject.get_orders.map((item: any, index: number) => (
                <View key={`item-${index}`} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {item.product_name || item.item_name || `Item ${index + 1}`}
                  </Text>
                  {Object.entries(item)
                    .filter(([, value]) => value !== null && value !== undefined && value !== '')
                    .map(([itemKey, itemValue]) =>
                      renderDetailRow(fieldLabels[itemKey] || itemKey, itemValue),
                    )}
                </View>
              ))}
            </View>
          ) : null}

            {Array.isArray(detailObject.product_details) && detailObject.product_details.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Products</Text>
                {detailObject.product_details.map((p: any, idx: number) => (
                  <View key={`product-${idx}`} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{p.product_name || p.item_name || `Product ${idx + 1}`}</Text>
                    {renderDetailRow('Product ID', p.product_id || p.id || p.sku)}
                    {renderDetailRow('Quantity', p.qty || p.quantity || p.no_of_products)}
                    {renderDetailRow('MRP', p.mrp || p.price)}
                    {renderDetailRow('Rate', p.rate || p.unit_price)}
                    {renderDetailRow('Total', p.amount || p.total || p.value)}
                    {Object.entries(p)
                      .filter(
                        ([k, v]) =>
                          !['product_name', 'item_name', 'product_id', 'id', 'sku', 'qty', 'quantity', 'mrp', 'rate', 'amount', 'total', 'status', 'status_name'].includes(k) &&
                          v !== null &&
                          v !== undefined &&
                          v !== '',
                      )
                      .map(([k, v]) => renderDetailRow(productFieldLabels[k] || k, v))}
                  </View>
                ))}
              </View>
            ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>More Information</Text>
            {Object.entries(detailObject)
              .filter(
                ([key]) =>
                  ![
                    'order_id',
                    'status_name',
                    'status',
                    'total',
                    'total_discount',
                    'no_of_products',
                    'shortage_count',
                    'created_date',
                    'created_time',
                    'date',
                    'dist_name',
                    'city',
                    'get_orders',
                  ].includes(key),
              )
              .map(([key, value]) => renderDetailRow(fieldLabels[key] || key, value))}
          </View>
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>No order details available.</Text>
      )}
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
    marginBottom: 16,
  },
  content: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
  itemCard: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e6e9ee',
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subRowLabel: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  subRowValue: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  loader: {
    marginTop: 24,
  },
  errorText: {
    marginTop: 24,
    color: '#dc2626',
    fontSize: 16,
  },
  emptyText: {
    marginTop: 24,
    color: '#6b7280',
    fontSize: 16,
  },
});

export default SingleProduct;
