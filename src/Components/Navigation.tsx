import React from 'react';
import {Text, TouchableOpacity} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import Home from '../Home';
import CartPage from '../CartPage/CartPage';
import CreateOrder from '../CreateOrder';
import LoginPage from '../LoginPage';
import OrderList from '../OrderList';
import SearchProducts from '../SearchProducts';
import SingleProduct from '../SingleProduct';

const Stack = createStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LoginPage" screenOptions={{headerShown: true}}>
        <Stack.Screen name="LoginPage" component={LoginPage} options={{title: 'Login'}} />
        <Stack.Screen
          name="Home"
          component={Home}
          options={({navigation}) => ({
            title: 'Home',
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('SearchProducts')}
                style={{paddingHorizontal: 12, paddingVertical: 6}}
              >
                <Text style={{color: '#1E88E5', fontWeight: '600'}}>Search</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen name="CartPage" component={CartPage} options={{title: 'Cart'}} />
        <Stack.Screen name="CreateOrder" component={CreateOrder} options={{title: 'Create Order'}} />
        <Stack.Screen name="OrderList" component={OrderList} options={{title: 'Orders'}} />
        <Stack.Screen name="SearchProducts" component={SearchProducts} options={{title: 'Search Products'}} />
        <Stack.Screen name="SingleProduct" component={SingleProduct} options={{title: 'Product Details'}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;