import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deletePhoto } from '../../service/photoService.js';
import { removePhotoFromCache } from '../../service/cacheService.js';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { getThemeColors } from '../../theme/appColors.js';
import PhotoViewer from '../../components/PhotoViewer.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 4;

export default function AlbumDetail({ album, onBack, onPhotosChange }) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);
  const [photos, setPhotos] = useState(album.photos);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [40, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handlePressPhoto = useCallback((item) => {
    const index = photos.findIndex(
      p => p.id === item.item.id
    );
    if (index !== -1) setSelectedIndex(index);
  }, [photos]);

  const handleDeletePhoto = useCallback(async () => {
    if (selectedIndex === null || isDeletingPhoto) return;
    const photo = photos[selectedIndex];
    if (!photo?.id) return;

    try {
      setIsDeletingPhoto(true);
      await deletePhoto(photo.id);
      await removePhotoFromCache(photo.id);
      const updated = photos.filter(p => p.id !== photo.id);
      setPhotos(updated);
      onPhotosChange(updated);
      setSelectedIndex(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeletingPhoto(false);
    }
  }, [selectedIndex, isDeletingPhoto, photos, onPhotosChange]);

  const resolveUri = useCallback((p) =>
    p.uri ?? (Platform.OS === 'android'
      ? `content://media/external/images/media/${p.device_asset_id}`
      : `ph://${p.device_asset_id}`), []);
  const viewerPhotos = photos.map(p => ({ item: { ...p, uri: resolveUri(p) } }));

  const renderItem = useCallback(
    ({ item }) => (
      <PhotoItem
        numColumns={GRID_COLUMNS}
        onPress={handlePressPhoto}
        item={{ ...item, uri: resolveUri(item) }}
      />
    ),
    [handlePressPhoto]
  );

  return (
    <View className={`flex-1 ${colors.pageBg}`} style={{ paddingTop: insets.top }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Nav bar */}
      <View className="h-11 flex-row items-center justify-between px-2">
        <Pressable onPress={onBack} hitSlop={12} className="flex-row items-center w-[70px]">
          <Ionicons name="chevron-back" size={22} color={colors.icon} />
          <Text className={`text-[17px] ${colors.text}`}>Albums</Text>
        </Pressable>

        <Animated.Text
          className={`text-[17px] font-semibold text-center ${colors.text}`}
          style={{ opacity: headerTitleOpacity }}
        >
          {album.name}
        </Animated.Text>

        <View className="w-[70px]" />
      </View>

      {/* Scrollable grid */}
      <Animated.FlatList
        data={photos}
        numColumns={GRID_COLUMNS}
        keyExtractor={item => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="px-4 pt-2 pb-3">
            <Animated.Text
              className={`text-[34px] font-bold tracking-tight ${colors.text}`}
              style={{ opacity: largeTitleOpacity }}
            >
              {album.name}
            </Animated.Text>
            <Text className={`text-[13px] mt-0.5 ${colors.subtext}`}>
              {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
            </Text>
          </View>
        }
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 1.5 }} />}
        columnWrapperStyle={{ gap: 1.5 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      />

      <PhotoViewer
        visible={selectedIndex !== null}
        photos={viewerPhotos}
        initialIndex={selectedIndex ?? 0}
        onClose={() => setSelectedIndex(null)}
        onDelete={handleDeletePhoto}
        isDeleting={isDeletingPhoto}
      />
    </View>
  );
}