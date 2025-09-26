import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';

const CounterBox = ({ icon, title, count, symbol, color, colors, containerStyle }) => {
  if (colors) {
    // New gradient style for teacher home
    return (
      <View style={[styles.gradientContainer, containerStyle]}>
        <LinearGradient colors={colors} style={styles.gradientBox}>
          <Ionicons name={icon} size={28} color="white" style={styles.gradientIcon} />
          <View style={styles.gradientCountContainer}>
            {symbol && <Text style={styles.gradientSymbol}>{symbol}</Text>}
            <Text style={styles.gradientCount}>{count}</Text>
          </View>
          <Text style={styles.gradientTitle}>{title}</Text>
        </LinearGradient>
      </View>
    );
  }

  // Original style for other screens
  return (
    <View style={[styles.container, { borderTopColor: color }, containerStyle]}>
      <MaterialIcons name={icon} size={32} color={color} style={styles.icon} />
      <View style={styles.countContainer}>
        {symbol && <Text style={styles.symbol}>{symbol}</Text>}
        <Text style={styles.count}>{count}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    backgroundColor: Colors.card,
    padding: 15,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 4,
  },
  icon: {
    marginBottom: 10,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 4,
  },
  count: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  title: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
  // New gradient styles
  gradientContainer: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientBox: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  gradientIcon: {
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gradientCountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gradientSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gradientCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gradientTitle: {
    fontSize: 13,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default CounterBox;
