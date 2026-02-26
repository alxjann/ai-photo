import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { getSession } from './auth/authService';
import { API_URL } from 'config/api';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tiff', 'tif', 'gif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];

export const isImageAsset = (asset) => {
    if (asset.mediaType === 'video') return false;
    const ext = (asset.uri || asset.fileName || '').split('.').pop().toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) || asset.mediaType === 'photo';
};

export const isVideoAsset = (asset) => {
    if (asset.mediaType === 'video') return true;
    const ext = (asset.uri || asset.fileName || '').split('.').pop().toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
};

export const takePhoto = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Camera and Library access are required.');
        return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;

    const photo = await MediaLibrary.createAssetAsync(result.assets[0].uri);
    const token = await getSession();

    const formData = new FormData();
    formData.append('image', {
        uri: result.assets[0].uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    });
    formData.append('device_asset_id', photo.id);

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
        return { id: data.photo?.id, uri: result.assets[0].uri };
    } catch (error) {
        console.error("Upload failed", error);
        throw error;
    }
};

export const processPhotos = async (photos) => {
    const token = await getSession();
    if (!photos || photos.length === 0) throw new Error("No photos selected");

    const assets = photos.map((photo) => {
        const assetId = photo.fileName ? photo.fileName.replace(/\.[^/.]+$/, '') : null;
        return { ...photo, resolvedAssetId: assetId };
    });

    // Split into images (AI-processed) and videos/GIFs (stored as-is)
    const imageAssets = assets.filter(a => isImageAsset(a));
    const videoAssets = assets.filter(a => !isImageAsset(a));

    // Videos go straight to library without AI processing
    const videoResults = videoAssets.map(a => ({
        id: null,
        uri: a.uri,
        device_asset_id: a.resolvedAssetId,
        mediaType: 'video',
        isVideo: true,
    }));

    if (imageAssets.length === 0) {
        return { added: videoResults, duplicates: 0 };
    }

    const formData = new FormData();

    if (imageAssets.length === 1) {
        const ext = imageAssets[0].uri.split('.').pop().toLowerCase();
        const mimeType = ext === 'gif' ? 'image/gif'
            : ext === 'png' ? 'image/png'
            : ext === 'tiff' || ext === 'tif' ? 'image/tiff'
            : ext === 'webp' ? 'image/webp'
            : 'image/jpeg';

        formData.append('image', {
            uri: imageAssets[0].uri,
            name: `photo.${ext}`,
            type: mimeType,
        });
        formData.append('device_asset_id', imageAssets[0].resolvedAssetId);
    } else {
        imageAssets.forEach((photo, index) => {
            const ext = photo.uri.split('.').pop().toLowerCase();
            const mimeType = ext === 'gif' ? 'image/gif'
                : ext === 'png' ? 'image/png'
                : ext === 'tiff' || ext === 'tif' ? 'image/tiff'
                : ext === 'webp' ? 'image/webp'
                : 'image/jpeg';

            formData.append('images', {
                uri: photo.uri,
                name: `photo_${index}.${ext}`,
                type: mimeType,
            });
            formData.append('device_asset_id', photo.resolvedAssetId);
        });
    }

    const api = imageAssets.length === 1 ? `${API_URL}/api/image` : `${API_URL}/api/images/batch`;

    const response = await fetch(api, {
        method: 'POST',
        body: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
        },
    });

    const data = await response.json();

    if (response.status === 409 || data.error === 'Duplicate image') {
        return { added: videoResults, duplicates: imageAssets.length };
    }

    if (!response.ok) {
        console.error('processPhotos error:', data);
        return { added: videoResults, duplicates: 0 };
    }

    let imageResults = [];
    if (imageAssets.length === 1) {
        imageResults = [{ id: data.photo?.id, uri: imageAssets[0].uri }];
    } else {
        imageResults = (data.results || []).map(r => ({
            id: r.photo?.id,
            uri: imageAssets[r.index].uri,
        }));
    }

    return {
        added: [...imageResults, ...videoResults],
        duplicates: imageAssets.length - imageResults.length,
    };
};

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

        if (response.ok) {
            return data.results;
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
};