import { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, Text, Pressable, TextInput, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import FloatingMenu from '../../components/FloatingMenu.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';
import { getPhotos } from 'service/photoService.js';
import PhotoViewer from '../../components/PhotoViewer';

const numColumns = 4;

export default function Library() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({ mediaTypes: 'photo' });
  const [photos, setPhotos] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const menuAnim = useRef(new Animated.Value(0)).current;
  const searchWidth = useRef(new Animated.Value(0)).current;

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

  const appendPhoto = useCallback((newPhoto) => {
    setPhotos(prev => [...prev, newPhoto]);
  }, []);

  
  const toggleSearch = () => {
    const toValue = isSearching ? 0 : 1;
    if (!isSearching) setIsSearching(true);

    Animated.timing(searchWidth, { 
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

  return (
    <View className="flex-1 bg-white">
      {/* header */}
      <View className="flex-row items-center justify-between px-4 pt-16 pb-5 bg-[#F5F5F7]">
        {!isSearching ? <Text className="text-3xl font-bold">Photos</Text> : (
          <Animated.View
            style={{
              width: searchWidth.interpolate({ 
                inputRange: [0, 1], outputRange: ['0%', '75%'] 
              }),
            }}
          >
            <TextInput
              placeholder="Search photos..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              className="bg-gray-200 rounded-xl px-4 py-2"
            />
          </Animated.View>
        )}

        {!isSearching ? (
          <Pressable onPress={toggleSearch}>
            <Ionicons name="search" size={28} color="#000" />
          </Pressable>
        ) : (
          <Pressable onPress={toggleSearch} className="ml-3">
            <Text className="text-black text-lg">Cancel</Text>
          </Pressable>
        )}
      </View>

      {/* photo grid */}
      <FlatList
        data={photos}
        numColumns={numColumns}
        keyExtractor={(item) => item.photo_id}
        contentContainerStyle={{ paddingHorizontal: 2.5 }}
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