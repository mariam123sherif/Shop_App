import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';

export default function CartScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCartStore();
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);

  const subtotal = total();
  const shipping = subtotal > 0 ? 4.99 : 0;
  const discount = subtotal > 100 ? 10 : 0;
  const grandTotal = subtotal + shipping - discount;

  // Feature 10 - Secure checkout
  const handleCheckout = async () => {
    if (!user) { Alert.alert('Please log in to checkout'); return; }
    if (items.length === 0) { Alert.alert('Your cart is empty'); return; }

    setCheckingOut(true);
    const { data, error } = await supabase.from('orders').insert({
      user_id: user.id,
      items: items,
      total: grandTotal,
      status: 'pending',
      shipping_address: 'Default Address',
    }).select().single();

    if (error) {
      Alert.alert('Checkout failed', error.message);
    } else {
      // Feature 15 - Haptic success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOrderPlaced(data.id);
      clearCart();
      // Feature 9 - Generate PDF receipt
      await generateReceipt(data.id);
    }
    setCheckingOut(false);
  };

  // Feature 9 - Receipt PDF
  const generateReceipt = async (orderId: string) => {
    const itemRows = items.map((i) =>
      `<tr><td>${i.product.name}</td><td>${i.quantity}</td><td>$${(i.product.price * i.quantity).toFixed(2)}</td></tr>`
    ).join('');

    const html = `
      <html><body style="font-family: Arial; padding: 20px;">
        <h1 style="color: #185FA5;">ShopNow Receipt</h1>
        <p>Order ID: <strong>${orderId}</strong></p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <hr/>
        <table width="100%" border="1" cellpadding="8" style="border-collapse:collapse;">
          <thead style="background:#E6F1FB;">
            <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <hr/>
        <p>Subtotal: $${subtotal.toFixed(2)}</p>
        <p>Shipping: $${shipping.toFixed(2)}</p>
        ${discount > 0 ? `<p>Discount: -$${discount.toFixed(2)}</p>` : ''}
        <h2>Total: $${grandTotal.toFixed(2)}</h2>
        <p style="color: green;">Order confirmed! Thank you for shopping with ShopNow.</p>
      </body></html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch (err) {
      console.log('PDF error:', err);
    }
  };

  const s = styles(colors);

  if (orderPlaced) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
        <Text style={[s.title, { textAlign: 'center', marginTop: 16 }]}>Order Placed!</Text>
        <Text style={[s.sub, { textAlign: 'center', marginTop: 8 }]}>Your receipt has been generated.</Text>
        <TouchableOpacity style={[s.checkoutBtn, { marginTop: 24 }]} onPress={() => {
          setOrderPlaced(null);
          navigation.navigate('Orders');
        }}>
          <Text style={s.checkoutBtnText}>View Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="cart-outline" size={64} color={colors.subtext} />
        <Text style={[s.title, { marginTop: 16 }]}>Your cart is empty</Text>
        <Text style={[s.sub, { marginTop: 8 }]}>Add some products to get started</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={s.list}
        ListFooterComponent={
          <View style={s.summary}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryVal}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Shipping</Text>
              <Text style={s.summaryVal}>${shipping.toFixed(2)}</Text>
            </View>
            {discount > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Discount (orders over $100)</Text>
                <Text style={[s.summaryVal, { color: colors.success }]}>-${discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={[s.summaryRow, s.totalRow]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalVal}>${grandTotal.toFixed(2)}</Text>
            </View>
            <View style={s.secureNote}>
              <Ionicons name="lock-closed" size={14} color={colors.subtext} style={{ marginRight: 4 }} />
              <Text style={s.secureText}>Secure checkout — SSL encrypted</Text>
            </View>
            <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout} disabled={checkingOut}>
              {checkingOut ? <ActivityIndicator color="#fff" /> : <Text style={s.checkoutBtnText}>Place Order</Text>}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.item}>
            <View style={s.itemEmoji}>
              <Ionicons name="cube" size={28} color={colors.primary} />
            </View>
            <View style={s.itemInfo}>
              <Text style={s.itemName}>{item.product.name}</Text>
              <Text style={s.itemPrice}>${item.product.price.toFixed(2)}</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity
                  style={s.qtyBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateQuantity(item.product.id, item.quantity - 1);
                  }}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.qty}>{item.quantity}</Text>
                <TouchableOpacity
                  style={s.qtyBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateQuantity(item.product.id, item.quantity + 1);
                  }}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.itemRight}>
              <Text style={s.itemTotal}>${(item.product.price * item.quantity).toFixed(2)}</Text>
              <TouchableOpacity onPress={() => removeItem(item.product.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
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
  list: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { fontSize: 15, color: colors.subtext },
  item: {
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
  itemEmoji: {
    width: 56,
    height: 56,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  itemPrice: { fontSize: 13, color: colors.subtext, marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qty: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemRight: { alignItems: 'flex-end', gap: 8 },
  itemTotal: { fontSize: 15, fontWeight: '700', color: colors.primary },
  summary: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: colors.subtext },
  summaryVal: { fontSize: 14, fontWeight: '600', color: colors.text },
  totalRow: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalVal: { fontSize: 18, fontWeight: '800', color: colors.primary },
  secureNote: { alignItems: 'center', marginVertical: 10, flexDirection: 'row', justifyContent: 'center' },
  secureText: { fontSize: 12, color: colors.subtext },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  checkoutBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});