import { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, Text, Pressable, TextInput, Animated, Keyboard, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import FloatingMenu from '../../components/FloatingMenu.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';
import { getPhotos, deletePhoto, resolvePhotoUri } from '../../service/photoService.js';
import PhotoViewer from '../../components/PhotoViewer.jsx';
import { usePhotoContext } from '../../context/PhotoContext.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { getThemeColors } from '../../theme/appColors.js';
import { getCachedPhotos, setCachedPhotos, removePhotoFromCache } from '../../service/cacheService.js';

const numColumns = 4;

export default function Library() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({ mediaTypes: 'photo' });
  const { photos, setPhotos, appendPhoto, uploadProgress } = usePhotoContext();
  const { isDarkMode } = useThemeContext();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  const router = useRouter();
  const menuAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef(null);

  // scroll sa bottom part (latest photo)
  useEffect(() => {
    if (photos.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [photos]);

  const handleGetPhotos = async () => {
    if (permissionResponse?.status !== 'granted') {
      const { status } = await requestPermission();
      if (status !== 'granted') return;
    }

    // check cache first
    const cached = await getCachedPhotos();

    if (cached && cached.length > 0) {
      // show photos from cache immediately
      const sortedCached = cached
        .filter(photo => photo?.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPhotos(sortedCached);

      // verify if nasa db yung photos (photo_id)
      const dbPhotos = await getPhotos();
      const dbPhotoIds = new Set(dbPhotos.map(p => p.id));
      const cachedIds = new Set(cached.map(p => p.id));

      // remove photos that are no longer in the database
      const validCached = cached.filter(p => dbPhotoIds.has(p.id));

      // check for photos in database but not in cache
      const missingFromCache = dbPhotos.filter(p => !cachedIds.has(p.id));

      // fetch URIs for missing photos
      const missingWithUris = await Promise.all(missingFromCache.map(resolvePhotoUri));

      // merge valid cached + missing photos
      const merged = [...validCached, ...missingWithUris]
        .filter(photo => photo?.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setPhotos(merged);
      await setCachedPhotos(merged);
      return;
    }

    // fallback to supabase (if no photos in cache)
    const assets = await getPhotos();
    const photosWithUris = await Promise.all(assets.map(resolvePhotoUri));

    const sorted = photosWithUris
      .filter(Boolean)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setPhotos(sorted);
    await setCachedPhotos(sorted);
  };

  //useEffect(() => { handleGetPhotos(); }, []);
  useEffect(() => {
    if (!isSearching) {
      handleGetPhotos();
    }
  }, [isSearching]);
  //useEffect(() => { handleGetPhotos(); }, []);
  useEffect(() => {
    if (!isSearching) {
      handleGetPhotos();
    }
  }, [isSearching]);

  const handleSearch = async () => {
    try {
      setSearchLoading(true);
      if (!searchQuery || searchQuery.trim() === '') {
        await handleGetPhotos();
        return;
      }

      const assets = await getPhotos(searchQuery.trim());
      const photosWithUris = await Promise.all(assets.map(resolvePhotoUri));

      const sorted = photosWithUris
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPhotos(sorted);
    } catch (e) {
      console.error('Search error', e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePressPhoto = useCallback((item) => {
    console.log('Photo pressed:', item.item.id);
    const index = photos.findIndex(
      p => p.id === item.item.id
    );
    if (index !== -1) setSelectedIndex(index);
  }, [photos]);

  const viewerPhotos = photos.map(photo => ({ item: photo }));

  const handleDeleteSelectedPhoto = useCallback(async () => {
    if (selectedIndex === null || isDeletingPhoto) return;

    const photo = photos[selectedIndex];
    if (!photo?.id) return;

    try {
      setIsDeletingPhoto(true);
      const deletedPhotoId = photo.id;

      await deletePhoto(deletedPhotoId);
      setPhotos(prev => prev.filter((p) => p.id !== deletedPhotoId));
      await removePhotoFromCache(deletedPhotoId);
      setSelectedIndex(null);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeletingPhoto(false);
    }
  }, [isDeletingPhoto, selectedIndex, photos, setPhotos]);

  const toggleSearch = () => {
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
        Keyboard.dismiss();
      }
    });
  };

  const renderPhotoItem = useCallback(
    ({ item }) => (
      <PhotoItem
        localUri={item.uri ?? null}
        numColumns={numColumns}
        onPress={handlePressPhoto}
        item={item}
      />
    ),
    [handlePressPhoto]
  );

  const titleOpacity = searchAnim.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0] });
  const searchWidth = searchAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '78%'] });
  const searchOpacity = searchAnim.interpolate({ inputRange: [0.2, 1], outputRange: [0, 1] });

  const uploadPct = uploadProgress
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  const colors = getThemeColors(isDarkMode);

  return (
    <View className={`flex-1 ${colors.pageBg}`}>
      {/* header */}
      <View className={`${colors.headerBg} pt-16 pb-3 px-4 border-b ${colors.border}`}>
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
                className={`${colors.inputBg} rounded-xl px-4 py-3 ${colors.inputText} text-base`}
                editable={!searchLoading}
              />
            </Animated.View>
          )}

          <View className="flex-row items-center">
            {!isSearching ? (
              <Pressable onPress={toggleSearch}>
                <Ionicons name="search" size={20} color={colors.icon} />
              </Pressable>
            ) : (
              <Pressable onPress={toggleSearch} className="px-1 py-1">
                <Text className={`text-base font-medium ${colors.title}`}>Cancel</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* photo count */}
        {!isSearching && (
          <Text className={`text-xs mt-0.5 ${colors.count}`}>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </Text>
        )}
      </View>

      {/* upload progress banner */}
      {uploadProgress && (
        <Pressable
          onPress={() => router.push('/upload')}
          className="mx-3 mt-2 mb-1 bg-[#F5F5F5] rounded-2xl px-4 py-3 active:opacity-70"
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              {uploadProgress.done ? (
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              ) : (
                <ActivityIndicator size="small" color="#52525B" />
              )}
              <Text
                className={`font-semibold text-sm ml-2 ${
                  uploadProgress.done ? 'text-green-600' : 'text-[#52525B]'
                }`}
              >
                {uploadProgress.done
                  ? `${uploadProgress.total} photo${uploadProgress.total !== 1 ? 's' : ''} added`
                  : `Uploading... ${uploadProgress.current}/${uploadProgress.total}`}
              </Text>
            </View>
            <Text className="text-[#737373] text-xs">Tap to view</Text>
          </View>

          <View className="h-1.5 bg-[#D4D4D8] rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${uploadProgress.done ? 'bg-[#22C55E]' : 'bg-[#52525B]'}`}
              style={{ width: `${uploadPct}%` }}
            />
          </View>
        </Pressable>
      )}

      {/* photo grid or loading */}
      {searchLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.loading} />
          <Text className={`mt-3 text-base ${colors.loadingText}`}>Searching...</Text>
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

      <PhotoViewer
        visible={selectedIndex !== null}
        photos={viewerPhotos}
        initialIndex={selectedIndex ?? 0}
        onClose={() => setSelectedIndex(null)}
        onDelete={handleDeleteSelectedPhoto}
        isDeleting={isDeletingPhoto}
      />

      {/* + button 
      <FloatingMenu
        menuAnim={menuAnim}
        appendPhoto={appendPhoto}
      />
      
      
      */}
      
    </View>
  );
}

