import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Order } from '../types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#3B82F6',
  shipped: '#8B5CF6',
  delivered: '#1D9E75',
};

const STATUS_ICONS: Record<string, string> = {
  pending: 'time-outline',
  processing: 'settings-outline',
  shipped: 'airplane',
  delivered: 'checkmark-circle',
};

const PAGE_SIZE = 10;

export default function OrderHistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOrders = async (pageNum = 0) => {
    if (!user) return;
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      if (pageNum === 0) setOrders(data);
      else setOrders((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { fetchOrders(0); }, [user]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders(nextPage);
  };

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="receipt-outline" size={56} color={colors.subtext} />
        <Text style={[s.title, { marginTop: 16 }]}>No orders yet</Text>
        <Text style={{ color: colors.subtext, marginTop: 8 }}>Your order history will appear here</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            <View style={s.cardHeader}>
              <View>
                <Text style={s.orderId}>Order #{item.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={s.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={STATUS_ICONS[item.status] as any} size={14} color={STATUS_COLORS[item.status]} />
                  <Text style={[s.statusText, { color: STATUS_COLORS[item.status] }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={s.cardFooter}>
              <Text style={s.itemCount}>{Array.isArray(item.items) ? item.items.length : 0} items</Text>
              <Text style={s.total}>${Number(item.total).toFixed(2)}</Text>
            </View>
            {expanded === item.id && Array.isArray(item.items) && (
              <View style={s.itemsDetail}>
                {item.items.map((cartItem: any, idx: number) => (
                  <View key={idx} style={s.itemRow}>
                    <Text style={s.itemName}>{cartItem.product?.name || 'Product'}</Text>
                    <Text style={s.itemQtyPrice}>x{cartItem.quantity}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
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
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderId: { fontSize: 14, fontWeight: '700', color: colors.text },
  orderDate: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { fontSize: 13, color: colors.subtext },
  total: { fontSize: 16, fontWeight: '700', color: colors.primary },
  itemsDetail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontSize: 13, color: colors.text, flex: 1 },
  itemQtyPrice: { fontSize: 13, color: colors.subtext, fontWeight: '500' },
});
