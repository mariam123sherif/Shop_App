import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { Store } from '../types';

export default function StoreLocatorScreen() {
  const { colors } = useTheme();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }

      const { data } = await supabase.from('stores').select('*');
      if (data) setStores(data);
      setLoading(false);
    })();
  }, []);

  const openNavigation = (store: Store) => {
    const url = `maps://app?daddr=${store.latitude},${store.longitude}&dirflg=d`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?daddr=${store.latitude},${store.longitude}`);
    });
  };

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.subtext, marginTop: 12 }}>Finding nearby stores...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <MapView
        style={s.map}
        initialRegion={{
          latitude: location?.latitude ?? 37.78825,
          longitude: location?.longitude ?? -122.4324,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {stores.map((store) => (
          <Marker
            key={store.id}
            coordinate={{ latitude: store.latitude, longitude: store.longitude }}
            onPress={() => setSelectedStore(store)}
          >
            <View style={s.markerContainer}>
              <Text style={s.markerEmoji}>🏪</Text>
            </View>
            <Callout>
              <View style={s.callout}>
                <Text style={s.calloutName}>{store.name}</Text>
                <Text style={s.calloutAddr}>{store.address}</Text>
                <Text style={s.calloutHours}>{store.hours}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={s.storeList}>
        <Text style={s.listTitle}>Nearby Stores</Text>
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.storeItem, selectedStore?.id === item.id && s.storeItemSelected]}
              onPress={() => setSelectedStore(item)}
            >
              <Text style={s.storeEmoji}>🏪</Text>
              <View style={s.storeInfo}>
                <Text style={s.storeName}>{item.name}</Text>
                <Text style={s.storeAddr}>{item.address}</Text>
                <Text style={s.storeHours}>{item.hours}</Text>
              </View>
              <TouchableOpacity style={s.navBtn} onPress={() => openNavigation(item)}>
                <Text style={s.navBtnText}>Navigate</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  markerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#185FA5',
  },
  markerEmoji: { fontSize: 20 },
  callout: { width: 160, padding: 8 },
  calloutName: { fontWeight: '700', fontSize: 13, marginBottom: 4 },
  calloutAddr: { fontSize: 11, color: '#666', marginBottom: 2 },
  calloutHours: { fontSize: 11, color: '#185FA5' },
  storeList: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '40%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  listTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 10,
  },
  storeItemSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  storeEmoji: { fontSize: 24 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: '600', color: colors.text },
  storeAddr: { fontSize: 12, color: colors.subtext },
  storeHours: { fontSize: 11, color: colors.primary, marginTop: 2 },
  navBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
