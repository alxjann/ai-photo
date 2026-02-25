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
    formData.append('photo_id', photo.id);

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
      return { photo_id: photo.id, uri: result.assets[0].uri };
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }


}

export const processPhotos = async (photos) => {
  const token = await getSession();
  console.log('Photo count:', photos.length)

  if (!photos || photos.length === 0) throw new Error("No photos selected");

  const formData = new FormData();

  if (photos.length === 1) {
    formData.append('image', {
        uri: photos[0].uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    });
    formData.append('photo_id', photos[0].assetId);
  } else {
    photos.forEach((photo, index) => {
      console.log('PHOTO URI:', photo.uri)
      formData.append('images', {
        uri: photo.uri,
        name: `photo_${index}.jpg`,
        type: 'image/jpeg',
      });
      formData.append('photo_id', photo.assetId);
      console.log(photo.assetId)
    });
  }

  try {
    const api = (photos.length === 1) ? `${API_URL}/api/image` : `${API_URL}/api/images/batch`;
    
    const response = await fetch(api, {
        method: 'POST',
        body: formData,
        headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
        },
    });

    const data = await response.json();
    //console.log('POST RESPONSE:', data)
    //return result.assets[0].uri;
  } catch (error) {
    console.error("Processing photo failed", error);
  }
}

export const getPhotos = async (query = '') => {
  try {
    const token = await getSession();

    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query }),
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