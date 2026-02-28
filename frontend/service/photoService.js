import { Platform } from 'react-native';
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

    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;

    const savedAsset = await MediaLibrary.createAssetAsync(result.assets[0].uri);
    const token = await getSession();
e
    const deviceAssetId =
        Platform.OS === 'ios'
            ? savedAsset.id
            : savedAsset.filename;

    const formData = new FormData();
    formData.append('image', {
        uri: result.assets[0].uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    });
    formData.append('device_asset_id', deviceAssetId);

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

// ios
const resolveAsset = async (photo) => {
    if (Platform.OS === 'ios') {
        return {
            ...photo,
            resolvedAssetId: photo.assetId || photo.uri,
            resolvedUri: photo.uri,
        };
    }

    // android
    if (photo.assetId) {
        try {
            const info = await MediaLibrary.getAssetInfoAsync(photo.assetId);
            return {
                ...photo,
                resolvedAssetId: info.filename || photo.assetId,
                resolvedUri: info.localUri || info.uri || photo.uri,
            };
        } catch (e) {
            console.warn('getAssetInfoAsync failed, falling back to URI filename:', e.message);
        }
    }

    const filename = photo.uri.split('/').pop();
    return {
        ...photo,
        resolvedAssetId: filename,
        resolvedUri: photo.uri,
    };
};

export const processPhotos = async (photos) => {
    const token = await getSession();

    if (!photos || photos.length === 0) throw new Error("No photos selected");

    const assets = await Promise.all(photos.map(resolveAsset));

    const formData = new FormData();

    if (assets.length === 1) {
        formData.append('image', {
            uri: assets[0].resolvedUri,
            name: 'photo.jpg',
            type: 'image/jpeg',
        });
        formData.append('device_asset_id', assets[0].resolvedAssetId);
    } else {
        assets.forEach((photo, index) => {
            formData.append('images', {
                uri: photo.resolvedUri,
                name: `photo_${index}.jpg`,
                type: 'image/jpeg',
            });
            formData.append('device_asset_id', photo.resolvedAssetId);
        });
    }

    const api = assets.length === 1 ? `${API_URL}/api/image` : `${API_URL}/api/images/batch`;

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
        return { added: [], duplicates: assets.length };
    }

    if (!response.ok) {
        console.error('processPhotos error:', data);
        return { added: [], duplicates: 0 };
    }

    if (assets.length === 1) {
        return {
            added: [{ id: data.photo?.id, device_asset_id: assets[0].resolvedAssetId, uri: assets[0].resolvedUri }],
            duplicates: 0
        };
    }

    const successfulResults = data.results || [];
    const added = successfulResults.map(r => ({
        id: r.photo?.id,
        device_asset_id: assets[r.index].resolvedAssetId,
        uri: assets[r.index].resolvedUri,
    }));
    return { added, duplicates: assets.length - added.length };
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
    if (
        photoId &&
        (photoId.startsWith('file://') ||
            photoId.startsWith('content://') ||
            photoId.startsWith('ph://'))
    ) {
        return photoId;
    }

    try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(photoId);
        return assetInfo.localUri || assetInfo.uri;
    } catch (error) {
        console.error("Asset not found:", photoId);
        throw error;
    }
};