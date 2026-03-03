import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePhotoContext } from 'context/PhotoContext.jsx';
import AlbumDetail from '../../components/albums/AlbumDetail.jsx';
import AlbumCard from '../../components/albums/AlbumCard.jsx';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORY_ORDER = ['food', 'nature', 'animals', 'people', 'travel'];

export default function Albums() {
  const insets = useSafeAreaInsets();
  const { photos } = usePhotoContext();
  const [openAlbum, setOpenAlbum] = useState(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const albums = useMemo(() => {
    const grouped = {};
    for (const photo of photos) {
      const category = photo.category?.toLowerCase();
      if (!category || category === 'none') continue;
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(photo);
    }

    return CATEGORY_ORDER
      .filter(cat => grouped[cat]?.length > 0)
      .map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        photos: grouped[cat],
      }));
  }, [photos]);

  const albumColumns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < albums.length; i += 2) {
      cols.push(albums.slice(i, i + 2));
    }
    return cols;
  }, [albums]);

  const handleOpenAlbum = useCallback(
    album => {
      setOpenAlbum(album);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
        mass: 0.9,
      }).start();
    },
    [slideAnim]
  );

  const handleCloseAlbum = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setOpenAlbum(null));
  }, [slideAnim]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 pt-2 pb-1 border-b border-gray-200/60">
          <Text className="text-[34px] font-bold text-black tracking-tight">Albums</Text>
        </View>

        {/* Section title */}
        <View className="px-4 pt-5 pb-1">
          <Text className="text-[20px] font-semibold text-black mb-2">My Albums</Text>
          <View className="h-px bg-gray-200" />
        </View>

        {albums.length === 0 ? (
          <View className="items-center pt-20 gap-3">
            <Ionicons name="images-outline" size={40} color="#c8c8c8" />
            <Text className="text-base font-medium text-gray-400">No albums yet</Text>
            <Text className="text-sm text-gray-300">Photos you add will appear here</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
          >
            {albumColumns.map((col, i) => (
              <View
                key={i}
                style={{ gap: 12, marginRight: i < albumColumns.length - 1 ? 12 : 0 }}
              >
                {col.map(album => (
                  <AlbumCard key={album.id} album={album} onPress={handleOpenAlbum} />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {openAlbum && (
        <Animated.View
          className="absolute inset-0 bg-white z-10"
          style={{ transform: [{ translateX: slideAnim }] }}
        >
          <AlbumDetail
            album={openAlbum}
            onBack={handleCloseAlbum}
            onPhotosChange={() => {}}
          />
        </Animated.View>
      )}
    </View>
  );
}