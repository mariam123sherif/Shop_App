import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useCartStore } from '../store/cartStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export default function BarcodeScannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const [manualBarcode, setManualBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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
        [{ text: 'Try Again', onPress: () => { setManualBarcode(''); setScanned(false); } }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        `✅ Found: ${product.name}`,
        `Price: $${product.price.toFixed(2)}\nStock: ${product.stock_quantity}`,
        [
          { text: 'Add to Cart', onPress: () => { addItem(product); navigation.goBack(); } },
          { text: 'View Product', onPress: () => navigation.navigate('ProductDetail', { product }) },
          { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
        ]
      );
    }
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    await lookupBarcode(data);
  };

  const s = styles(colors);

  // ── Permission not yet determined ──────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Permission denied → show request screen ────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[s.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Ionicons name="camera-outline" size={64} color={colors.subtext} />
        <Text style={[s.permTitle, { color: colors.text }]}>Camera Access Needed</Text>
        <Text style={[s.permSub, { color: colors.subtext }]}>
          Allow camera access to scan product barcodes instantly.
        </Text>
        <TouchableOpacity style={[s.permBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={s.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.permBtnOutline, { borderColor: colors.border }]} onPress={() => setShowManual(true)}>
          <Text style={[s.permBtnOutlineText, { color: colors.text }]}>Enter Barcode Manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Manual entry overlay ───────────────────────────────────────────────────
  if (showManual) {
    return (
      <View style={[s.center, { backgroundColor: colors.background, padding: 24 }]}>
        <Ionicons name="barcode-outline" size={56} color={colors.primary} style={{ marginBottom: 16 }} />
        <Text style={[s.permTitle, { color: colors.text }]}>Enter Barcode</Text>

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
            autoFocus
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

        {/* Sample barcodes for testing */}
        <View style={[s.hintBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[s.hintTitle, { color: colors.text }]}>Tap to test a sample barcode:</Text>
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

        <TouchableOpacity onPress={() => setShowManual(false)} style={s.backToScan}>
          <Ionicons name="camera" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Back to Camera Scanner</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Live camera barcode scanner ────────────────────────────────────────────
  return (
    <View style={s.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
            'code128', 'code39', 'pdf417', 'itf14',
          ],
        }}
      />

      {/* Top label */}
      <View style={s.overlay}>
        <Text style={s.overlayTitle}>Scan Barcode</Text>
        <Text style={s.overlaySub}>Point the camera at any product barcode</Text>
      </View>

      {/* Targeting frame */}
      <View style={s.frame}>
        <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
        <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
        <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
        <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 12, fontWeight: '600' }}>Looking up product...</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={s.bottom}>
        {scanned && !loading ? (
          <TouchableOpacity style={s.actionBtn} onPress={() => setScanned(false)}>
            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.actionBtnText}>Scan Again</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={() => setShowManual(true)}>
            <Ionicons name="keypad-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.actionBtnText}>Enter Manually</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Permission screen
  permTitle: { fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  permSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  permBtn: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  permBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  permBtnOutline: { width: '100%', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  permBtnOutlineText: { fontSize: 15, fontWeight: '600' },

  // Manual entry
  inputRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 24 },
  input: { flex: 1, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  searchBtn: { borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hintBox: { width: '100%', borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 20 },
  hintTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  hintRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#E5E7EB',
  },
  hintCode: { fontSize: 13, fontWeight: '600' },
  hintName: { fontSize: 13 },
  backToScan: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  // Camera scanner
  overlay: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  overlayTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  overlaySub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6 },
  frame: { position: 'absolute', top: '30%', left: '12%', right: '12%', height: 220 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  bottom: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  actionBtn: {
    backgroundColor: '#185FA5',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});