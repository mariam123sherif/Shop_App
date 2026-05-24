import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useCartStore } from '../store/cartStore';
import * as Haptics from 'expo-haptics';


export default function BarcodeScannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const [manualBarcode, setManualBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [ScannerComponent, setScannerComponent] = useState<any>(null);
  const [hasNativeScanner, setHasNativeScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // Dynamically try to load — only works in native build, not Expo Go
    try {
      const mod = require('expo-barcode-scanner');
      mod.BarCodeScanner.requestPermissionsAsync().then(({ status }: any) => {
        setHasPermission(status === 'granted');
        setHasNativeScanner(true);
        setScannerComponent(() => mod.BarCodeScanner);
      });
    } catch (e) {
      // Running in Expo Go — use manual entry fallback
      setHasNativeScanner(false);
    }
  }, []);

  const lookupBarcode = async (barcode: string) => {
    if (!barcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode number');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode.trim())
      .single();

    setLoading(false);

    if (error || !product) {
      Alert.alert(
        'Not Found',
        `No product found for barcode: ${barcode}`,
        [{ text: 'Try Again', onPress: () => setManualBarcode('') }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        `✅ Found: ${product.name}`,
        `Price: $${product.price.toFixed(2)}\nStock: ${product.stock_quantity}`,
        [
          { text: 'Add to Cart', onPress: () => { addItem(product); navigation.goBack(); } },
          { text: 'View Product', onPress: () => navigation.navigate('ProductDetail', { product }) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    await lookupBarcode(data);
    setTimeout(() => setScanned(false), 2000);
  };

  const s = styles(colors);

  // Native camera scanner — only shown in real native build
  if (hasNativeScanner && ScannerComponent && hasPermission) {
    return (
      <View style={s.container}>
        <ScannerComponent
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.overlay}>
          <Text style={s.overlayTitle}>Scan Barcode</Text>
          <Text style={s.overlaySub}>Point camera at a product barcode</Text>
        </View>
        <View style={s.frame}>
          <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
          <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
          <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
          <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
        </View>
        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 12 }}>Looking up product...</Text>
          </View>
        )}
        {scanned && !loading && (
          <View style={s.bottom}>
            <TouchableOpacity style={s.scanAgainBtn} onPress={() => setScanned(false)}>
              <Text style={s.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Fallback — manual barcode entry for Expo Go
  return (
    <View style={[s.fallback, { backgroundColor: colors.background }]}>
      <Text style={s.fallbackIcon}>📷</Text>
      <Text style={[s.fallbackTitle, { color: colors.text }]}>Barcode Scanner</Text>
      <Text style={[s.fallbackSub, { color: colors.subtext }]}>
        Camera scanning works in a native build.{'\n'}Enter a barcode to search:
      </Text>

      <View style={s.inputRow}>
        <TextInput
          style={[s.input, {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            color: colors.text,
          }]}
          placeholder="e.g. 1234567890"
          placeholderTextColor={colors.subtext}
          value={manualBarcode}
          onChangeText={setManualBarcode}
          keyboardType="number-pad"
          onSubmitEditing={() => lookupBarcode(manualBarcode)}
        />
        <TouchableOpacity
          style={[s.searchBtn, { backgroundColor: colors.primary }]}
          onPress={() => lookupBarcode(manualBarcode)}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.searchBtnText}>Search</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={[s.hintBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Text style={[s.hintTitle, { color: colors.text }]}>Tap a sample barcode to test:</Text>
        {[
          { code: '1234567890', name: 'Wireless Headphones' },
          { code: '2345678901', name: 'Running Shoes' },
          { code: '4567890123', name: 'Smart Watch' },
          { code: '3456789012', name: 'Smart LED Lamp' },
        ].map((item) => (
          <TouchableOpacity
            key={item.code}
            style={s.hintRow}
            onPress={() => lookupBarcode(item.code)}
          >
            <Text style={[s.hintCode, { color: colors.primary }]}>{item.code}</Text>
            <Text style={[s.hintName, { color: colors.subtext }]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  // Native scanner
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  overlayTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  overlaySub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 6 },
  frame: { position: 'absolute', top: '30%', left: '15%', right: '15%', height: 220 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  bottom: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  scanAgainBtn: { backgroundColor: '#185FA5', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  scanAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Fallback manual entry
  fallback: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  fallbackIcon: { fontSize: 64, marginBottom: 16 },
  fallbackTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  fallbackSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 24 },
  input: { flex: 1, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  searchBtn: { borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hintBox: { width: '100%', borderRadius: 12, padding: 16, borderWidth: 1 },
  hintTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  hintRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#E5E7EB',
  },
  hintCode: { fontSize: 13, fontWeight: '600' },
  hintName: { fontSize: 13 },
});