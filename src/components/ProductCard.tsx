import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Product } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 36) / 2;

const CATEGORY_STYLES: Record<string, { bg: string; darkBg: string; text: string; accent: string }> = {
  Electronics: { bg: '#EEF2FF', darkBg: '#1E1B4B', text: '#4338CA', accent: '#6366F1' },
  Sports:      { bg: '#F0FDF4', darkBg: '#052E16', text: '#166534', accent: '#22C55E' },
  Home:        { bg: '#FFFBEB', darkBg: '#1C1107', text: '#92400E', accent: '#F59E0B' },
  Clothing:    { bg: '#FDF4FF', darkBg: '#2E1065', text: '#7E22CE', accent: '#A855F7' },
  Beauty:      { bg: '#FFF1F2', darkBg: '#4C0519', text: '#9F1239', accent: '#F43F5E' },
  General:     { bg: '#F0F9FF', darkBg: '#0C1A2E', text: '#075985', accent: '#0EA5E9' },
};

function getCatStyle(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES['General'];
}

interface Props {
  product: Product;
  onAddToCart: () => void;
  onPress: () => void;
  formatPrice: (price: number) => string;
}

export default function ProductCard({ product, onAddToCart, onPress, formatPrice }: Props) {
  const { colors, isDark } = useTheme();
  const cat = getCatStyle(product.category);
  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.93}
    >
      {/* Colored image area */}
      <View style={[styles.imageBox, { backgroundColor: isDark ? cat.darkBg : cat.bg }]}>
        {/* Category pill */}
        <View style={[styles.catPill, { backgroundColor: cat.accent + '25' }]}>
          <Text style={[styles.catPillText, { color: cat.accent }]}>{product.category}</Text>
        </View>

        {/* Product name as visual */}
        <Text style={[styles.productLabel, { color: isDark ? '#fff' : cat.text }]} numberOfLines={2}>
          {product.name.split(' ').slice(0, 2).join('\n')}
        </Text>

        {/* Stock status badges */}
        {isOutOfStock && (
          <View style={styles.outBadge}>
            <Text style={styles.badgeText}>Out of stock</Text>
          </View>
        )}
        {isLowStock && (
          <View style={[styles.lowBadge, { backgroundColor: cat.accent }]}>
            <Text style={styles.badgeText}>Only {product.stock_quantity} left!</Text>
          </View>
        )}
      </View>

      {/* Bottom info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
        <View style={styles.footer}>
          <Text style={[styles.price, { color: cat.accent }]}>{formatPrice(product.price)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: isOutOfStock ? colors.border : cat.accent }]}
            onPress={onAddToCart}
            disabled={isOutOfStock}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageBox: {
    height: 150,
    padding: 12,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  catPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  productLabel: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 24,
    marginBottom: 4,
  },
  outBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lowBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  info: { padding: 12, paddingTop: 10 },
  name: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 15, fontWeight: '800' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
});