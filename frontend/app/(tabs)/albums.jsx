import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePhotoContext } from 'context/PhotoContext.jsx';
import { useThemeContext } from 'context/ThemeContext.jsx';
import { getThemeColors } from 'theme/appColors.js';
import AlbumDetail from '../../components/albums/AlbumDetail.jsx';
import AlbumCard from '../../components/albums/AlbumCard.jsx';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORY_ORDER = ['food', 'nature', 'animals', 'people', 'travel'];

export default function Albums() {
  const { photos } = usePhotoContext();
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);
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

  const totalPhotosInAlbums = albums.reduce((sum, album) => sum + album.photos.length, 0);

  return (
    <View className={`flex-1 ${colors.pageBg}`}>
      {/* Header */}
      <View className={`pt-16 pb-6 px-4 border-b ${colors.headerBg} ${colors.border}`}>
        <Text className={`text-3xl font-extrabold tracking-tight ${colors.textPrimary}`}>
          Albums
        </Text>
      </View>

      {albums.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="albums-outline" size={64} color={colors.emptyIcon} />
          <Text className={`text-lg font-semibold mt-4 ${colors.textPrimary}`}>
            No albums yet
          </Text>
          <Text className={`text-sm text-center mt-2 ${colors.textSecondary}`}>
            Photos you add will be automatically organized into albums
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 }}
        >
          {albumColumns.map((col, i) => (
            <View
              key={i}
              style={{ gap: 12, marginRight: i < albumColumns.length - 1 ? 12 : 0 }}
            >
              {col.map(album => (
                <AlbumCard 
                  key={album.id} 
                  album={album} 
                  onPress={handleOpenAlbum} 
                  isDarkMode={isDarkMode} 
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {openAlbum && (
        <Animated.View
          className={`absolute inset-0 z-10 ${colors.pageBg}`}
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