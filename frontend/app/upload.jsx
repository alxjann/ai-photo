import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { processPhotos, takePhoto } from 'service/photoService';
import { usePhotoContext } from 'context/PhotoContext';

export default function Upload() {
  const router = useRouter();
  const { appendPhoto } = usePhotoContext();

  const handleSelectFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
    	await processPhotos(result.assets)

			try {
				result.assets.forEach((asset) => {
					const id = asset.assetId || asset.id;
					appendPhoto({ photo_id: id, uri: asset.uri });
				});
			} catch (e) {
				console.error('Appending photos failed', e);
			}
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-4 pt-16 pb-4 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-2xl font-bold">Upload Photos</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* open gallery */}
        <Pressable
          onPress={handleSelectFromGallery}
          className="flex-row items-center p-5 mb-4 bg-[#F5F5F7] rounded-2xl active:opacity-70"
        >
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-4 bg-[#121212]"
          >
            <Ionicons name="images-outline" size={22} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold">Choose from Gallery</Text>
            <Text className="text-gray-500 text-sm mt-0.5">Select one or more photos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </Pressable>

        <View className="flex-row items-start mt-2 px-1">
          <Ionicons name="information-circle-outline" className="mt-[0.5]" size={16} color="#999" />
          <Text className="text-gray-400 text-sm ml-1.5 flex-1">
            Photos will be analyzed and added to your library automatically.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}