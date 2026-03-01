import { View, Text, Pressable, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect, useRef } from 'react';
import { processPhotos } from 'service/photoService';
import { usePhotoContext } from 'context/PhotoContext';
import { addPhotoToCache } from 'service/cacheService';

export default function Upload() {
  const router = useRouter();
  const { appendPhoto, uploadProgress, setUploadProgress } = usePhotoContext();

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!uploadProgress) return;
    const pct = uploadProgress.total > 0
      ? uploadProgress.current / uploadProgress.total
      : 0;
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress?.current]);

  const handleSelectFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const total = result.assets.length;
      setUploadProgress({ current: 0, total, done: false });
      progressAnim.setValue(0);

      try {
        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];

          const res = await processPhotos([asset]);

          if (res?.photo) {
            const newPhoto = {
              device_asset_id: res.photo.device_asset_id,
              uri: asset.uri,
              descriptive: res.photo.descriptive || null,
              literal: res.photo.literal || null,
              manual_description: res.photo.manual_description || null,
              id: res.photo.id || null,
              category: res.photo.category,
              created_at: res.photo.created_at || null,
            };
            appendPhoto(newPhoto);
            await addPhotoToCache([newPhoto]);
          }

          setUploadProgress({ current: i + 1, total, done: false });
        }

        setUploadProgress({ current: total, total, done: true });

        setTimeout(() => {
          setUploadProgress(null);
          router.back();
        }, 1500);
      } catch (e) {
        console.log('Upload failed', e);
        setUploadProgress(null);
      }
    }
  };

  const isUploading = uploadProgress && !uploadProgress.done;
  const isDone = uploadProgress?.done;
  const pct = uploadProgress
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  return (
    <View className="flex-1 bg-white">
      {/* header */}
      <View className="flex-row items-center px-4 pt-16 pb-4 border-b border-gray-100">
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/');
            }
          }} 
          className="mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-2xl font-bold">Upload Photos</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">

        {/* pick from gallery button — hidden while uploading */}
        {!isUploading && !isDone && (
          <Pressable
            onPress={handleSelectFromGallery}
            className="flex-row items-center p-5 mb-4 rounded-2xl active:opacity-70 bg-[#F5F5F7]"
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
        )}

        {/* upload progress card */}
        {isUploading && (
          <View className="mb-4 p-5 bg-[#F0F4FF] rounded-2xl">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-[#3B5BDB] items-center justify-center mr-3">
                <ActivityIndicator size="small" color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-[#3B5BDB] font-bold text-base">
                  Analyzing your photos
                </Text>
                <Text className="text-[#6681E0] text-sm mt-0.5">
                  AI is describing and indexing your images
                </Text>
              </View>
              <Text className="text-[#3B5BDB] font-bold text-base ml-2">
                {pct}%
              </Text>
            </View>

            <View className="h-2 bg-[#D9E2FF] rounded-full overflow-hidden">
              <Animated.View
                className="h-full bg-[#3B5BDB] rounded-full"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            </View>

            <View className="flex-row justify-between mt-2">
              <Text className="text-[#6681E0] text-xs">
                {uploadProgress.current} of {uploadProgress.total} photo{uploadProgress.total !== 1 ? 's' : ''} done
              </Text>
              <Text className="text-[#6681E0] text-xs">
                {uploadProgress.total - uploadProgress.current} remaining
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-1.5 mt-4">
              {Array.from({ length: uploadProgress.total }).map((_, i) => (
                <View
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < uploadProgress.current
                      ? 'bg-[#3B5BDB]'
                      : 'bg-[#D9E2FF]'
                  }`}
                />
              ))}
            </View>
          </View>
        )}
        
        {isDone && (
          <View className="mb-4 p-5 bg-[#F0FFF4] rounded-2xl">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#22C55E] items-center justify-center mr-3">
                <Ionicons name="checkmark" size={22} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-green-700 font-bold text-base">
                  All done!
                </Text>
                <Text className="text-green-600 text-sm mt-0.5">
                  {uploadProgress.total} photo{uploadProgress.total !== 1 ? 's' : ''} added to your library
                </Text>
              </View>
            </View>
            <View className="h-2 bg-green-100 rounded-full overflow-hidden mt-4">
              <View className="h-full bg-[#22C55E] rounded-full w-full" />
            </View>
          </View>
        )}

        {!isUploading && !isDone && (
          <View className="flex-row items-start mt-4 px-1">
            <Ionicons name="information-circle-outline" size={16} color="#999" style={{ marginTop: 2 }} />
            <Text className="text-gray-400 text-sm ml-1.5 flex-1">
              Photos will be analyzed and added to your library automatically.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}