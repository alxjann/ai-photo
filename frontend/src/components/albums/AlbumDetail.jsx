import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StatusBar,
  Animated,
  Alert,
  ActivityIndicator,
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [isDeletingSelectedPhotos, setIsDeletingSelectedPhotos] = useState(false);
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

  const selectedCount = selectedPhotoIds.length;

  const clearSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedPhotoIds([]);
  }, []);

  const toggleSelectedPhoto = useCallback((photoId) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
      return [...prev, photoId];
    });
  }, []);

  const handlePressPhoto = useCallback((item) => {
    if (isSelectionMode) {
      toggleSelectedPhoto(item.item.id);
      return;
    }

    const index = photos.findIndex(
      p => p.id === item.item.id
    );
    if (index !== -1) setSelectedIndex(index);
  }, [isSelectionMode, photos, toggleSelectedPhoto]);

  const handleLongPressPhoto = useCallback((item) => {
    const photoId = item?.item?.id;
    if (!photoId) return;

    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedPhotoIds([photoId]);
      setSelectedIndex(null);
      return;
    }

    toggleSelectedPhoto(photoId);
  }, [isSelectionMode, toggleSelectedPhoto]);

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
      onPhotosChange(updated, [photo.id]);
      setSelectedIndex(null);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeletingPhoto(false);
    }
  }, [selectedIndex, isDeletingPhoto, photos, onPhotosChange]);

  const handleDeleteSelectedPhotos = useCallback(() => {
    if (selectedCount === 0 || isDeletingSelectedPhotos) return;

    Alert.alert(
      'Delete selected photos',
      `Delete ${selectedCount} ${selectedCount === 1 ? 'photo' : 'photos'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingSelectedPhotos(true);
              const idsToDelete = [...selectedPhotoIds];
              const results = await Promise.allSettled(
                idsToDelete.map(async (photoId) => {
                  await deletePhoto(photoId);
                  await removePhotoFromCache(photoId);
                  return photoId;
                })
              );

              const deletedIds = results
                .filter((result) => result.status === 'fulfilled')
                .map((result) => result.value);

              if (deletedIds.length > 0) {
                const deletedSet = new Set(deletedIds);
                const updated = photos.filter((p) => !deletedSet.has(p.id));
                setPhotos(updated);
                onPhotosChange(updated, deletedIds);
              }

              const failedCount = results.length - deletedIds.length;
              if (failedCount > 0) {
                Alert.alert('Delete incomplete', `${failedCount} photo(s) could not be deleted.`);
              }

              clearSelection();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete selected photos');
            } finally {
              setIsDeletingSelectedPhotos(false);
            }
          },
        },
      ]
    );
  }, [
    selectedCount,
    isDeletingSelectedPhotos,
    selectedPhotoIds,
    photos,
    onPhotosChange,
    clearSelection,
  ]);

  const viewerPhotos = photos.map(p => ({ item: p, uri: p.uri ?? null }));

  const renderItem = useCallback(
    ({ item }) => (
      <PhotoItem
        localUri={item.uri ?? null}
        numColumns={GRID_COLUMNS}
        onPress={handlePressPhoto}
        onLongPress={handleLongPressPhoto}
        item={item}
        isSelected={selectedPhotoIds.includes(item.id)}
        selectionMode={isSelectionMode}
      />
    ),
    [handleLongPressPhoto, handlePressPhoto, isSelectionMode, selectedPhotoIds]
  );

  return (
    <View className={`flex-1 ${colors.pageBg}`} style={{ paddingTop: insets.top }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Nav bar */}
      {isSelectionMode ? (
        <View className="h-11 flex-row items-center justify-between px-4">
          <Pressable onPress={clearSelection} className="py-1 pr-3">
            <Text className={`text-base ${colors.text}`}>Cancel</Text>
          </Pressable>

          <Text className={`text-[17px] font-semibold text-center ${colors.text}`}>
            {selectedCount} selected
          </Text>

          <Pressable
            onPress={handleDeleteSelectedPhotos}
            disabled={selectedCount === 0 || isDeletingSelectedPhotos}
            className="py-1 pl-3"
            style={{ opacity: selectedCount === 0 || isDeletingSelectedPhotos ? 0.4 : 1 }}
          >
            {isDeletingSelectedPhotos ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text className="text-base font-semibold text-red-500">Delete</Text>
            )}
          </Pressable>
        </View>
      ) : (
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
      )}

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

