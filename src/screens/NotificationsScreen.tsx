import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotifItem {
  id: string;
  title: string;
  body: string;
  iconName: keyof typeof Ionicons.glyphMap;
  time: string;
  read: boolean;
}

export async function registerForPushNotifications(userId: string) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Store token in Supabase for server-side push
  await supabase.from('push_tokens').upsert({ user_id: userId, token });
  return token;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotifItem[]>([
    { id: '1', title: 'Order Shipped!', body: 'Your order #4821 is on its way. Expected: tomorrow.', iconName: 'airplane', time: '2 min ago', read: false },
    { id: '2', title: 'Flash Sale 30% off', body: 'Electronics sale ends in 3 hours. Shop now!', iconName: 'pricetag', time: '1 hr ago', read: false },
    { id: '3', title: 'Low Stock Alert', body: 'Smart Watch in your wishlist - only 3 left!', iconName: 'alert-circle', time: '3 hr ago', read: false },
    { id: '4', title: 'Order Delivered', body: 'Order #4799 was delivered successfully.', iconName: 'checkmark-circle', time: 'Yesterday', read: true },
  ]);

  useEffect(() => {
    if (user) registerForPushNotifications(user.id);
  }, [user]);

  // Send a promo push to all users via Expo Push API
  const sendPromoNotification = async () => {
    try {
      const { data: tokens } = await supabase.from('push_tokens').select('token');
      if (!tokens || tokens.length === 0) {
        Alert.alert('No devices', 'No registered push tokens found.');
        return;
      }
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          tokens.map((t) => ({
            to: t.token,
            title: '🔥 Flash Sale — 30% OFF!',
            body: 'Limited time offer on Electronics. Shop now before it ends!',
            data: { type: 'promo' },
            sound: 'default',
          }))
        ),
      });
      Alert.alert('Sent!', 'Promotional notification sent to all users.');
    } catch (err) {
      Alert.alert('Error', 'Failed to send notification.');
    }
  };

  // Send a test notification
  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ShopNow',
        body: 'Your order has been confirmed!',
        data: { type: 'order' },
      },
      trigger: { seconds: 2 },
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const s = styles(colors);

  return (
    <View style={s.container}>
      {unreadCount > 0 && (
        <View style={s.topBar}>
          <Text style={s.unreadLabel}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={s.markRead}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, !item.read && s.cardUnread]}
            onPress={() => setNotifications((prev) =>
              prev.map((n) => n.id === item.id ? { ...n, read: true } : n)
            )}
          >
            <View style={[s.iconBox, { backgroundColor: item.read ? colors.inputBg : colors.primary + '20' }]}>
              <Ionicons name={item.iconName} size={24} color={item.read ? colors.subtext : colors.primary} />
            </View>
            <View style={s.textBox}>
              <Text style={[s.notifTitle, !item.read && { color: colors.primary }]}>{item.title}</Text>
              <Text style={s.notifBody}>{item.body}</Text>
              <Text style={s.notifTime}>{item.time}</Text>
            </View>
            {!item.read && <View style={s.dot} />}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={{ gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={s.testBtn} onPress={sendTestNotification}>
              <Ionicons name="notifications" size={16} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={s.testBtnText}>Send Test Notification</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.testBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]} onPress={sendPromoNotification}>
              <Ionicons name="pricetag" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[s.testBtnText, { color: colors.primary }]}>Send Promo to All Users</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  unreadLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  markRead: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardUnread: { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBox: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  notifBody: { fontSize: 12, color: colors.subtext, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: colors.subtext },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  testBtn: {
    marginTop: 8,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  testBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
});