import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Network from "expo-network";
import * as Battery from "expo-battery";
import * as Haptics from "expo-haptics";
import * as Localization from "expo-localization";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useCartStore } from "../store/cartStore";
import { Product } from "../types";
import ProductCard from "../components/ProductCard";
import NetworkBanner from "../components/NetworkBanner";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CATEGORIES = [
  "All",
  "Electronics",
  "Clothing",
  "Home",
  "Sports",
  "Beauty",
];
const CACHE_KEY = "cached_products";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.itemCount());
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lowBattery, setLowBattery] = useState(false);
  const locale = Localization.getLocales()[0];

  const formatPrice = (price: number) => {
    try {
      return new Intl.NumberFormat(locale.languageTag, {
        style: "currency",
        currency: locale.currencyCode ?? "USD",
      }).format(price);
    } catch {
      return `$${price.toFixed(2)}`;
    }
  };

  useEffect(() => {
    Network.getNetworkStateAsync().then((s) =>
      setIsOffline(!(s.isConnected ?? true)),
    );
  }, []);

  useEffect(() => {
    // FIX: Battery returns -1 on simulators/Expo Go — only flag real low battery
    Battery.getBatteryLevelAsync().then((level) => {
      if (level > 0 && level < 0.15) setLowBattery(true);
    });
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setLowBattery(batteryLevel > 0 && batteryLevel < 0.15);
    });
    return () => sub.remove();
  }, []);

  const fetchProducts = useCallback(
    async (isInitialLoad = false) => {
      if (lowBattery && !refreshing && !isInitialLoad) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const d = JSON.parse(cached);
          setProducts(d);
          setFiltered(d);
          setLoading(false);
          return;
        }
      }
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const d = JSON.parse(cached);
          setProducts(d);
          setFiltered(d);
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) Alert.alert("Error", error.message);
      else if (data) {
        setProducts(data);
        setFiltered(data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
      setLoading(false);
      setRefreshing(false);
    },
    [lowBattery, refreshing],
  );

  useEffect(() => {
    fetchProducts(true);
  }, []);

  // FIX: Refetch when navigating back from ProductDetail so updated images appear
  useFocusEffect(
    useCallback(() => {
      fetchProducts(false);
    }, [fetchProducts]),
  );

  // Realtime UPDATE listener (stock, price, image changes)
  useEffect(() => {
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === payload.new.id ? { ...p, ...payload.new } : p,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let result = products;
    if (category !== "All")
      result = result.filter((p) => p.category === category);
    if (search)
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      );
    setFiltered(result);
  }, [search, category, products]);

  const handleAddToCart = (product: Product) => {
    addItem(product);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const s = styles(colors);
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <View
        style={[
          s.container,
          {
            justifyContent: "center",
            alignItems: "center",
            paddingTop: insets.top,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.subtext, marginTop: 12 }}>
          Loading products...
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {isOffline && <NetworkBanner />}
      {lowBattery && (
        <View style={s.batteryBanner}>
          <Ionicons
            name="battery-dead-outline"
            size={SCREEN_WIDTH * 0.035}
            color="#92400E"
          />
          <Text style={s.batteryText}>Low battery — sync paused</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProducts();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={s.header}>
              <View>
                <Text style={s.greeting}>Hello, {firstName} 👋</Text>
                <Text style={s.tagline}>What are you shopping for?</Text>
              </View>
              <View style={{ flexDirection: "row", gap: SCREEN_WIDTH * 0.025 }}>
                {/* Stores shortcut */}
                <TouchableOpacity
                  style={s.cartIconBtn}
                  onPress={() => navigation.navigate("Stores")}
                >
                  <Ionicons
                    name="location-outline"
                    size={SCREEN_WIDTH * 0.055}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                {/* Cart */}
                <TouchableOpacity
                  style={s.cartIconBtn}
                  onPress={() => navigation.navigate("Cart")}
                >
                  <Ionicons
                    name="cart-outline"
                    size={SCREEN_WIDTH * 0.055}
                    color={colors.primary}
                  />
                  {itemCount > 0 && (
                    <View style={s.cartBadge}>
                      <Text style={s.cartBadgeText}>{itemCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                s.searchBox,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={SCREEN_WIDTH * 0.045}
                color={colors.subtext}
              />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search products..."
                placeholderTextColor={colors.subtext}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={SCREEN_WIDTH * 0.045}
                    color={colors.subtext}
                  />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              horizontal
              data={CATEGORIES}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    s.catPill,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                    category === item && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setCategory(item)}
                >
                  <Text
                    style={[
                      s.catPillText,
                      { color: colors.subtext },
                      category === item && { color: "#fff" },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Text style={[s.resultsCount, { color: colors.subtext }]}>
              {filtered.length} products
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons
              name="search-outline"
              size={SCREEN_WIDTH * 0.12}
              color={colors.border}
            />
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              No products found
            </Text>
            <Text style={[s.emptySub, { color: colors.subtext }]}>
              Try a different search or category
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onAddToCart={() => handleAddToCart(item)}
            onPress={() =>
              navigation.navigate("ProductDetail", { product: item })
            }
            formatPrice={formatPrice}
          />
        )}
      />
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: SCREEN_WIDTH * 0.03, paddingBottom: 32 },
    row: {
      justifyContent: "space-between",
      marginBottom: SCREEN_WIDTH * 0.035,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SCREEN_WIDTH * 0.015,
      marginBottom: SCREEN_WIDTH * 0.04,
      marginTop: SCREEN_WIDTH * 0.02,
    },
    greeting: {
      fontSize: SCREEN_WIDTH * 0.055,
      fontWeight: "700",
      color: colors.text,
      marginBottom: SCREEN_WIDTH * 0.005,
    },
    tagline: { fontSize: SCREEN_WIDTH * 0.03, color: colors.subtext },
    cartIconBtn: {
      width: SCREEN_WIDTH * 0.11,
      height: SCREEN_WIDTH * 0.11,
      borderRadius: SCREEN_WIDTH * 0.035,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    cartBadge: {
      position: "absolute",
      top: SCREEN_WIDTH * -0.01,
      right: SCREEN_WIDTH * -0.01,
      backgroundColor: "#EF4444",
      borderRadius: SCREEN_WIDTH * 0.025,
      width: SCREEN_WIDTH * 0.045,
      height: SCREEN_WIDTH * 0.045,
      alignItems: "center",
      justifyContent: "center",
    },
    cartBadgeText: {
      color: "#fff",
      fontSize: SCREEN_WIDTH * 0.02,
      fontWeight: "700",
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: SCREEN_WIDTH * 0.035,
      paddingHorizontal: SCREEN_WIDTH * 0.035,
      paddingVertical: SCREEN_WIDTH * 0.03,
      marginBottom: SCREEN_WIDTH * 0.035,
      borderWidth: 1,
      gap: SCREEN_WIDTH * 0.025,
    },
    searchInput: { flex: 1, fontSize: SCREEN_WIDTH * 0.035 },
    catPill: {
      paddingHorizontal: SCREEN_WIDTH * 0.045,
      paddingVertical: SCREEN_WIDTH * 0.02,
      borderRadius: SCREEN_WIDTH * 0.075,
      marginRight: SCREEN_WIDTH * 0.02,
      borderWidth: 1,
    },
    catPillText: { fontSize: SCREEN_WIDTH * 0.032, fontWeight: "600" },
    resultsCount: {
      fontSize: SCREEN_WIDTH * 0.032,
      fontWeight: "500",
      marginBottom: SCREEN_WIDTH * 0.03,
      paddingHorizontal: SCREEN_WIDTH * 0.01,
    },
    empty: {
      alignItems: "center",
      marginTop: SCREEN_WIDTH * 0.15,
      gap: SCREEN_WIDTH * 0.02,
    },
    emptyTitle: { fontSize: SCREEN_WIDTH * 0.045, fontWeight: "600" },
    emptySub: { fontSize: SCREEN_WIDTH * 0.035 },
    batteryBanner: {
      backgroundColor: "#FEF3C7",
      paddingVertical: SCREEN_WIDTH * 0.02,
      paddingHorizontal: SCREEN_WIDTH * 0.04,
      flexDirection: "row",
      alignItems: "center",
      gap: SCREEN_WIDTH * 0.015,
    },
    batteryText: {
      fontSize: SCREEN_WIDTH * 0.03,
      color: "#92400E",
      fontWeight: "500",
    },
  });
