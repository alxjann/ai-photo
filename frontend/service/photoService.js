import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { getSession } from './auth/authService';
import { API_URL } from 'config/api';

export const takePhoto = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Camera and Library access are required.');
        return;
    }

    const result = await ImagePicker.launchCameraAsync({
        quality: 1,
    });

    if (result.canceled) return;

    const photo = await MediaLibrary.createAssetAsync(result.assets[0].uri);

    console.log('Take photo:', photo.id)

    const token = await getSession();

    const formData = new FormData();
    formData.append('image', {
      uri: result.assets[0].uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
    formData.append('asset_id', photo.id);

    try {
      const response = await fetch(`${API_URL}/api/image`, {
        method: 'POST',
        body: formData,
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();
      // Return an object with asset id and uri for the grid
      return { photo_id: photo.id, uri: result.assets[0].uri };
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }


}

export const processPhotos = async (photos) => {

  if (!photos || photos.lengths === 0)
    throw new Error("No photos selected");

  const token = await getSession();

  const formData = new FormData();
  formData.append('image', {
      uri: result.assets[0].uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
  });

  try {
    const response = await fetch(`${API_URL}/api/image`, {
        method: 'POST',
        body: formData,
        headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
        },
    });

    //const data = await response.json();
    //return result.assets[0].uri;
  } catch (error) {
    console.error("Processing photo failed", error);
    throw error;
  }

}

export const getPhotos = async () => {
  try {
    const token = await getSession();

    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: '' }),
    });

    const data = await response.json();
    //console.log(data.result[0].photo_id)
    //console.log(data.result)

    if (response.ok) {
      return data.result;
    } else {
      throw new Error(data.error || 'Failed to load photos');
    }
  } catch (error) {
    console.error("getPhotos Service Error:", error.message);
    throw error; 
  }
};

export const getPhotoLocalURI = async (photoId) => {
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(photoId);
    return assetInfo.localUri || assetInfo.uri;
  } catch (error) {
    console.error("Asset not found:", photoId);
    throw error;
  }
}