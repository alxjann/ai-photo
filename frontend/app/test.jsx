import { useState, useEffect } from 'react';
import { View, FlatList, Dimensions, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { API_URL } from '../config';

const numColumns = 4;

export default function Test() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [photos, setPhotos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [description, setDescription] = useState('');


  const getPhotos = async() => {
    if (permissionResponse?.status !== 'granted') {
      await requestPermission();
    }
    
    const { assets }  = await MediaLibrary.getAssetsAsync({
      first: 100,
      mediaType: 'photo',
      sortBy: 'creationTime'
    });
 
    setPhotos(assets);
  }

  useEffect(() => {
    getPhotos();
  }, []);

  const addDescription = async(description) => {

    if (!description || !description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    console.log("button clicked")

    try {
      await fetch(`${API_URL}/api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description
        })
      });

    } catch (error) {
      console.error(error.message);
    }
  }

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
      <TextInput
        className="bg-gray-700 text-white p-3 m-2 rounded-lg text-base"
        placeholder="Set Description"
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={setDescription}
      />
      <TouchableOpacity
        className="py-5 bg-blue-600 rounded-lg mx-2 mb-2 items-center"
        onPress={() => addDescription(description)}
      >
        <Text>SEND POST REQUEST</Text>
      </TouchableOpacity>
    </View>
  );

}
