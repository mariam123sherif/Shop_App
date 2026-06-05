import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { Store } from '../types';

// Haversine formula — distance in km between two GPS points
function getDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function StoreLocatorScreen() {
  const { colors, isDark } = useTheme();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        } catch {
          setLocationError(true);
        }
      } else {
        setLocationError(true);
      }

      const { data } = await supabase.from('stores').select('*');
      if (data) setStores(data);
      setLoading(false);
    })();
  }, []);

  // Sort stores by distance from user
  const sortedStores = location
    ? [...stores].sort((a, b) => {
        const da = getDistance(location.latitude, location.longitude, a.latitude, a.longitude);
        const db = getDistance(location.latitude, location.longitude, b.latitude, b.longitude);
        return da - db;
      })
    : stores;

  const openNavigation = (store: Store) => {
    const url = `maps://app?daddr=${store.latitude},${store.longitude}&dirflg=d`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?daddr=${store.latitude},${store.longitude}`)
    );
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
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        initialRegion={{
          latitude: location?.latitude ?? 30.0444,
          longitude: location?.longitude ?? 31.2357,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Radius circle around user */}
        {location && (
          <Circle
            center={location}
            radius={5000}
            fillColor={colors.primary + '12'}
            strokeColor={colors.primary + '40'}
            strokeWidth={1.5}
          />
        )}

        {stores.map((store) => {
          const isSelected = selectedStore?.id === store.id;
          return (
            <Marker
              key={store.id}
              coordinate={{ latitude: store.latitude, longitude: store.longitude }}
              onPress={() => setSelectedStore(store)}
            >
              <View style={[s.markerContainer, isSelected && s.markerSelected]}>
                <Text style={s.markerEmoji}>🏪</Text>
              </View>
              <Callout tooltip>
                <View style={[s.callout, { backgroundColor: colors.card }]}>
                  <Text style={[s.calloutName, { color: colors.text }]}>{store.name}</Text>
                  <Text style={[s.calloutAddr, { color: colors.subtext }]}>{store.address}</Text>
                  <Text style={[s.calloutHours, { color: colors.primary }]}>{store.hours}</Text>
                  {location && (
                    <Text style={[s.calloutDist, { color: colors.success }]}>
                      📍 {formatDistance(getDistance(location.latitude, location.longitude, store.latitude, store.longitude))} away
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* GPS status banner */}
      {locationError && (
        <View style={[s.gpsBanner, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="location-outline" size={14} color="#92400E" />
          <Text style={s.gpsBannerText}>Location unavailable — showing all stores</Text>
        </View>
      )}

      {/* Store list panel */}
      <View style={[s.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.panelHandle} />
        <Text style={[s.listTitle, { color: colors.text }]}>
          {location ? 'Nearby Stores' : 'All Stores'}
        </Text>

        <FlatList
          data={sortedStores}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const dist = location
              ? getDistance(location.latitude, location.longitude, item.latitude, item.longitude)
              : null;
            const isSelected = selectedStore?.id === item.id;
            return (
              <TouchableOpacity
                style={[
                  s.storeItem,
                  { borderColor: colors.border },
                  isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setSelectedStore(item)}
              >
                {/* Rank badge */}
                {location && (
                  <View style={[s.rankBadge, { backgroundColor: index === 0 ? colors.primary : colors.inputBg }]}>
                    <Text style={[s.rankText, { color: index === 0 ? '#fff' : colors.subtext }]}>
                      {index + 1}
                    </Text>
                  </View>
                )}

                <View style={s.storeInfo}>
                  <Text style={[s.storeName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[s.storeAddr, { color: colors.subtext }]}>{item.address}</Text>
                  <View style={s.storeFooter}>
                    <Text style={[s.storeHours, { color: colors.primary }]}>{item.hours}</Text>
                    {dist !== null && (
                      <View style={s.distBadge}>
                        <Ionicons name="navigate" size={10} color={colors.success} style={{ marginRight: 2 }} />
                        <Text style={[s.distText, { color: colors.success }]}>{formatDistance(dist)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.navBtn, { backgroundColor: colors.primary }]}
                  onPress={() => openNavigation(item)}
                >
                  <Ionicons name="navigate-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={s.navBtnText}>Go</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
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
    borderRadius: 20, padding: 6,
    borderWidth: 2, borderColor: '#185FA5',
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 4, elevation: 4,
  },
  markerSelected: {
    borderColor: '#EF4444',
    transform: [{ scale: 1.15 }],
  },
  markerEmoji: { fontSize: 20 },

  callout: {
    minWidth: 170, padding: 12,
    borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 6, elevation: 4,
  },
  calloutName: { fontWeight: '700', fontSize: 13, marginBottom: 4 },
  calloutAddr: { fontSize: 11, marginBottom: 2 },
  calloutHours: { fontSize: 11, marginBottom: 4 },
  calloutDist: { fontSize: 11, fontWeight: '600' },

  gpsBanner: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  gpsBannerText: { fontSize: 12, color: '#92400E' },

  panel: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, maxHeight: '42%',
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
  },
  panelHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 12,
  },
  listTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  storeItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12,
    borderWidth: 1, marginBottom: 8, gap: 10,
  },
  rankBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rankText: { fontSize: 12, fontWeight: '700' },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  storeAddr: { fontSize: 12, marginBottom: 4 },
  storeFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeHours: { fontSize: 11 },
  distBadge: { flexDirection: 'row', alignItems: 'center' },
  distText: { fontSize: 11, fontWeight: '600' },
  navBtn: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  navBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});