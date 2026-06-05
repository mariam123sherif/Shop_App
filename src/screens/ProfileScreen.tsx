import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string; desc: string }[] = [
  { mode: 'system', label: 'System',  icon: 'phone-portrait-outline', desc: 'Follow device setting' },
  { mode: 'light',  label: 'Light',   icon: 'sunny-outline',          desc: 'Always light' },
  { mode: 'dark',   label: 'Dark',    icon: 'moon-outline',           desc: 'Always dark' },
];

export default function ProfileScreen({ navigation }: any) {
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const s = styles(colors);
  const firstName = user?.user_metadata?.full_name ?? user?.email ?? 'User';
  const initials = firstName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── Avatar + name ── */}
      <View style={s.avatarSection}>
        <View style={[s.avatar, { backgroundColor: colors.primary }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{firstName}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      {/* ── Appearance ── */}
      <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.sectionHeader}>
          <Ionicons name="color-palette-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[s.sectionTitle, { color: colors.text }]}>Appearance</Text>
        </View>

        <View style={s.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const active = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  s.themeCard,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  active && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setThemeMode(opt.mode)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={22}
                  color={active ? colors.primary : colors.subtext}
                />
                <Text style={[s.themeLabel, { color: active ? colors.primary : colors.text }]}>
                  {opt.label}
                </Text>
                <Text style={[s.themeDesc, { color: colors.subtext }]} numberOfLines={1}>
                  {opt.desc}
                </Text>
                {active && (
                  <View style={[s.activeCheck, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Account links ── */}
      <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.sectionHeader}>
          <Ionicons name="person-circle-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[s.sectionTitle, { color: colors.text }]}>Account</Text>
        </View>

        {[
          { icon: 'receipt-outline',    label: 'Order History',  onPress: () => navigation.navigate('Orders') },
          { icon: 'heart-outline',      label: 'My Wishlist',    onPress: () => navigation.navigate('Wishlist') },
          { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={[s.menuRow, { borderColor: colors.border }]} onPress={item.onPress}>
            <View style={[s.menuIcon, { backgroundColor: colors.inputBg }]}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={[s.menuLabel, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Sign out ── */}
      <TouchableOpacity style={[s.signOutBtn, { borderColor: colors.danger + '60' }]} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: 10 }} />
        <Text style={[s.signOutText, { color: colors.danger }]}>Sign Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  email: { fontSize: 13, color: colors.subtext },

  // Section card
  section: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  // Theme picker
  themeRow: { flexDirection: 'row', gap: 10 },
  themeCard: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    padding: 12, alignItems: 'center', gap: 4, position: 'relative',
  },
  themeLabel: { fontSize: 13, fontWeight: '700' },
  themeDesc: { fontSize: 10, textAlign: 'center' },
  activeCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },

  // Menu rows
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  // Sign out
  signOutBtn: {
    borderRadius: 14, borderWidth: 1, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '700' },
});