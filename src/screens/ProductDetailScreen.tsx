import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useCartStore } from "../store/cartStore";
import { Product } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetailScreen({ route, navigation }: any) {
  const { product: initialProduct } = route.params as { product: Product };
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.itemCount());
  const [product, setProduct] = useState<Product>(initialProduct);
  const [inWishlist, setInWishlist] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Barcode lookup function
  const lookupBarcode = async (barcode: string) => {
    if (!barcode.trim()) {
      Alert.alert("Error", "Please enter a barcode number");
      return;
    }
    setScanLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: scannedProduct, error } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", barcode.trim())
      .single();

    setScanLoading(false);

    if (error || !scannedProduct) {
      Alert.alert("Not Found", `No product found for barcode: ${barcode}`, [
        {
          text: "Try Again",
          onPress: () => {
            setManualBarcode("");
            setScanned(false);
          },
        },
      ]);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setProduct(scannedProduct);
      setScannerVisible(false);
      setScanned(false);
      setManualBarcode("");
      Alert.alert(
        `✅ Found: ${scannedProduct.name}`,
        `Price: $${scannedProduct.price.toFixed(2)}\nStock: ${scannedProduct.stock_quantity}`,
      );
    }
  };

  const handleBarCodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned || scanLoading) return;
    setScanned(true);
    await lookupBarcode(data);
  };

  // Check wishlist status
  useEffect(() => {
    if (!user) return;
    supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .single()
      .then(({ data }) => setInWishlist(!!data));
  }, [user, product.id]);

  // Realtime stock updates
  useEffect(() => {
    const channel = supabase
      .channel(`product-${product.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `id=eq.${product.id}`,
        },
        (payload) => {
          setProduct((prev) => ({ ...prev, ...payload.new }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id]);

  // Product image upload
  const handleImageUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
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
      const fileExt = file.uri.split(".").pop();
      const fileName = `${product.id}_${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, formData);
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);
      await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", product.id);
      setProduct((prev) => ({ ...prev, image_url: publicUrl }));
      Alert.alert("Success", "Product image updated!");
    } catch (err: any) {
      Alert.alert("Upload failed", err.message);
    }
    setUploading(false);
  };

  // Toggle wishlist
  const toggleWishlist = async () => {
    if (!user) {
      Alert.alert("Login required");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inWishlist) {
      await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product.id);
      setInWishlist(false);
    } else {
      await supabase
        .from("wishlists")
        .insert({ user_id: user.id, product_id: product.id });
      setInWishlist(true);
    }
  };

  // Add to cart with haptic
  const handleAddToCart = () => {
    if (product.stock_quantity === 0) {
      Alert.alert("Out of Stock", "This product is currently unavailable.");
      return;
    }
    setAddingToCart(true);
    addItem(product);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setAddingToCart(false), 800);
  };

  const s = styles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header with Barcode Scanner, Location & Cart ── */}
      <View
        style={[
          s.header,
          { paddingTop: insets.top, paddingHorizontal: SCREEN_WIDTH * 0.04 },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons
            name="chevron-back"
            size={SCREEN_WIDTH * 0.07}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: SCREEN_WIDTH * 0.03 }}>
          {/* Barcode Scanner */}
          <TouchableOpacity
            style={s.headerIconBtn}
            onPress={() => {
              setScannerVisible(true);
              setScanned(false);
              setManualBarcode("");
              setShowManualEntry(false);
            }}
          >
            <Ionicons
              name="barcode-outline"
              size={SCREEN_WIDTH * 0.055}
              color={colors.primary}
            />
          </TouchableOpacity>

          {/* Store Location */}
          <TouchableOpacity
            style={s.headerIconBtn}
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
            style={s.headerIconBtn}
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

      {/* ── Scrollable Content ── */}
      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        {/* ── Product photo ── */}
        <TouchableOpacity onPress={handleImageUpload} style={s.imageContainer}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={s.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[s.image, s.imagePlaceholder]}>
              <Ionicons
                name="image-outline"
                size={SCREEN_WIDTH * 0.15}
                color={colors.subtext}
              />
            </View>
          )}
          {uploading && (
            <View style={s.uploadOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={s.uploadText}>Uploading...</Text>
            </View>
          )}
          <View style={s.uploadBadge}>
            <Ionicons
              name="camera"
              size={SCREEN_WIDTH * 0.035}
              color="#fff"
              style={{ marginRight: SCREEN_WIDTH * 0.01 }}
            />
            <Text style={s.uploadBadgeText}>Tap to change photo</Text>
          </View>
        </TouchableOpacity>

        <View style={s.body}>
          {/* ── Stock badge ── */}
          <View
            style={[
              s.stockBadge,
              {
                backgroundColor:
                  product.stock_quantity > 0
                    ? colors.success + "20"
                    : "#FEEBEB",
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SCREEN_WIDTH * 0.015,
              }}
            >
              <Ionicons
                name={
                  product.stock_quantity > 0
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={SCREEN_WIDTH * 0.04}
                color={
                  product.stock_quantity > 0 ? colors.success : colors.danger
                }
              />
              <Text
                style={[
                  s.stockText,
                  {
                    color:
                      product.stock_quantity > 0
                        ? colors.success
                        : colors.danger,
                  },
                ]}
              >
                {product.stock_quantity > 0
                  ? `In stock — ${product.stock_quantity} left`
                  : "Out of stock"}
              </Text>
            </View>
          </View>

          {/* ── Title + wishlist ── */}
          <View style={s.titleRow}>
            <Text style={s.name}>{product.name}</Text>
            <TouchableOpacity onPress={toggleWishlist} style={s.wishBtn}>
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={SCREEN_WIDTH * 0.06}
                color={colors.danger}
              />
            </TouchableOpacity>
          </View>

          <Text style={s.price}>${product.price.toFixed(2)}</Text>
          <Text style={s.category}>Category: {product.category}</Text>
          <Text style={s.desc}>{product.description}</Text>

          {/* ── Add to cart ── */}
          <TouchableOpacity
            style={[s.addBtn, product.stock_quantity === 0 && s.addBtnDisabled]}
            onPress={handleAddToCart}
            disabled={addingToCart || product.stock_quantity === 0}
          >
            <Ionicons
              name={addingToCart ? "checkmark" : "cart"}
              size={SCREEN_WIDTH * 0.045}
              color={product.stock_quantity === 0 ? colors.border : "#fff"}
              style={{ marginRight: SCREEN_WIDTH * 0.02 }}
            />
            <Text style={s.addBtnText}>
              {addingToCart
                ? "Added to Cart!"
                : product.stock_quantity === 0
                  ? "Out of Stock"
                  : "Add to Cart"}
            </Text>
          </TouchableOpacity>

          {/* ── Find in Store ── */}
          <TouchableOpacity
            style={[s.storeBtn, { borderColor: colors.primary }]}
            onPress={() => navigation.navigate("Stores")}
          >
            <Ionicons
              name="location-outline"
              size={SCREEN_WIDTH * 0.045}
              color={colors.primary}
              style={{ marginRight: SCREEN_WIDTH * 0.02 }}
            />
            <Text style={[s.storeBtnText, { color: colors.primary }]}>
              Find in Nearby Store
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Barcode Scanner Modal ── */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setScannerVisible(false);
          setScanned(false);
          setManualBarcode("");
          setShowManualEntry(false);
        }}
      >
        <View
          style={[s.scannerContainer, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View
            style={[
              s.scannerHeader,
              {
                paddingTop: insets.top,
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setScannerVisible(false);
                setScanned(false);
                setManualBarcode("");
                setShowManualEntry(false);
              }}
            >
              <Ionicons
                name="close"
                size={SCREEN_WIDTH * 0.07}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={[s.scannerTitle, { color: colors.text }]}>
              {showManualEntry ? "Enter Barcode" : "Scan Product"}
            </Text>
            <View style={{ width: SCREEN_WIDTH * 0.07 }} />
          </View>

          {/* Camera or Manual Entry */}
          {showManualEntry ? (
            // Manual Entry Screen
            <View
              style={[
                s.manualContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <Ionicons
                name="barcode-outline"
                size={SCREEN_WIDTH * 0.14}
                color={colors.primary}
                style={{ marginBottom: SCREEN_WIDTH * 0.04 }}
              />
              <Text style={[s.manualTitle, { color: colors.text }]}>
                Enter Barcode Manually
              </Text>
              <TextInput
                style={[
                  s.barcodeInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter product barcode"
                placeholderTextColor={colors.subtext}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                editable={!scanLoading}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  lookupBarcode(manualBarcode);
                }}
                disabled={scanLoading || !manualBarcode.trim()}
              >
                {scanLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.submitBtnText}>Search Barcode</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.switchBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowManualEntry(false)}
              >
                <Text style={[s.switchBtnText, { color: colors.primary }]}>
                  Use Camera Instead
                </Text>
              </TouchableOpacity>
            </View>
          ) : permission?.granted ? (
            // Camera Screen
            <>
              <CameraView
                style={s.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "qr",
                    "ean13",
                    "ean8",
                    "upc_a",
                    "upc_e",
                    "code128",
                    "code39",
                    "pdf417",
                    "itf14",
                  ],
                }}
              >
                <View style={s.scannerOverlay}>
                  <View style={s.scanFrame} />
                  <Text style={s.scannerHint}>
                    Point camera at the product barcode
                  </Text>
                </View>
              </CameraView>
              <TouchableOpacity
                style={[
                  s.switchBtn,
                  {
                    backgroundColor: colors.inputBg,
                    margin: SCREEN_WIDTH * 0.04,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowManualEntry(true)}
              >
                <Ionicons
                  name="keypad-outline"
                  size={SCREEN_WIDTH * 0.045}
                  color={colors.primary}
                  style={{ marginRight: SCREEN_WIDTH * 0.02 }}
                />
                <Text style={[s.switchBtnText, { color: colors.primary }]}>
                  Enter Barcode Manually
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // Permission Request Screen
            <View
              style={[
                s.permissionContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={SCREEN_WIDTH * 0.16}
                color={colors.subtext}
              />
              <Text style={[s.permTitle, { color: colors.text }]}>
                Camera Access Needed
              </Text>
              <Text style={[s.permSub, { color: colors.subtext }]}>
                Allow camera access to scan product barcodes instantly.
              </Text>
              <TouchableOpacity
                style={[s.permBtn, { backgroundColor: colors.primary }]}
                onPress={requestPermission}
              >
                <Text style={s.permBtnText}>Allow Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.permBtnOutline, { borderColor: colors.border }]}
                onPress={() => setShowManualEntry(true)}
              >
                <Text style={[s.permBtnOutlineText, { color: colors.text }]}>
                  Enter Barcode Manually
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: SCREEN_WIDTH * 0.03,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: SCREEN_WIDTH * 0.11,
      height: SCREEN_WIDTH * 0.11,
      alignItems: "center",
      justifyContent: "center",
    },
    headerIconBtn: {
      width: SCREEN_WIDTH * 0.11,
      height: SCREEN_WIDTH * 0.11,
      borderRadius: SCREEN_WIDTH * 0.03,
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

    // Product photo
    imageContainer: { position: "relative" },
    image: { width: "100%", height: SCREEN_WIDTH * 0.7 },
    imagePlaceholder: {
      backgroundColor: colors.inputBg,
      alignItems: "center",
      justifyContent: "center",
    },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    uploadText: {
      color: "#fff",
      marginTop: SCREEN_WIDTH * 0.02,
      fontWeight: "600",
    },
    uploadBadge: {
      position: "absolute",
      bottom: SCREEN_WIDTH * 0.03,
      right: SCREEN_WIDTH * 0.03,
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: SCREEN_WIDTH * 0.02,
      paddingHorizontal: SCREEN_WIDTH * 0.025,
      paddingVertical: SCREEN_WIDTH * 0.015,
      flexDirection: "row",
      alignItems: "center",
    },
    uploadBadgeText: { color: "#fff", fontSize: SCREEN_WIDTH * 0.03 },

    // Body
    body: { padding: SCREEN_WIDTH * 0.05 },
    stockBadge: {
      borderRadius: SCREEN_WIDTH * 0.02,
      paddingHorizontal: SCREEN_WIDTH * 0.03,
      paddingVertical: SCREEN_WIDTH * 0.02,
      alignSelf: "flex-start",
      marginBottom: SCREEN_WIDTH * 0.03,
    },
    stockText: { fontSize: SCREEN_WIDTH * 0.032, fontWeight: "600" },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: SCREEN_WIDTH * 0.02,
    },
    name: {
      flex: 1,
      fontSize: SCREEN_WIDTH * 0.055,
      fontWeight: "700",
      color: colors.text,
    },
    wishBtn: { padding: SCREEN_WIDTH * 0.01 },
    price: {
      fontSize: SCREEN_WIDTH * 0.07,
      fontWeight: "800",
      color: colors.primary,
      marginBottom: SCREEN_WIDTH * 0.015,
    },
    category: {
      fontSize: SCREEN_WIDTH * 0.032,
      color: colors.subtext,
      marginBottom: SCREEN_WIDTH * 0.03,
    },
    desc: {
      fontSize: SCREEN_WIDTH * 0.037,
      color: colors.text,
      lineHeight: SCREEN_WIDTH * 0.06,
      marginBottom: SCREEN_WIDTH * 0.04,
    },

    // Barcode card (inline)
    barcodeCard: {
      borderRadius: SCREEN_WIDTH * 0.035,
      borderWidth: 1,
      padding: SCREEN_WIDTH * 0.04,
      alignItems: "center",
      marginBottom: SCREEN_WIDTH * 0.04,
    },
    barcodeImage: {
      width: "100%",
      height: SCREEN_WIDTH * 0.2,
      marginBottom: SCREEN_WIDTH * 0.015,
    },
    barcodeNumber: {
      fontSize: SCREEN_WIDTH * 0.032,
      fontWeight: "600",
      letterSpacing: 2,
      marginBottom: SCREEN_WIDTH * 0.02,
    },
    scanHint: {
      flexDirection: "row",
      alignItems: "center",
    },
    scanHintText: {
      fontSize: SCREEN_WIDTH * 0.03,
      fontWeight: "600",
    },

    // Add to cart
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: SCREEN_WIDTH * 0.035,
      padding: SCREEN_WIDTH * 0.045,
      alignItems: "center",
      marginTop: SCREEN_WIDTH * 0.02,
      flexDirection: "row",
      justifyContent: "center",
    },
    addBtnDisabled: { backgroundColor: colors.border },
    addBtnText: {
      color: "#fff",
      fontSize: SCREEN_WIDTH * 0.043,
      fontWeight: "700",
    },
    storeBtn: {
      borderRadius: SCREEN_WIDTH * 0.035,
      borderWidth: 1.5,
      padding: SCREEN_WIDTH * 0.04,
      alignItems: "center",
      marginTop: SCREEN_WIDTH * 0.025,
      flexDirection: "row",
      justifyContent: "center",
    },
    storeBtnText: { fontSize: SCREEN_WIDTH * 0.04, fontWeight: "600" },

    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: SCREEN_WIDTH * 0.06,
    },
    modalCard: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.05,
      padding: SCREEN_WIDTH * 0.06,
      alignItems: "center",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginBottom: SCREEN_WIDTH * 0.05,
    },
    modalTitle: { fontSize: SCREEN_WIDTH * 0.045, fontWeight: "700" },
    modalBarcodeWrap: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.03,
      padding: SCREEN_WIDTH * 0.04,
      marginBottom: SCREEN_WIDTH * 0.03,
    },
    modalBarcodeImage: {
      width: "100%",
      height: SCREEN_WIDTH * 0.3,
    },
    modalBarcodeNumber: {
      fontSize: SCREEN_WIDTH * 0.04,
      fontWeight: "700",
      letterSpacing: 3,
      marginBottom: SCREEN_WIDTH * 0.01,
    },
    modalSub: {
      fontSize: SCREEN_WIDTH * 0.032,
      marginBottom: SCREEN_WIDTH * 0.06,
    },
    scanBtn: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.035,
      padding: SCREEN_WIDTH * 0.04,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SCREEN_WIDTH * 0.025,
    },
    scanBtnText: {
      color: "#fff",
      fontSize: SCREEN_WIDTH * 0.04,
      fontWeight: "700",
    },
    closeBtn: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.035,
      padding: SCREEN_WIDTH * 0.035,
      alignItems: "center",
      borderWidth: 1,
    },
    closeBtnText: { fontSize: SCREEN_WIDTH * 0.037, fontWeight: "600" },

    // Scanner Modal
    scannerContainer: { flex: 1 },
    scannerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SCREEN_WIDTH * 0.04,
      paddingBottom: SCREEN_WIDTH * 0.03,
      borderBottomWidth: 1,
    },
    scannerTitle: { fontSize: SCREEN_WIDTH * 0.045, fontWeight: "700" },
    camera: { flex: 1 },
    scannerOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
    },
    scanFrame: {
      width: SCREEN_WIDTH * 0.625,
      height: SCREEN_WIDTH * 0.625,
      borderWidth: 2,
      borderColor: "#fff",
      borderRadius: SCREEN_WIDTH * 0.03,
      marginBottom: SCREEN_WIDTH * 0.06,
    },
    scannerHint: {
      color: "#fff",
      fontSize: SCREEN_WIDTH * 0.035,
      fontWeight: "600",
      textAlign: "center",
    },

    // Manual Entry
    manualContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: SCREEN_WIDTH * 0.06,
    },
    manualTitle: {
      fontSize: SCREEN_WIDTH * 0.05,
      fontWeight: "700",
      marginBottom: SCREEN_WIDTH * 0.06,
    },
    barcodeInput: {
      width: "100%",
      borderWidth: 1,
      borderRadius: SCREEN_WIDTH * 0.03,
      paddingHorizontal: SCREEN_WIDTH * 0.04,
      paddingVertical: SCREEN_WIDTH * 0.035,
      fontSize: SCREEN_WIDTH * 0.04,
      marginBottom: SCREEN_WIDTH * 0.04,
    },
    submitBtn: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.03,
      padding: SCREEN_WIDTH * 0.04,
      alignItems: "center",
      marginBottom: SCREEN_WIDTH * 0.03,
    },
    submitBtnText: {
      color: "#fff",
      fontSize: SCREEN_WIDTH * 0.04,
      fontWeight: "700",
    },
    switchBtn: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.03,
      borderWidth: 1.5,
      padding: SCREEN_WIDTH * 0.035,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    switchBtnText: { fontSize: SCREEN_WIDTH * 0.037, fontWeight: "600" },

    // Permission Screen
    permissionContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: SCREEN_WIDTH * 0.06,
    },
    permTitle: {
      fontSize: SCREEN_WIDTH * 0.05,
      fontWeight: "700",
      marginBottom: SCREEN_WIDTH * 0.03,
    },
    permSub: {
      fontSize: SCREEN_WIDTH * 0.035,
      textAlign: "center",
      marginBottom: SCREEN_WIDTH * 0.06,
      lineHeight: SCREEN_WIDTH * 0.05,
    },
    permBtn: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.03,
      padding: SCREEN_WIDTH * 0.04,
      alignItems: "center",
      marginBottom: SCREEN_WIDTH * 0.03,
    },
    permBtnText: {
      color: "#fff",
      fontSize: SCREEN_WIDTH * 0.04,
      fontWeight: "700",
    },
    permBtnOutline: {
      width: "100%",
      borderRadius: SCREEN_WIDTH * 0.03,
      borderWidth: 1.5,
      padding: SCREEN_WIDTH * 0.035,
      alignItems: "center",
    },
    permBtnOutlineText: { fontSize: SCREEN_WIDTH * 0.037, fontWeight: "600" },
  });
