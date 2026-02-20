import { useState, useEffect, useLayoutEffect } from 'react';
import { View, FlatList, Dimensions, Text, Pressable } from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';

const numColumns = 4;

export default function test() {
  const navigation = useNavigation();
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({mediaTypes: 'photo'});
  const [photos, setPhotos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleStyle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginLeft: 0,
        marginTop: 0,
        alignSelf: 'center',
      },
      headerRight: () => (
        <>
        <Pressable
          onPress={() => {}}
          className="mr-4 items-center justify-center h-full"
        >
          <Ionicons name="search" size={28} color="#000" />
        </Pressable>
        <Pressable
          onPress={() => {}}
          className="mr-4 items-center justify-center h-full"
        >
          {/*<Text className="bg-gray-400 p-2 rounded-2xl">Select</Text> */}
        </Pressable>
        </>
      ),
    });
  }, [navigation]);

  const getPhotos = async () => {
    if (permissionResponse?.status !== 'granted')
      await requestPermission();

    const { assets } = await MediaLibrary.getAssetsAsync({
      first: 100, // limit to 100 photos
      mediaType: 'photo',
      sortBy: 'creationTime'
    });

    setPhotos(assets);
  }

  useEffect(() => {
    getPhotos();
  }, []);

  return(
    <View className="flex-1 bg-white">
      <FlatList
        data={photos}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 2.5 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const totalHorizontalPadding = 2 * 2;
          const size = (Dimensions.get('window').width - totalHorizontalPadding) / numColumns - 4;
          return (
            <View className="m-0.5 overflow-hidden">
              <Image
                source={{ uri: item.uri }}
                style={{
                  width: size,
                  height: size,
                }}
                contentFit="cover"
              />
            </View>
          );
        }}
      />
    </View>
  );
}