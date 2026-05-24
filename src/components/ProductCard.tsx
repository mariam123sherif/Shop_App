import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Product } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

interface Props {
  product: Product;
  onAddToCart: () => void;
  onPress: () => void;
  formatPrice: (price: number) => string;
}

export default function ProductCard({ product, onAddToCart, onPress, formatPrice }: Props) {
  const { colors } = useTheme();
  const s = styles(colors);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={s.imageBox}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.subtext} />
          </View>
        )}
        {product.stock_quantity === 0 && (
          <View style={s.outOfStock}>
            <Text style={s.outOfStockText}>Out of stock</Text>
          </View>
        )}
        {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
          <View style={s.lowStock}>
            <Ionicons name="warning" size={12} color="#fff" style={{ marginRight: 4 }} />
            <Text style={s.lowStockText}>Only {product.stock_quantity} left!</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.category}>{product.category}</Text>
        <Text style={s.name} numberOfLines={2}>{product.name}</Text>
        <View style={s.footer}>
          <Text style={s.price}>{formatPrice(product.price)}</Text>
          <TouchableOpacity
            style={[s.addBtn, product.stock_quantity === 0 && s.addBtnDisabled]}
            onPress={onAddToCart}
            disabled={product.stock_quantity === 0}
          >
            <Ionicons name="add" size={20} color={product.stock_quantity === 0 ? colors.border : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: any) => StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageBox: { position: 'relative' },
  image: { width: '100%', height: 130 },
  imagePlaceholder: {
    width: '100%',
    height: 130,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStock: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.danger,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  outOfStockText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  lowStock: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lowStockText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  info: { padding: 10 },
  category: { fontSize: 10, fontWeight: '600', color: colors.subtext, textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 14, fontWeight: '800', color: colors.primary },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: colors.border },
});
