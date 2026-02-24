import { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, Text, Pressable, TextInput, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import FloatingMenu from '../../components/FloatingMenu.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';
import { getPhotos } from 'service/photoService.js';
import PhotoViewer from '../../components/PhotoViewer';
import { usePhotoContext } from 'context/PhotoContext.jsx';

const numColumns = 4;

export default function Library() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({ mediaTypes: 'photo' });
  const { photos, setPhotos, appendPhoto } = usePhotoContext();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const menuAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  const handleGetPhotos = async () => {
    if (permissionResponse?.status !== 'granted') {
      const { status } = await requestPermission();
      if (status !== 'granted') return;
    }
    const assets = await getPhotos();
    setPhotos(assets);
  };
  
  useEffect(() => { handleGetPhotos(); }, []);

  const handlePressPhoto = useCallback((item) => {
    setSelectedPhoto(item);
  }, []);
  
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
        photoId={item.photo_id}
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
      />

      {/* + button */}
      <FloatingMenu 
        menuAnim={menuAnim} 
        appendPhoto={appendPhoto}
      />      
    </View>
  );
}