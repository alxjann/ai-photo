import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'photos_cache';

export const getCachedPhotos = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : Object.values(parsed).filter(v => v && typeof v === 'object' && v.device_asset_id);
  } catch (e) {
    console.error('getCachedPhotos', e);
    return null;
  }
};

export const setCachedPhotos = async (photos) => {
  try {
    const toSave = Array.isArray(photos) ? photos : Object.values(photos).filter(v => v && v.device_asset_id);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('setCachedPhotos', e);
  }
};

export const addPhotoToCache = async (photo) => {
  try {
    const existing = (await getCachedPhotos()) || [];
    const photos = Array.isArray(photo) ? photo : [photo];
    
    photos.forEach((p) => {
      const idx = existing.findIndex(e => e.device_asset_id === p.device_asset_id);
      if (idx >= 0)
        existing[idx] = { ...existing[idx], ...p };
      else
        existing.push(p);
    });

    await setCachedPhotos(existing);
  } catch (e) {
    console.error('addPhotoToCache', e);
  }
};

export const removePhotoFromCache = async (photoId) => {
  try {
    const existing = (await getCachedPhotos()) || [];
    const filtered = existing.filter(
      (photo) => photo.device_asset_id !== photoId
    );
    await setCachedPhotos(filtered);
  } catch (e) {
    console.error('removePhotoFromCache', e);
  }
}