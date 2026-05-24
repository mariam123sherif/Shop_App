import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Network from 'expo-network';

export default function NetworkBanner() {
  const [visible, setVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      const online = state.isConnected ?? true;
      setIsOnline(online);
      setVisible(!online);
      Animated.timing(opacity, {
        toValue: online ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[s.banner, { opacity }]}>
      <Text style={s.icon}>⚡</Text>
      <Text style={s.text}>You're offline — showing cached products</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: '#92400E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  icon: { fontSize: 14 },
  text: { color: '#FEF3C7', fontSize: 12, fontWeight: '600' },
});
