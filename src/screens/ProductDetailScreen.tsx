import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';

export default function ProductDetailScreen({ route, navigation }: any) {
  const { product: initialProduct } = route.params as { product: Product };
  const { colors } = useTheme();
  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState<Product>(initialProduct);
  const [inWishlist, setInWishlist] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Check wishlist status - Feature 14
  useEffect(() => {
    if (!user) return;
    supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .single()
      .then(({ data }) => setInWishlist(!!data));
  }, [user, product.id]);

  // Feature 17 - Realtime stock updates for this product
  useEffect(() => {
    const channel = supabase
      .channel(`product-${product.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'products',
        filter: `id=eq.${product.id}`,
      }, (payload) => {
        setProduct((prev) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [product.id]);

  // Feature 3 - Product image upload
  const handleImageUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      const fileExt = file.uri.split('.').pop();
      const fileName = `${product.id}_${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: fileName, type: `image/${fileExt}` } as any);
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, formData);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      await supabase.from('products').update({ image_url: publicUrl }).eq('id', product.id);
      setProduct((prev) => ({ ...prev, image_url: publicUrl }));
      Alert.alert('Success', 'Product image updated!');
    } catch (err: any) {
      Alert.alert('Upload failed', err.message);
    }
    setUploading(false);
  };

  // Feature 14 - Toggle wishlist
  const toggleWishlist = async () => {
    if (!user) { Alert.alert('Login required'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inWishlist) {
      await supabase.from('wishlists')
        .delete().eq('user_id', user.id).eq('product_id', product.id);
      setInWishlist(false);
    } else {
      await supabase.from('wishlists')
        .insert({ user_id: user.id, product_id: product.id });
      setInWishlist(true);
    }
  };

  // Feature 15 - Haptic on add to cart
  const handleAddToCart = () => {
    if (product.stock_quantity === 0) {
      Alert.alert('Out of Stock', 'This product is currently unavailable.');
      return;
    }
    setAddingToCart(true);
    addItem(product);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setAddingToCart(false), 800);
  };

  const s = styles(colors);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Product image */}
      <TouchableOpacity onPress={handleImageUpload} style={s.imageContainer}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={[s.image, s.imagePlaceholder]}>
            <Ionicons name="image-outline" size={60} color={colors.subtext} />
          </View>
        )}
        {uploading && (
          <View style={s.uploadOverlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={s.uploadText}>Uploading...</Text>
          </View>
        )}
        <View style={s.uploadBadge}>
          <Ionicons name="camera" size={14} color="#fff" style={{ marginRight: 4 }} />
          <Text style={s.uploadBadgeText}>Tap to change photo</Text>
        </View>
      </TouchableOpacity>

      <View style={s.body}>
        {/* Stock badge */}
        <View style={[s.stockBadge, { backgroundColor: product.stock_quantity > 0 ? colors.success + '20' : '#FEEBEB' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons 
              name={product.stock_quantity > 0 ? 'checkmark-circle' : 'close-circle'} 
              size={16} 
              color={product.stock_quantity > 0 ? colors.success : colors.danger} 
            />
            <Text style={[s.stockText, { color: product.stock_quantity > 0 ? colors.success : colors.danger }]}>
              {product.stock_quantity > 0 ? `In stock — ${product.stock_quantity} left` : 'Out of stock'}
            </Text>
          </View>
        </View>

        <View style={s.titleRow}>
          <Text style={s.name}>{product.name}</Text>
          <TouchableOpacity onPress={toggleWishlist} style={s.wishBtn}>
            <Ionicons name={inWishlist ? "heart" : "heart-outline"} size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <Text style={s.price}>${product.price.toFixed(2)}</Text>
        <Text style={s.category}>Category: {product.category}</Text>
        <Text style={s.desc}>{product.description}</Text>

        {product.barcode && (
          <View style={s.barcodeRow}>
            <Ionicons name="barcode" size={16} color={colors.subtext} style={{ marginRight: 6 }} />
            <Text style={s.barcodeLabel}>Barcode: </Text>
            <Text style={s.barcodeVal}>{product.barcode}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.addBtn, product.stock_quantity === 0 && s.addBtnDisabled]}
          onPress={handleAddToCart}
          disabled={addingToCart || product.stock_quantity === 0}
        >
          <Ionicons 
            name={addingToCart ? "checkmark" : "cart"} 
            size={18} 
            color={product.stock_quantity === 0 ? colors.border : '#fff'}
            style={{ marginRight: 8 }}
          />
          <Text style={s.addBtnText}>
            {addingToCart ? 'Added to Cart!' : product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 280 },
  imagePlaceholder: { backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: { color: '#fff', marginTop: 8, fontWeight: '600' },
  uploadBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadBadgeText: { color: '#fff', fontSize: 12 },
  body: { padding: 20 },
  stockBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 12 },
  stockText: { fontSize: 13, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  name: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text },
  wishBtn: { padding: 4 },
  price: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 6 },
  category: { fontSize: 13, color: colors.subtext, marginBottom: 12 },
  desc: { fontSize: 15, color: colors.text, lineHeight: 24, marginBottom: 16 },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  barcodeLabel: { fontSize: 13, color: colors.subtext },
  barcodeVal: { fontSize: 13, color: colors.text, fontWeight: '600' },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: colors.border },
  addBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});