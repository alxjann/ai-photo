import { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, Text, Pressable, TextInput, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams } from 'expo-router';
import FloatingMenu from '../../components/FloatingMenu.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';
import { getPhotos, getPhotoLocalURI } from 'service/photoService.js';
import PhotoViewer from '../../components/PhotoViewer.jsx';
import { usePhotoContext } from 'context/PhotoContext.jsx';

const numColumns = 4;

export default function Library() {
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions({ mediaTypes: 'photo' });
    const { photos, setPhotos, appendPhoto } = usePhotoContext();
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const allPhotosRef = useRef([]);
    const { query: incomingQuery } = useLocalSearchParams();

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
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await handleGetPhotos();
        setIsRefreshing(false);
    };

    useEffect(() => { handleGetPhotos(); }, []);

    useEffect(() => {
        if (incomingQuery) {
            setSearchQuery(incomingQuery);
            setIsSearching(true);
            Animated.timing(searchAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
            getPhotos(incomingQuery).then(async assets => {
                const resolved = await resolveUris(assets);
                setPhotos(resolved);
            }).catch(console.error);
        }
    }, [incomingQuery]);

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

            <FlatList
                data={photos}
                numColumns={numColumns}
                keyExtractor={(item) => item.id}
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