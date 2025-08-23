import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const CounterBox = ({ icon, title, count, symbol, colors, containerStyle }) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <LinearGradient colors={colors} style={styles.gradient}>
        <MaterialIcons name={icon} size={30} color="#fff" />
        <View style={styles.countContainer}>
          {symbol && <Text style={styles.symbol}>{symbol}</Text>}
          <Text style={styles.count}>{count}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '46%', // Two columns with some spacing
    margin: '2%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  gradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  symbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 5,
  },
  count: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
});

export default CounterBox;
