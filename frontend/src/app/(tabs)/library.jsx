import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  Pressable,
  TextInput,
  Animated,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import PhotoItem from '../../components/PhotoItem.jsx';
import {
  getAllPhotos,
  searchPhoto,
  deletePhoto,
} from '../../service/photoService.js';
import PhotoViewer from '../../components/PhotoViewer.jsx';
import { usePhotoContext } from '../../context/PhotoContext.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { getThemeColors } from '../../theme/appColors.js';
import {
  getCachedPhotos,
  setCachedPhotos,
  removePhotoFromCache,
} from '../../service/cacheService.js';

const numColumns = 4;

export default function Library() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({
    mediaTypes: 'photo',
  });
  const { photos, setPhotos, uploadProgress } = usePhotoContext();
  const { isDarkMode } = useThemeContext();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [filteredPhotos, setFilteredPhotos] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [isDeletingSelectedPhotos, setIsDeletingSelectedPhotos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef(null);

  const sourcePhotos = filteredPhotos ?? photos;
  const selectedCount = selectedPhotoIds.length;

  const clearSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedPhotoIds([]);
  }, []);

  // scroll to bottom (latest photo)
  useEffect(() => {
    if (photos.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [photos]);

  const handleGetPhotos = async () => {
    const t0 = Date.now();

    if (permissionResponse?.status !== 'granted') {
      const { status } = await requestPermission();
      if (status !== 'granted') return;
    }

    // check cache first
    const t1 = Date.now();
    const cached = await getCachedPhotos();
    console.log(`[1] getCachedPhotos took ${Date.now() - t1}ms — ${cached?.length ?? 0} items`);

    if (cached && cached.length > 0) {
      // show photos from cache immediately
      const t2 = Date.now();
      const sortedCached = cached
        .filter((photo) => photo?.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPhotos(sortedCached);
      console.log(`[2] setPhotos from cache took ${Date.now() - t2}ms — ${sortedCached.length} photos`);

      // verify if nasa db yung photos (photo_id)
      const t3 = Date.now();
      const dbPhotos = await getAllPhotos();
      console.log(`[3] getAllPhotos took ${Date.now() - t3}ms — ${dbPhotos?.length ?? 0} photos`);

      const dbPhotoIds = new Set(dbPhotos.map((p) => p.id));
      const cachedIds = new Set(cached.map((p) => p.id));

      const validCached = cached.filter((p) => dbPhotoIds.has(p.id));
      const missingFromCache = dbPhotos.filter((p) => !cachedIds.has(p.id));
      console.log(`[4] missing from cache: ${missingFromCache.length}`);

      // merge valid cached + missing photos (no URI resolution needed)
      const merged = [...validCached, ...missingFromCache]
        .filter((photo) => photo?.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setPhotos(merged);

      const t4 = Date.now();
      await setCachedPhotos(merged);
      console.log(`[5] setCachedPhotos took ${Date.now() - t4}ms`);

      console.log(`[TOTAL] handleGetPhotos (cache hit) took ${Date.now() - t0}ms`);
      return;
    }

    // fallback to supabase (if no photos in cache)
    setIsLoading(true);
    try {
      const t5 = Date.now();
      const assets = await getAllPhotos();
      console.log(`[6] getAllPhotos (no cache) took ${Date.now() - t5}ms — ${assets?.length ?? 0} photos`);

      if (!Array.isArray(assets) || assets.length === 0) return;

      // no resolvePhotoUri needed — expo-image renders device_asset_id directly
      const sorted = assets
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPhotos(sorted);

      const t6 = Date.now();
      await setCachedPhotos(sorted);
      console.log(`[7] setCachedPhotos took ${Date.now() - t6}ms`);

      console.log(`[TOTAL] handleGetPhotos (no cache) took ${Date.now() - t0}ms`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleGetPhotos();
  }, []);

  const handleSearch = async () => {
    try {
      setSearchLoading(true);
      setSearchError('');

      const assets = await searchPhoto(searchQuery);

      const sorted = assets
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setFilteredPhotos(sorted);
    } catch (e) {
      setFilteredPhotos(null);
      setSearchError(e.message || 'Search failed');
      console.error('Search error', e);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSelectedPhoto = useCallback((photoId) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
      return [...prev, photoId];
    });
  }, []);

  const handlePressPhoto = useCallback(
    ({ item }) => {
      if (isSelectionMode) {
        toggleSelectedPhoto(item.id);
        return;
      }

      const index = sourcePhotos.findIndex((p) => p.id === item.id);
      if (index !== -1) setSelectedIndex(index);
    },
    [isSelectionMode, sourcePhotos, toggleSelectedPhoto]
  );

  const handleLongPressPhoto = useCallback(
    ({ item }) => {
      if (!item?.id) return;
      if (!isSelectionMode) {
        setIsSelectionMode(true);
        setSelectedPhotoIds([item.id]);
        return;
      }
      toggleSelectedPhoto(item.id);
    },
    [isSelectionMode, toggleSelectedPhoto]
  );

  const viewerPhotos = sourcePhotos.map((photo) => ({ item: photo }));

  const handleDeleteSelectedPhoto = useCallback(async () => {
    if (selectedIndex === null || isDeletingPhoto) return;

    const photo = sourcePhotos[selectedIndex];
    if (!photo?.id) return;

    try {
      setIsDeletingPhoto(true);
      const deletedPhotoId = photo.id;

      await deletePhoto(deletedPhotoId);
      setPhotos((prev) => prev.filter((p) => p.id !== deletedPhotoId));
      if (filteredPhotos) {
        setFilteredPhotos((prev) => prev.filter((p) => p.id !== deletedPhotoId));
      }
      setSelectedPhotoIds((prev) => prev.filter((id) => id !== deletedPhotoId));
      await removePhotoFromCache(deletedPhotoId);
      setSelectedIndex(null);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeletingPhoto(false);
    }
  }, [isDeletingPhoto, selectedIndex, filteredPhotos, setPhotos, sourcePhotos]);

  const toggleSearch = () => {
    if (isSelectionMode) return;

    const toValue = isSearching ? 0 : 1;
    if (!isSearching) setIsSearching(true);

    Animated.timing(searchAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      if (toValue === 0) {
        setIsSearching(false);
        setSearchQuery('');
        setFilteredPhotos(null);
        setSearchError('');
        Keyboard.dismiss();
      }
    });
  };

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
                setPhotos((prev) => prev.filter((p) => !deletedSet.has(p.id)));
                if (filteredPhotos) {
                  setFilteredPhotos((prev) => prev.filter((p) => !deletedSet.has(p.id)));
                }
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
    setPhotos,
    filteredPhotos,
    clearSelection,
  ]);

  const renderPhotoItem = useCallback(
    ({ item }) => (
      <PhotoItem
        numColumns={numColumns}
        onPress={handlePressPhoto}
        onLongPress={handleLongPressPhoto}
        item={item}
        isSelected={selectedPhotoIds.includes(item.id)}
        selectionMode={isSelectionMode}
      />
    ),
    [handlePressPhoto, handleLongPressPhoto, selectedPhotoIds, isSelectionMode]
  );

  const titleOpacity = searchAnim.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0] });
  const searchWidth = searchAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '78%'] });
  const searchOpacity = searchAnim.interpolate({ inputRange: [0.2, 1], outputRange: [0, 1] });

  const uploadPct = uploadProgress
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  const colors = getThemeColors(isDarkMode);

  const bannerBg = isDarkMode ? '#1C1C1E' : '#F5F5F5';
  const bannerTrackBg = isDarkMode ? '#3A3A3C' : '#D4D4D8';
  const bannerSpinnerColor = isDarkMode ? '#A1A1AA' : '#52525B';
  const bannerTextColor = isDarkMode ? '#E4E4E7' : '#52525B';
  const bannerSubTextColor = isDarkMode ? '#71717A' : '#737373';

  return (
    <View className={`flex-1 ${colors.pageBg}`}>
      <View className={`${colors.headerBg} pt-16 pb-3 px-4 border-b ${colors.border}`}>
        {isSelectionMode ? (
          <View className="flex-row items-center justify-between">
            <Pressable onPress={clearSelection} className="py-1 pr-3">
              <Text className={`text-base ${colors.title}`}>Cancel</Text>
            </Pressable>
            <Text className={`text-lg font-semibold ${colors.title}`}>
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
          <View className="flex-row items-center justify-between">
            <Animated.Text
              style={{ opacity: titleOpacity, position: isSearching ? 'absolute' : 'relative' }}
              className={`text-3xl font-extrabold tracking-tight ${colors.title}`}
            >
              Photos
            </Animated.Text>

            {isSearching && (
              <Animated.View style={{ width: searchWidth, opacity: searchOpacity }}>
                <TextInput
                  placeholder="Search your photos..."
                  placeholderTextColor={colors.inputPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  autoFocus
                  className={`${colors.inputBg} rounded-xl px-4 py-2 ${colors.inputText} text-base`}
                  style={{ height: 40 }}
                  editable={!searchLoading}
                />
              </Animated.View>
            )}

            <View className="flex-row items-center pt-2">
              {!isSearching ? (
                <Pressable onPress={toggleSearch}>
                  <Ionicons name="search" size={25} color={colors.icon} />
                </Pressable>
              ) : (
                <Pressable onPress={toggleSearch} className="px-1 py-1">
                  <Text className={`text-base font-medium ${colors.title}`}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {!isSearching && !isSelectionMode && (
          <Text className={`text-xs mt-0.5 ${colors.count}`}>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </Text>
        )}
      </View>

      {uploadProgress && !isSelectionMode && (
        <Pressable
          onPress={() => router.push('/upload')}
          style={{ backgroundColor: bannerBg }}
          className="mx-3 mt-2 mb-1 rounded-2xl px-4 py-3 active:opacity-70"
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              {uploadProgress.done ? (
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              ) : (
                <ActivityIndicator size="small" color={bannerSpinnerColor} />
              )}
              <Text
                style={{ color: uploadProgress.done ? '#22C55E' : bannerTextColor }}
                className="font-semibold text-sm ml-2"
              >
                {uploadProgress.done
                  ? `${uploadProgress.total} photo${uploadProgress.total !== 1 ? 's' : ''} added`
                  : `Uploading... ${uploadProgress.current}/${uploadProgress.total}`}
              </Text>
            </View>
            <Text style={{ color: bannerSubTextColor }} className="text-xs">
              Tap to view
            </Text>
          </View>

          <View
            style={{ backgroundColor: bannerTrackBg }}
            className="h-1.5 rounded-full overflow-hidden"
          >
            <View
              className={`h-full rounded-full ${uploadProgress.done ? 'bg-[#22C55E]' : ''}`}
              style={{
                width: `${uploadPct}%`,
                backgroundColor: uploadProgress.done ? '#22C55E' : bannerSpinnerColor,
              }}
            />
          </View>
        </Pressable>
      )}

      <View className="flex-1 relative">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.loading} />
            <Text className={`mt-3 text-base ${colors.loadingText}`}>Loading photos...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={photos}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 2.5, paddingTop: 2, paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
            renderItem={renderPhotoItem}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}
        {isSearching && !isSelectionMode && (
          <View className={`absolute inset-0 ${colors.pageBg}`}>
            {searchLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.loading} />
                <Text className={`mt-3 text-base ${colors.loadingText}`}>Searching...</Text>
              </View>
            ) : searchError ? (
              <View className="flex-1 items-center justify-center px-6">
                <Text className={`text-base text-center ${colors.loadingText}`}>{searchError}</Text>
              </View>
            ) : filteredPhotos !== null ? (
              <FlatList
                data={filteredPhotos}
                numColumns={numColumns}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 2.5,
                  paddingTop: 2,
                  paddingBottom: 200,
                }}
                showsVerticalScrollIndicator={false}
                renderItem={renderPhotoItem}
              />
            ) : null}
          </View>
        )}
      </View>

      <PhotoViewer
        visible={selectedIndex !== null}
        photos={viewerPhotos}
        initialIndex={selectedIndex ?? 0}
        onClose={() => setSelectedIndex(null)}
        onDelete={handleDeleteSelectedPhoto}
        isDeleting={isDeletingPhoto}
      />
    </View>
  );
}
