import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCartStore } from '../store/cartStore';
import { WishlistItem } from '../types';

export default function WishlistScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wishlists')
      .select('*, product:products(*)')
      .eq('user_id', user.id);
    if (data) setWishlist(data as WishlistItem[]);
    setLoading(false);
  };

  useEffect(() => { fetchWishlist(); }, [user]);

  const removeFromWishlist = async (item: WishlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase.from('wishlists').delete().eq('id', item.id);
    setWishlist((prev) => prev.filter((w) => w.id !== item.id));
  };

  const moveToCart = (item: WishlistItem) => {
    addItem(item.product);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Added to cart!', `${item.product.name} has been added to your cart.`);
  };

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (wishlist.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="heart-outline" size={56} color={colors.subtext} />
        <Text style={[s.title, { marginTop: 16, textAlign: 'center' }]}>Your wishlist is empty</Text>
        <Text style={{ color: colors.subtext, marginTop: 8, textAlign: 'center' }}>
          Tap the heart icon on any product to save it here
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.emoji}>
              <Ionicons name="cube" size={28} color={colors.primary} />
            </View>
            <View style={s.info}>
              <Text style={s.name}>{item.product.name}</Text>
              <Text style={s.price}>${item.product.price.toFixed(2)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons 
                  name={item.product.stock_quantity > 0 ? 'checkmark-circle' : 'close-circle'} 
                  size={14} 
                  color={item.product.stock_quantity > 0 ? colors.success : colors.danger} 
                />
                <Text style={[s.stock, { color: item.product.stock_quantity > 0 ? colors.success : colors.danger }]}>
                  {item.product.stock_quantity > 0 ? 'In stock' : 'Out of stock'}
                </Text>
              </View>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.cartBtn} onPress={() => moveToCart(item)}>
                <Ionicons name="cart" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={s.cartBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeFromWishlist(item)} style={s.removeBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  emoji: {
    width: 56,
    height: 56,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  stock: { fontSize: 12, fontWeight: '500' },
  actions: { alignItems: 'flex-end', gap: 8, flexDirection: 'row' },
  cartBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  removeBtn: { padding: 4 },
});
