import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const CreateOrder = () => (
	<View style={styles.container}>
		<Text style={styles.title}>Create Order</Text>
	</View>
);

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#ffffff',
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#222222',
	},
});

export default CreateOrder;
