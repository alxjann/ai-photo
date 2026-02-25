import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'photos_cache';

export const getCachedPhotos = async() => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('getCachedPhotos', e);
    return null;
  }
}

export const setCachedPhotos = async(photos) => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(photos));
  } catch (e) {
    console.error('setCachedPhotos', e);
  }
}

export const addPhotoToCache = async(photo) => {
  try {
    const existing = (await getCachedPhotos()) || [];
    const idx = existing.findIndex(p => p.photo_id === photo.photo_id);
    if (idx >= 0) 
        existing[idx] = { ...existing[idx], ...photo };
    else 
        existing.push(photo);
    
    await setCachedPhotos(existing);
  } catch (e) {
    console.error('addPhotoToCache', e);
  }
}