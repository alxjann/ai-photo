import { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, Text, Pressable, TextInput, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import FloatingMenu from '../../components/FloatingMenu.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';
import { getPhotos, getPhotoLocalURI, deletePhoto } from 'service/photoService.js';
import PhotoViewer from '../../components/PhotoViewer.jsx';
import { usePhotoContext } from 'context/PhotoContext.jsx';
import { getCachedPhotos, setCachedPhotos, removePhotoFromCache } from '../../service/cacheService.js';

const numColumns = 4;

export default function Library() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({ mediaTypes: 'photo' });
  const { photos, setPhotos, appendPhoto } = usePhotoContext();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  const menuAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

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
        .filter(photo => photo && photo.device_asset_id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPhotos(sortedCached);

      // verify if nasa db yung photos (photo_id)
      const dbPhotos = await getPhotos();
      const dbPhotoIds = new Set(dbPhotos.map(p => p.device_asset_id));
      const cachedIds = new Set(cached.map(p => p.device_asset_id));

      // remove photos that are no longer in the database
      const validCached = cached.filter(p => dbPhotoIds.has(p.device_asset_id));

      // check for photos with photo_id in database but not in cache
      const missingFromCache = dbPhotos.filter(p => !cachedIds.has(p.device_asset_id));

      // fetch URIs for missing photos
      const missingWithUris = await Promise.all(
        missingFromCache.map(async (photo) => {
          if (photo.uri) return photo;
          try {
            const uri = await getPhotoLocalURI(photo.device_asset_id);
            return { ...photo, uri };
          } catch (error) {
            // verify if na delete ba talaga yung photo
            const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.device_asset_id);
            if (assetInfo) {
                // asset still exists, uri fetch failed for a different reason
                console.log(`Asset ${photo.device_asset_id} still exists, skipping deletion`);
                return { ...photo, uri };
            } else {
                console.log(`Asset ${photo.device_asset_id} confirmed deleted`);
                //delete photo from cache and database
                await deletePhoto(photo.device_asset_id); 
                await removePhotoFromCache(photo.device_asset_id);
                return null;
            }
          }
        })
      );

      // merge valid cached + missing photos
      const merged = [...validCached, ...missingWithUris]
        .filter(photo => photo && photo.device_asset_id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setPhotos(merged);
      await setCachedPhotos(merged);
      return;
    }

    // fallback to supabase (if no photos in cache)
    const assets = await getPhotos();
    const photosWithUris = await Promise.all(
      assets.map(async (photo) => {
        if (photo.uri) return photo;
        try {
          const uri = await getPhotoLocalURI(photo.device_asset_id);
          return { ...photo, uri };
        } catch (error) {
          // verify if na delete ba talaga yung photo
          const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.device_asset_id);
            if (assetInfo) {
                // asset still exists, uri fetch failed for a different reason
                console.log(`Asset ${photo.device_asset_id} still exists, skipping deletion`);
                return { ...photo, uri };
            } else {
                console.log(`Asset ${photo.device_asset_id} confirmed deleted`);
                //delete photo from cache and database
                await deletePhoto(photo.device_asset_id); 
                await removePhotoFromCache(photo.device_asset_id);
                return null;
            }
        }
      })
    );

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

  const handleSearch = async () => {
    try {
      if (!searchQuery || searchQuery.trim() === '') {
        await handleGetPhotos();
        return;
      }

      const assets = await getPhotos(searchQuery.trim());
      const photosWithUris = await Promise.all(
        assets.map(async (photo) => {
          if (photo.uri) return photo;
          try {
            const uri = await getPhotoLocalURI(photo.device_asset_id);
            return { ...photo, uri };
          } catch (error) {
            console.error(`Error fetching URI for ${photo.device_asset_id}:`, error);
            return photo;
          }
        })
      );

      const sorted = photosWithUris
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPhotos(sorted);
    } catch (e) {
      console.error('Search error', e);
    }
  };

  const handlePressPhoto = useCallback((item) => {
    console.log('Photo pressed:', item.item.device_asset_id);
    const index = photos.findIndex(
      p => p.device_asset_id === item.item.device_asset_id
    );
    if (index !== -1) setSelectedIndex(index);
  }, [photos]);

  // photos array for PhotoViewer
  const viewerPhotos = photos.map(photo => ({
    item: photo,
    uri: photo.uri ?? null,
  }));

  const handleDeleteSelectedPhoto = useCallback(async () => {
    if (selectedIndex === null || isDeletingPhoto) return;

    const photo = photos[selectedIndex];
    if (!photo?.device_asset_id) return;

    try {
      setIsDeletingPhoto(true);
      const deletedPhotoId = photo.device_asset_id;

      await deletePhoto(deletedPhotoId);
      setPhotos((prev) =>
        prev.filter((p) => p.device_asset_id !== deletedPhotoId)
      );
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
      toValue: toValue,
      duration: 250,
      useNativeDriver: false
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

  return (
    <View className="flex-1 bg-white">
      {/* header */}
      <View className="bg-white pt-16 pb-3 px-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Animated.Text
            style={{ opacity: titleOpacity, position: isSearching ? 'absolute' : 'relative' }}
            className="text-3xl font-extrabold text-gray-900 tracking-tight"
          >
            Photos
          </Animated.Text>

          {isSearching && (
            <Animated.View style={{ width: searchWidth, opacity: searchOpacity }}>
              <TextInput
                placeholder="Search your photos..."
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoFocus
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 text-base"
              />
            </Animated.View>
          )}

          <View className="flex-row items-center">
            {!isSearching ? (
              <Pressable onPress={toggleSearch}>
                <Ionicons name="search" size={20} color="#111" />
              </Pressable>
            ) : (
              <Pressable onPress={toggleSearch} className="px-1 py-1">
                <Text className="text-base font-medium text-gray-900">Cancel</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* photo count */}
        {!isSearching && (
          <Text className="text-xs text-gray-400 mt-0.5">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </Text>
        )}
      </View>

      {/* photo grid */}
      <FlatList
        data={photos}
        numColumns={numColumns}
        keyExtractor={(item) => item.device_asset_id}
        contentContainerStyle={{ paddingHorizontal: 2.5, paddingTop: 2 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderPhotoItem}
      />

      <PhotoViewer
        visible={selectedIndex !== null}
        photos={viewerPhotos}
        initialIndex={selectedIndex ?? 0}
        onClose={() => setSelectedIndex(null)}
        onDelete={handleDeleteSelectedPhoto}
        isDeleting={isDeletingPhoto}
      />

      {/* + button */}
      <FloatingMenu
        menuAnim={menuAnim}
        appendPhoto={appendPhoto}
      />
    </View>
  );
}