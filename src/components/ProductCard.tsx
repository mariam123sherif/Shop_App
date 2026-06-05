import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Product } from '../types';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Electronics: { bg: '#E6F1FB', text: '#185FA5' },
  Clothing:    { bg: '#F3E8FF', text: '#7C3AED' },
  Home:        { bg: '#FFF7E6', text: '#D97706' },
  Sports:      { bg: '#ECFDF5', text: '#059669' },
  Beauty:      { bg: '#FFF0F3', text: '#E11D48' },
};

interface Props {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  formatPrice: (price: number) => string;
}

export default function ProductCard({ product, onPress, onAddToCart, formatPrice }: Props) {
  const { colors } = useTheme();
  const cat = CATEGORY_COLORS[product.category] ?? { bg: colors.inputBg, text: colors.subtext };
  const outOfStock = product.stock_quantity === 0;

  const s = styles(colors);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image or coloured placeholder */}
      <View style={[s.imageWrap, { backgroundColor: cat.bg }]}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={s.image}
            resizeMode="cover"
          />
        ) : (
          <Text style={[s.initial, { color: cat.text }]}>
            {product.name.slice(0, 2).toUpperCase()}
          </Text>
        )}
        {/* Category pill */}
        <View style={[s.catPill, { backgroundColor: cat.bg }]}>
          <Text style={[s.catText, { color: cat.text }]}>
            {product.category.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={s.body}>
        <Text style={s.name} numberOfLines={2}>{product.name}</Text>

        <View style={s.footer}>
          <Text style={[s.price, { color: cat.text }]}>{formatPrice(product.price)}</Text>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: outOfStock ? colors.border : cat.text }]}
            onPress={outOfStock ? undefined : onAddToCart}
            disabled={outOfStock}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {outOfStock && (
          <Text style={s.oos}>Out of stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: any) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '48%',
  },
  imageWrap: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  initial: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  catPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    padding: 10,
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oos: {
    fontSize: 10,
    color: colors.danger ?? '#EF4444',
    fontWeight: '500',
  },
});