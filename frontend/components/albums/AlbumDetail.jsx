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
import { deletePhoto } from 'service/photoService';
import { removePhotoFromCache } from '../../service/cacheService';
import PhotoViewer from '../../components/PhotoViewer';
import PhotoItem from '../../components/PhotoItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 4;

export default function AlbumDetail({ album, onBack, onPhotosChange }) {
  const insets = useSafeAreaInsets();
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
      p => p.device_asset_id === item.item.device_asset_id
    );
    if (index !== -1) setSelectedIndex(index);
  }, [photos]);

  const handleDeletePhoto = useCallback(async () => {
    if (selectedIndex === null || isDeletingPhoto) return;
    const photo = photos[selectedIndex];
    if (!photo?.device_asset_id) return;

    try {
      setIsDeletingPhoto(true);
      await deletePhoto(photo.device_asset_id);
      await removePhotoFromCache(photo.device_asset_id);
      const updated = photos.filter(p => p.device_asset_id !== photo.device_asset_id);
      setPhotos(updated);
      onPhotosChange(updated);
      setSelectedIndex(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeletingPhoto(false);
    }
  }, [selectedIndex, isDeletingPhoto, photos, onPhotosChange]);

  const viewerPhotos = photos.map(p => ({ item: p, uri: p.uri ?? null }));

  const renderItem = useCallback(
    ({ item }) => (
      <PhotoItem
        localUri={item.uri ?? null}
        numColumns={GRID_COLUMNS}
        onPress={handlePressPhoto}
        item={item}
      />
    ),
    [handlePressPhoto]
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* Nav bar */}
      <View className="h-11 flex-row items-center justify-between px-2">
        <Pressable onPress={onBack} hitSlop={12} className="flex-row items-center w-[70px]">
          <Ionicons name="chevron-back" size={22} color="#000000" />
          <Text className="text-[17px] text-black">Albums</Text>
        </Pressable>

        <Animated.Text
          className="text-[17px] font-semibold text-black text-center"
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
        keyExtractor={item => item.device_asset_id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="px-4 pt-2 pb-3">
            <Animated.Text
              className="text-[34px] font-bold text-black tracking-tight"
              style={{ opacity: largeTitleOpacity }}
            >
              {album.name}
            </Animated.Text>
            <Text className="text-[13px] text-gray-400 mt-0.5">
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