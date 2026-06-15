import React, {useState, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import {useFocusEffect} from '@react-navigation/native';
import {BASEURL} from '../api/api';

const Home = ({navigation}) => {
  const [orders, setOrders] = useState([]);
  const [sessionData, setSessionData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadOrders = async () => {
        try {
          const session = await EncryptedStorage.getItem('user_session');
          const parsedSession = session ? JSON.parse(session) : null;
          const userId = parsedSession?.data?.user_id || parsedSession?.data?.userId || parsedSession?.data?.id || parsedSession?.data?.user?.id;
          const retailerId = parsedSession?.data?.retailer_id || parsedSession?.data?.retailerId || parsedSession?.data?.retailer?.id || parsedSession?.data?.user?.retailer_id;

          if (!userId || !retailerId) {
            console.log('Home loadOrders: missing userId or retailerId');
            return;
          }

          const url = `${BASEURL}/services/retailer/orders/${retailerId}`;
          const form = new FormData();
          form.append('user_id', String(userId));
          form.append('page', '1');
          form.append('search_key', '');
          form.append('form_date', '');
          form.append('to_date', '');
          form.append('order_type', '');
          form.append('status_filter', '');

          const response = await axios.post(url, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            validateStatus: () => true,
          });

          if (!isActive) {
            return;
          }

          if (response.status >= 200 && response.status < 300) {
            console.log('Home order data', response.data);
            const payload = response.data;
            let parsedOrders = [];

            if (Array.isArray(payload)) {
              payload.forEach(item => {
                if (Array.isArray(item.get_orders)) {
                  parsedOrders.push(...item.get_orders);
                }
              });
            } else if (Array.isArray(payload?.data)) {
              payload.data.forEach(item => {
                if (Array.isArray(item.get_orders)) {
                  parsedOrders.push(...item.get_orders);
                }
              });
            } else if (Array.isArray(payload?.get_orders)) {
              parsedOrders = payload.get_orders;
            }

            setOrders(parsedOrders);
            setSessionData(parsedSession?.data || null);
          } else {
            console.log('Home orders failed', response.data);
          }
        } catch (error) {
          console.log('Home loadOrders error', error);
        }
      };

      loadOrders();
      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Text style={styles.subtitle}>{`Orders loaded: ${orders.length}`}</Text>

      {orders.length > 0 ? (
        <ScrollView contentContainerStyle={styles.ordersList}>
          {orders.map((order, index) => {
            const orderNumber =
              order.order_number || order.orderNo || order.id || order.order_id || `#${index + 1}`;
            const status = order.status_name || order.status || order.orderStatus || 'Unknown';
            const amount = order.total || order.total_amount || order.amount || '';
            const date = order.created_date || order.created_at || order.date || order.order_date || '';
            const distributor = order.dist_name || order.distributor_name || order.distributor || '';
            const key = order.order_id || order.id || orderNumber || index;
            const orderId = order.order_id || order.id || order.orderId || orderNumber;
            const userId =
              sessionData?.user_id || sessionData?.userId || sessionData?.id || sessionData?.user?.id;
            const retailerId =
              sessionData?.retailer_id || sessionData?.retailerId || sessionData?.retailer?.id || sessionData?.user?.retailer_id;
            const apiToken = sessionData?.api_token || order.api_token || '';

            return (
              <TouchableOpacity
                key={key}
                style={styles.orderCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (!orderId || !retailerId || !userId) {
                    console.log('Missing order/navigation params', {orderId, retailerId, userId});
                    return;
                  }
                  navigation.navigate('SingleProduct', {
                    orderId,
                    retailerId,
                    userId,
                    apiToken,
                  });
                }}
              >
                <Text style={styles.cardTitle}>{`Order ${orderNumber}`}</Text>
                {distributor ? <Text style={styles.cardText}>{`Distributor: ${distributor}`}</Text> : null}
                {date ? <Text style={styles.cardText}>{`Date: ${date}`}</Text> : null}
                {amount ? <Text style={styles.cardText}>{`Total: ${amount}`}</Text> : null}
                <Text style={styles.cardText}>{`Status: ${status}`}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>No orders available yet.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  ordersList: {
    width: '100%',
    paddingVertical: 20,
  },
  orderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  emptyText: {
    marginTop: 24,
    fontSize: 16,
    color: '#6b7280',
  },
});

export default Home;
