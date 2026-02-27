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
  const [selectedPhoto, setSelectedPhoto] = useState(null);
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
        .filter(photo => photo && photo.photo_id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setPhotos(sortedCached);

      // verify if nasa db yung photos (photo_id)
      const dbPhotos = await getPhotos();
      const dbPhotoIds = new Set(dbPhotos.map(p => p.photo_id));
      const cachedIds = new Set(cached.map(p => p.photo_id));

      // remove photos that are no longer in the database
      const validCached = cached.filter(p => dbPhotoIds.has(p.photo_id));

      // check for photos with photo_id in database but not in cache
      const missingFromCache = dbPhotos.filter(p => !cachedIds.has(p.photo_id));

      // fetch URIs for missing photos
      const missingWithUris = await Promise.all(
        missingFromCache.map(async (photo) => {
          if (photo.uri) return photo;
          try {
            const uri = await getPhotoLocalURI(photo.photo_id);
            return { ...photo, uri };
          } catch (error) {
            console.error(`Error fetching URI for ${photo.photo_id}:`, error);
            return photo;
          }
        })
      );

      // merge valid cached + missing photos
      const merged = [...validCached, ...missingWithUris]
        .filter(photo => photo && photo.photo_id)
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
          const uri = await getPhotoLocalURI(photo.photo_id);
          return { ...photo, uri };
        } catch (error) {
          console.error(`Error fetching URI for ${photo.photo_id}:`, error);
          return photo;
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
            const uri = await getPhotoLocalURI(photo.photo_id);
            return { ...photo, uri };
          } catch (error) {
            console.error(`Error fetching URI for ${photo.photo_id}:`, error);
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
    console.log('Photo pressed:', item.item.photo_id);
    setSelectedPhoto(item);
  }, []);

  const handleDeleteSelectedPhoto = useCallback(async () => {
    if (!selectedPhoto?.item?.photo_id || isDeletingPhoto) return;

    try {
      setIsDeletingPhoto(true);
      const deletedPhotoId = selectedPhoto.item.photo_id;

      await deletePhoto(deletedPhotoId);
      setPhotos((prev) =>
        prev.filter((photo) => photo.photo_id !== deletedPhotoId)
      );
      await removePhotoFromCache(deletedPhotoId);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeletingPhoto(false);
    }
  }, [isDeletingPhoto, selectedPhoto, setPhotos]);
  
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
      <>
      <PhotoItem
        localUri={item.uri ?? null}
        numColumns={numColumns}
        onPress={handlePressPhoto}
        item={item}
      />
      </>
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
              <Pressable
                onPress={toggleSearch}
              >
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
        keyExtractor={(item) => item.photo_id}
        contentContainerStyle={{ paddingHorizontal: 2.5, paddingTop: 2 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderPhotoItem}
      />

      <PhotoViewer 
        visible={!!selectedPhoto} 
        photo={selectedPhoto} 
        onClose={() => setSelectedPhoto(null)} 
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