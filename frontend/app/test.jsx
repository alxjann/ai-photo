import { useState, useEffect } from 'react';
import { View, FlatList, Dimensions, TextInput } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';

const numColumns = 4;

export default function test() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({mediaTypes: 'photo'});
  const [photos, setPhotos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  async function getPhotos() {
  if (permissionResponse?.status !== 'granted') {
    await requestPermission();
  }

  const { assets } = await MediaLibrary.getAssetsAsync({
    first: 100, // limit to 100 photos
    mediaType: 'photo',
    sortBy: 'creationTime'
  });

  setPhotos(assets);
}

  //all photos from the gallery
/*
  async function getPhotos() {
    if (permissionResponse?.status !== 'granted') {
      await requestPermission();
    }

    let allAssets = [];
    let hasNextPage = true;
    let endCursor = undefined;

    while (hasNextPage) {
      const { assets, endCursor: newEndCursor, hasNextPage: more } = await MediaLibrary.getAssetsAsync({
        first: 1000,
        after: endCursor,
        mediaType: 'photo',
        sortBy: 'creationTime'
      });

      allAssets = [...allAssets, ...assets];
      hasNextPage = more;
      endCursor = newEndCursor;
    }

    setPhotos(allAssets);
  }
  */

  useEffect(() => {
    getPhotos();
  }, []);

  return(
    <View className="flex-1 bg-gray-800">
      <TextInput
        className="bg-gray-700 text-white p-3 m-2 rounded-lg text-base"
        placeholder="Search photos..."
        placeholderTextColor="#9ca3af"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={photos}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.uri }}
            style={
              { 
                width: Dimensions.get('window').width / numColumns, 
                height: Dimensions.get('window').width / numColumns 
              }
            }
            contentFit="cover"
          />
        )}
      />
    </View>
  );
}