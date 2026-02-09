import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image, Alert,
  ActivityIndicator, Keyboard, TouchableWithoutFeedback,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config/api';


const BACKEND_URL = API_URL;
export default function Upload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [descriptiveTag, setDescriptiveTag] = useState('');
  const [literalTag, setLiteralTag] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  // upload 
  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (!descriptiveTag.trim() || !literalTag.trim()) {
      Alert.alert('Error', 'Please fill in both tags');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // this add image file
      formData.append('image', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: selectedImage.fileName || 'photo.jpg',
      });

      // this add tags
      formData.append('descriptiveTag', descriptiveTag);
      formData.append('literalTag', literalTag);

      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Image uploaded successfully!');
        setSelectedImage(null);
        setDescriptiveTag('');
        setLiteralTag('');
      } else {
        Alert.alert('Error', data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView className="flex-1 bg-gray-900 p-4">
          <Text className="text-white text-2xl font-bold mb-6 mt-10">Upload Photo</Text>

      {/* Image Preview */}
      {selectedImage ? (
        <View className="mb-6">
          <Image 
            source={{ uri: selectedImage.uri }} 
            className="w-full h-64 rounded-lg"
            resizeMode="cover"
          />
          <TouchableOpacity 
            onPress={pickImage}
            className="mt-3 bg-gray-700 p-3 rounded-lg"
          >
            <Text className="text-white text-center">Change Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          onPress={pickImage}
          className="bg-blue-600 p-4 rounded-lg mb-6 h-64 justify-center items-center border-2 border-dashed border-blue-400"
        >
          <Text className="text-white text-lg">📷 Select Image</Text>
        </TouchableOpacity>
      )}

      {/* Descriptive Tag Input */}
      <View className="mb-4">
        <Text className="text-white text-lg mb-2">Descriptive Tag</Text>
        <Text className="text-gray-400 text-sm mb-2">
          Describe the context or scenario (e.g., "studying at night", "beach sunset with friends")
        </Text>
        <TextInput
          className="bg-gray-800 text-white p-4 rounded-lg"
          placeholder="Enter descriptive context..."
          placeholderTextColor="#6b7280"
          value={descriptiveTag}
          onChangeText={setDescriptiveTag}
          multiline
        />
      </View>

      {/* Literal Tag Input */}
      <View className="mb-6">
        <Text className="text-white text-lg mb-2">Literal Tag</Text>
        <Text className="text-gray-400 text-sm mb-2">
          List what's in the image (e.g., "person, laptop, desk, lamp")
        </Text>
        <TextInput
          className="bg-gray-800 text-white p-4 rounded-lg"
          placeholder="Enter literal tags..."
          placeholderTextColor="#6b7280"
          value={literalTag}
          onChangeText={setLiteralTag}
          multiline
        />
      </View>

      {/* Upload Button */}
      <TouchableOpacity 
        onPress={handleUpload}
        disabled={uploading}
        className={`p-4 rounded-lg ${uploading ? 'bg-gray-600' : 'bg-green-600'}`}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center text-lg font-bold">Upload</Text>
        )}
      </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}