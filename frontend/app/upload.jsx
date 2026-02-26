import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { processPhotos } from 'service/photoService';
import { usePhotoContext } from 'context/PhotoContext';

export default function Upload() {
  const router = useRouter();
  const { appendPhoto } = usePhotoContext();
  const [uploadState, setUploadState] = useState({ loading: false, count: 0, done: false });

  const handleSelectFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setUploadState({ loading: true, count: result.assets.length, done: false });

      try {
        await processPhotos(result.assets);

        result.assets.forEach((asset) => {
          const id = asset.assetId || asset.id;
          appendPhoto({ photo_id: id, uri: asset.uri });
        });

        setUploadState({ loading: false, count: result.assets.length, done: true });
        setTimeout(() => router.back(), 1200);
      } catch (e) {
        console.error('Upload failed', e);
        setUploadState({ loading: false, count: 0, done: false });
      }
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-4 pt-16 pb-4 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-4" disabled={uploadState.loading}>
          <Ionicons name="arrow-back" size={24} color={uploadState.loading ? '#ccc' : '#000'} />
        </Pressable>
        <Text className="text-2xl font-bold">Upload Photos</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <Pressable
          onPress={handleSelectFromGallery}
          disabled={uploadState.loading}
          className={`flex-row items-center p-5 mb-4 rounded-2xl active:opacity-70 ${
            uploadState.loading ? 'bg-gray-100' : 'bg-[#F5F5F7]'
          }`}
        >
          <View className="w-12 h-12 rounded-full items-center justify-center mr-4 bg-[#121212]">
            <Ionicons name="images-outline" size={22} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold">Choose from Gallery</Text>
            <Text className="text-gray-500 text-sm mt-0.5">Select one or more photos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </Pressable>

        {uploadState.loading && (
          <View className="mt-4 p-5 bg-[#F0F4FF] rounded-2xl flex-row items-center">
            <ActivityIndicator size="small" color="#3B5BDB" />
            <View className="ml-4 flex-1">
              <Text className="text-[#3B5BDB] font-semibold text-base">
                Analyzing {uploadState.count} photo{uploadState.count !== 1 ? 's' : ''}…
              </Text>
              <Text className="text-[#6681E0] text-sm mt-0.5">
                AI is describing and indexing your images
              </Text>
            </View>
          </View>
        )}

        {uploadState.done && !uploadState.loading && (
          <View className="mt-4 p-5 bg-[#F0FFF4] rounded-2xl flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            <View className="ml-4 flex-1">
              <Text className="text-green-700 font-semibold text-base">
                {uploadState.count} photo{uploadState.count !== 1 ? 's' : ''} added!
              </Text>
              <Text className="text-green-500 text-sm mt-0.5">Returning to your library…</Text>
            </View>
          </View>
        )}

        <View className="flex-row items-start mt-4 px-1">
          <Ionicons name="information-circle-outline" size={16} color="#999" style={{ marginTop: 2 }} />
          <Text className="text-gray-400 text-sm ml-1.5 flex-1">
            Photos will be analyzed and added to your library automatically.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}