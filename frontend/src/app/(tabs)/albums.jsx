import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePhotoContext } from '../../context/PhotoContext.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { getThemeColors } from '../../theme/appColors.js';
import AlbumDetail from '../../components/albums/AlbumDetail.jsx';
import AlbumCard from '../../components/albums/AlbumCard.jsx';
import PhotoItem from '../../components/PhotoItem.jsx';
import { addPhotosToAlbum, createAlbum, getAlbums } from '../../service/albumService.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CREATE_COLUMNS = 4;

export default function Albums() {
  const { photos, setPhotos } = usePhotoContext();
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);
  const [openAlbum, setOpenAlbum] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateAlbumVisible, setIsCreateAlbumVisible] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const photoMap = useMemo(() => {
    const map = new Map();
    for (const photo of photos) {
      if (photo?.id) map.set(photo.id, photo);
    }
    return map;
  }, [photos]);

  const hydrateAlbums = useCallback(
    (rawAlbums) =>
      (rawAlbums || []).map((album) => {
        const albumPhotos = (album.photo_ids || [])
          .map((photoId) => photoMap.get(photoId))
          .filter(Boolean);
        console.log(album)
        const coverPhoto =
          (album.cover_photo_id && photoMap.get(album.cover_photo_id)) || albumPhotos[0] || null;

        return {
          ...album,
          photos: albumPhotos,
          coverPhoto,
        };
      }),
    [photoMap]
  );

  const loadAlbums = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);

        const result = await getAlbums();
        setAlbums(hydrateAlbums(result));
      } catch (error) {
        console.log('Load albums error:', error);
        setAlbums([]);
      } finally {
        if (refresh) setIsRefreshing(false);
        else setIsLoading(false);
      }
    },
    [hydrateAlbums]
  );

  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    setAlbums((prev) => hydrateAlbums(prev));
  }, [photoMap, hydrateAlbums]);

  const albumColumns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < albums.length; i += 2) {
      cols.push(albums.slice(i, i + 2));
    }
    return cols;
  }, [albums]);

  const handleOpenAlbum = useCallback(
    (album) => {
      setOpenAlbum(album);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
        mass: 0.9,
      }).start();
    },
    [slideAnim]
  );

  const handleCloseAlbum = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setOpenAlbum(null));
  }, [slideAnim]);

  const handleAlbumPhotosChange = useCallback((updatedPhotos, deletedPhotoIds = []) => {
    if (!openAlbum?.id) return;

    const deletedSet = new Set(deletedPhotoIds);
    if (deletedSet.size > 0) {
      setPhotos((prev) => prev.filter((photo) => !deletedSet.has(photo.id)));
    }

    const nextPhotoIds = updatedPhotos.map((photo) => photo.id);
    const nextCover = updatedPhotos[0] ?? null;

    setAlbums((prev) =>
      prev.map((album) =>
        album.id === openAlbum.id
          ? {
              ...album,
              photos: updatedPhotos,
              photo_ids: nextPhotoIds,
              coverPhoto: nextCover,
              cover_photo_id: nextCover?.id ?? null,
            }
          : album
      )
    );

    setOpenAlbum((prev) =>
      prev && prev.id === openAlbum.id
        ? {
            ...prev,
            photos: updatedPhotos,
            photo_ids: nextPhotoIds,
            coverPhoto: nextCover,
            cover_photo_id: nextCover?.id ?? null,
          }
        : prev
    );
  }, [openAlbum, setPhotos]);

  const openCreateAlbum = useCallback(() => {
    setSelectedPhotoIds([]);
    setNewAlbumName('');
    setIsCreateAlbumVisible(true);
  }, []);

  const closeCreateAlbum = useCallback(() => {
    if (isCreatingAlbum) return;
    setIsCreateAlbumVisible(false);
  }, [isCreatingAlbum]);

  const toggleSelectedPhoto = useCallback((photoId) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      return [...prev, photoId];
    });
  }, []);

  const handleCreateAlbum = useCallback(async () => {
    const name = newAlbumName.trim();
    if (!name) {
      Alert.alert('Album name required', 'Please enter an album name.');
      return;
    }

    if (selectedPhotoIds.length === 0) {
      Alert.alert('Select photos', 'Please select at least one photo.');
      return;
    }

    try {
      setIsCreatingAlbum(true);
      const album = await createAlbum({
        name,
        coverPhotoId: selectedPhotoIds[0],
      });
      await addPhotosToAlbum({ albumId: album.id, photoIds: selectedPhotoIds });
      setIsCreateAlbumVisible(false);
      setSelectedPhotoIds([]);
      setNewAlbumName('');
      await loadAlbums(true);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create album');
    } finally {
      setIsCreatingAlbum(false);
    }
  }, [newAlbumName, selectedPhotoIds, loadAlbums]);

  const renderCreatePhotoItem = useCallback(
    ({ item }) => (
      <PhotoItem
        localUri={item.uri ?? null}
        numColumns={CREATE_COLUMNS}
        onPress={() => toggleSelectedPhoto(item.id)}
        onLongPress={() => toggleSelectedPhoto(item.id)}
        item={item}
        isSelected={selectedPhotoIds.includes(item.id)}
        selectionMode
      />
    ),
    [toggleSelectedPhoto, selectedPhotoIds]
  );

  const totalPhotosInAlbums = albums.reduce((sum, album) => sum + album.photos.length, 0);

  return (
    <View className={`flex-1 ${colors.pageBg}`}>
      <View className={`pt-16 pb-6 px-4 border-b ${colors.headerBg} ${colors.border}`}>
        <View className="flex-row items-center justify-between">
          <Text className={`text-3xl font-extrabold tracking-tight ${colors.textPrimary}`}>Albums</Text>
          <Pressable onPress={openCreateAlbum} disabled={photos.length === 0}>
            <Ionicons name="add" size={30} color={photos.length === 0 ? '#9CA3AF' : colors.icon} />
          </Pressable>
        </View>
        {!isLoading && (
          <Text className={`text-xs mt-1 ${colors.count}`}>
            {albums.length} {albums.length === 1 ? 'album' : 'albums'} | {totalPhotosInAlbums}{' '}
            {totalPhotosInAlbums === 1 ? 'photo' : 'photos'}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.loading} />
        </View>
      ) : albums.length === 0 ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadAlbums(true)} />}
        >
          <View className="flex-1 items-center justify-center px-6 pt-32">
            <Ionicons name="albums-outline" size={64} color={colors.emptyIcon} />
            <Text className={`text-lg font-semibold mt-4 ${colors.textPrimary}`}>No albums yet</Text>
            <Text className={`text-sm text-center mt-2 ${colors.textSecondary}`}>
              Tap + to create an album from your photos
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadAlbums(true)} />}
        >
          {albumColumns.map((col, i) => (
            <View key={i} style={{ gap: 12, marginRight: i < albumColumns.length - 1 ? 12 : 0 }}>
              {col.map((album) => (
                <AlbumCard key={album.id} album={album} onPress={handleOpenAlbum} isDarkMode={isDarkMode} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {openAlbum && (
        <Animated.View
          className={`absolute inset-0 z-10 ${colors.pageBg}`}
          style={{ transform: [{ translateX: slideAnim }] }}
        >
          <AlbumDetail album={openAlbum} onBack={handleCloseAlbum} onPhotosChange={handleAlbumPhotosChange} />
        </Animated.View>
      )}

      <Modal
        visible={isCreateAlbumVisible}
        animationType="slide"
        onRequestClose={closeCreateAlbum}
      >
        <View className={`flex-1 ${colors.pageBg}`}>
          <View className={`pt-16 pb-4 px-4 border-b ${colors.headerBg} ${colors.border}`}>
            <View className="flex-row items-center justify-between">
              <Pressable onPress={closeCreateAlbum} disabled={isCreatingAlbum} className="py-1 pr-3">
                <Text className={`text-base ${colors.title}`}>Cancel</Text>
              </Pressable>
              <Text className={`text-lg font-semibold ${colors.title}`}>New Album</Text>
              <Pressable
                onPress={handleCreateAlbum}
                disabled={isCreatingAlbum}
                className="py-1 pl-3"
                style={{ opacity: isCreatingAlbum ? 0.4 : 1 }}
              >
                {isCreatingAlbum ? (
                  <ActivityIndicator size="small" color={colors.icon} />
                ) : (
                  <Text className="text-base font-semibold text-blue-500">Create</Text>
                )}
              </Pressable>
            </View>
            <TextInput
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder="Album name"
              placeholderTextColor={colors.inputPlaceholder}
              className={`mt-3 rounded-xl px-4 py-3 ${colors.inputBg} ${colors.inputText}`}
              editable={!isCreatingAlbum}
              returnKeyType="done"
            />
            <Text className={`text-xs mt-2 ${colors.count}`}>
              {selectedPhotoIds.length} {selectedPhotoIds.length === 1 ? 'photo selected' : 'photos selected'}
            </Text>
          </View>

          <FlatList
            data={photos}
            numColumns={CREATE_COLUMNS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 2.5, paddingTop: 4, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={renderCreatePhotoItem}
          />
        </View>
      </Modal>
    </View>
  );
}
