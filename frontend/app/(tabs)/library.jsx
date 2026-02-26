import { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, Text, Pressable, TextInput, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingMenu from '../../components/FloatingMenu.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';
import { getPhotos, getPhotoLocalURI, processPhotos, isImageAsset } from 'service/photoService.js';
import PhotoViewer from '../../components/PhotoViewer.jsx';
import { usePhotoContext } from 'context/PhotoContext.jsx';
import { setCachedPhotos, getCachedPhotos } from '../../service/cacheService.js';

const numColumns = 4;
const INITIAL_SYNC_KEY = 'has_completed_initial_sync';
const INITIAL_SYNC_BATCH_SIZE = 5;
const INITIAL_SYNC_LIMIT = 100;

export default function Library() {
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({ mediaTypes: 'photo' });
    const { photos, setPhotos, appendPhoto } = usePhotoContext();
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null); // { current, total } or null
    const allPhotosRef = useRef([]);

    const menuAnim = useRef(new Animated.Value(0)).current;
    const searchAnim = useRef(new Animated.Value(0)).current;

    const resolveUris = async (list) => {
        const withUris = await Promise.all(
            list.map(async (photo) => {
                if (photo.uri) return photo;
                if (photo.device_asset_id) {
                    try {
                        const uri = await getPhotoLocalURI(photo.device_asset_id);
                        return { ...photo, uri };
                    } catch (error) {
                        console.warn(`Device asset not found for ${photo.device_asset_id}`);
                    }
                }
                return photo;
            })
        );
        return withUris.filter(Boolean);
    };

    const handleGetPhotos = async () => {
        if (permissionResponse?.status !== 'granted') {
            const { status } = await requestPermission();
            if (status !== 'granted') return;
        }

        const assets = await getPhotos();
        const sorted = (await resolveUris(assets))
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        allPhotosRef.current = sorted;
        setPhotos(sorted);
        await setCachedPhotos(sorted);
    };

    // Auto-process first 100 photos on first install
    const runInitialSync = async () => {
        try {
            const already = await AsyncStorage.getItem(INITIAL_SYNC_KEY);
            if (already) return;

            let permission = permissionResponse;
            if (permission?.status !== 'granted') {
                const { status } = await requestPermission();
                if (status !== 'granted') return;
            }

            // Grab 100 most recent assets from device
            const { assets: deviceAssets } = await MediaLibrary.getAssetsAsync({
                mediaType: ['photo', 'video'],
                first: INITIAL_SYNC_LIMIT,
                sortBy: MediaLibrary.SortBy.creationTime,
            });

            if (!deviceAssets || deviceAssets.length === 0) {
                await AsyncStorage.setItem(INITIAL_SYNC_KEY, 'true');
                return;
            }

            // Show local thumbnails immediately before AI processing
            const localPhotos = deviceAssets.map(a => ({
                id: a.id,
                device_asset_id: a.id,
                uri: a.uri,
                mediaType: a.mediaType,
                isVideo: a.mediaType === 'video',
                created_at: new Date(a.creationTime).toISOString(),
            }));
            setPhotos(localPhotos);
            allPhotosRef.current = localPhotos;

            // Only process image assets through AI — skip videos
            // Map MediaLibrary assets to the shape processPhotos expects,
            // explicitly setting fileName to the asset id so resolvedAssetId is correct
            const imageAssets = deviceAssets
                .filter(a => a.mediaType !== 'video')
                .map(a => ({ ...a, fileName: a.id }));
            const totalImages = imageAssets.length;

            setSyncProgress({ current: 0, total: totalImages });

            // Process in batches so we don't hammer the server
            for (let i = 0; i < imageAssets.length; i += INITIAL_SYNC_BATCH_SIZE) {
                const batch = imageAssets.slice(i, i + INITIAL_SYNC_BATCH_SIZE);

                try {
                    await processPhotos(batch);
                } catch (e) {
                    console.warn('Batch failed, continuing:', e.message);
                }

                setSyncProgress({ current: Math.min(i + INITIAL_SYNC_BATCH_SIZE, totalImages), total: totalImages });
            }

            // Mark sync done, then reload from server to get AI-enriched data
            await AsyncStorage.setItem(INITIAL_SYNC_KEY, 'true');
            setSyncProgress(null);
            await handleGetPhotos();

        } catch (e) {
            console.error('Initial sync failed:', e);
            setSyncProgress(null);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await handleGetPhotos();
        setIsRefreshing(false);
    };

    useEffect(() => {
        const init = async () => {
            // Load cached photos instantly so UI isn't empty
            const cached = await getCachedPhotos();
            if (cached && cached.length > 0) {
                setPhotos(cached);
                allPhotosRef.current = cached;
            }

            // Check if we need initial sync or just a normal load
            const synced = await AsyncStorage.getItem(INITIAL_SYNC_KEY);
            if (synced) {
                await handleGetPhotos();
            } else {
                await runInitialSync();
            }
        };
        init();
    }, []);

    const handleSearch = async () => {
        try {
            if (!searchQuery || searchQuery.trim() === '') {
                setPhotos(allPhotosRef.current);
                return;
            }

            const assets = await getPhotos(searchQuery.trim());
            console.log('assets returned:', assets?.length, JSON.stringify(assets?.[0]));

            const resolved = await resolveUris(assets);
            console.log('resolved:', resolved?.length, 'first uri:', resolved?.[0]?.uri);

            setPhotos(resolved);
        } catch (e) {
            console.error('Search error', e);
        }
    };

    const handlePressPhoto = useCallback((item) => {
        setSelectedPhoto(item);
    }, []);

    const toggleSearch = () => {
        const toValue = isSearching ? 0 : 1;
        if (!isSearching) setIsSearching(true);

        Animated.timing(searchAnim, {
            toValue,
            duration: 250,
            useNativeDriver: false
        }).start(() => {
            if (toValue === 0) {
                setIsSearching(false);
                setSearchQuery('');
                setPhotos(allPhotosRef.current);
                Keyboard.dismiss();
            }
        });
    };

    const renderPhotoItem = useCallback(
        ({ item }) => (
            <PhotoItem
                photoId={item.device_asset_id}
                localUri={item.uri ?? null}
                numColumns={numColumns}
                onPress={handlePressPhoto}
                item={item}
            />
        ),
        [handlePressPhoto]
    );

    const titleOpacity = searchAnim.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0] });
    const searchWidth = searchAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '78%'] });
    const searchOpacity = searchAnim.interpolate({ inputRange: [0.2, 1], outputRange: [0, 1] });

    const syncPercent = syncProgress ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;

    return (
        <View className="flex-1 bg-white">
            <View className="bg-white pt-16 pb-3 px-4 border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                    <Animated.Text
                        style={{ opacity: titleOpacity, position: isSearching ? 'absolute' : 'relative' }}
                        className="text-3xl font-extrabold text-gray-900 tracking-tight"
                    >
                        Photos
                    </Animated.Text>

                    {isSearching && (
                        <Animated.View style={{ width: searchWidth, opacity: searchOpacity }}>
                            <TextInput
                                placeholder="Search your photos..."
                                placeholderTextColor="#aaa"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={handleSearch}
                                autoFocus
                                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 text-base"
                            />
                        </Animated.View>
                    )}

                    <View className="flex-row items-center gap-4">
                        {!isSearching ? (
                            <>
                                <Pressable onPress={handleRefresh} disabled={isRefreshing}>
                                    <Ionicons
                                        name="refresh"
                                        size={20}
                                        color={isRefreshing ? '#ccc' : '#111'}
                                    />
                                </Pressable>
                                <Pressable onPress={toggleSearch}>
                                    <Ionicons name="search" size={20} color="#111" />
                                </Pressable>
                            </>
                        ) : (
                            <Pressable onPress={toggleSearch} className="px-1 py-1">
                                <Text className="text-base font-medium text-gray-900">Cancel</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {!isSearching && (
                    <Text className="text-xs text-gray-400 mt-0.5">
                        {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                    </Text>
                )}
            </View>

            {/* Initial sync progress bar */}
            {syncProgress && (
                <View className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                    <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs text-blue-600 font-medium">
                            Analyzing your photos with AI…
                        </Text>
                        <Text className="text-xs text-blue-400">
                            {syncProgress.current}/{syncProgress.total}
                        </Text>
                    </View>
                    <View className="h-1 bg-blue-100 rounded-full overflow-hidden">
                        <View
                            className="h-1 bg-blue-500 rounded-full"
                            style={{ width: `${syncPercent}%` }}
                        />
                    </View>
                </View>
            )}

            <FlatList
                data={photos}
                numColumns={numColumns}
                keyExtractor={(item) => item.id ?? item.device_asset_id ?? item.uri}
                contentContainerStyle={{ paddingHorizontal: 2.5, paddingTop: 2 }}
                showsVerticalScrollIndicator={false}
                renderItem={renderPhotoItem}
            />

            <PhotoViewer
                visible={!!selectedPhoto}
                photo={selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
            />

            <FloatingMenu
                menuAnim={menuAnim}
                appendPhoto={appendPhoto}
            />
        </View>
    );
}