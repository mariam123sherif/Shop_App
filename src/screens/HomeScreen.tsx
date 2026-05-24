import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import * as Haptics from 'expo-haptics';
import * as Localization from 'expo-localization';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import NetworkBanner from '../components/NetworkBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Home', 'Sports', 'Beauty'];
const CACHE_KEY = 'cached_products';

export default function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [lowBattery, setLowBattery] = useState(false);
  const locale = Localization.getLocales()[0];

  // Format currency based on device locale - Feature 18
  const formatPrice = (price: number) => {
    try {
      return new Intl.NumberFormat(locale.languageTag, {
        style: 'currency',
        currency: locale.currencyCode ?? 'USD',
      }).format(price);
    } catch {
      return `$${price.toFixed(2)}`;
    }
  };

  // Feature 11 - Network status
  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected ?? true);
      setIsOffline(!(state.isConnected ?? true));
    };
    checkNetwork();
  }, []);

  // Feature 12 - Battery aware sync
  useEffect(() => {
    Battery.getBatteryLevelAsync().then((level) => {
      if (level < 0.15) setLowBattery(true);
    });
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setLowBattery(batteryLevel < 0.15);
    });
    return () => sub.remove();
  }, []);

const fetchProducts = useCallback(async (isInitialLoad = false) => {
    // Feature 12 - Skip sync if battery critically low (but NOT on initial load)
    if (lowBattery && !refreshing && !isInitialLoad) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setProducts(data);
        setFiltered(data);
        setLoading(false);
        return;
      }
    }

    // Feature 8 - Try network first, fall back to cache
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setProducts(data);
        setFiltered(data);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setProducts(data);
      setFiltered(data);
      // Feature 8 - Cache for offline use
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
    setLoading(false);
    setRefreshing(false);
  }, [lowBattery, refreshing]);

  useEffect(() => {
    fetchProducts(true);
  }, []);

  // Feature 17 - Realtime stock updates
  useEffect(() => {
    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filter products
  useEffect(() => {
    let result = products;
    if (category !== 'All') result = result.filter((p) => p.category === category);
    if (search) result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [search, category, products]);

  const handleAddToCart = (product: Product) => {
    addItem(product);
    // Feature 15 - Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.subtext, marginTop: 12 }}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Feature 11 - Network banner */}
      {isOffline && <NetworkBanner />}
      {lowBattery && (
        <View style={s.batteryBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.batteryText}>Low battery — sync paused to save power</Text>
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchProducts(); }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Search bar */}
            <View style={s.searchBar}>
              <Ionicons name="search" size={18} color={colors.subtext} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search products..."
                placeholderTextColor={colors.subtext}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Category filters - Feature 2 */}
            <FlatList
              horizontal
              data={CATEGORIES}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              style={s.cats}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.catBtn, category === item && s.catActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[s.catText, category === item && s.catTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.subtext} />
            <Text style={s.emptyText}>No products found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onAddToCart={() => handleAddToCart(item)}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
            formatPrice={formatPrice}
          />
        )}
      />
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 12, paddingBottom: 24 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  cats: { marginBottom: 16 },
  catBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: 13, fontWeight: '500', color: colors.subtext },
  catTextActive: { color: '#fff' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: colors.subtext, marginTop: 12 },
  batteryBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    alignItems: 'center',
  },
  batteryText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
});