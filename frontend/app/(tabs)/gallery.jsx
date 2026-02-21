import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
  Pressable,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config/api.js';
import PhotoViewer from '../../components/photoViewer.jsx';
import { getSession } from '../../service/auth/authService.js';

const { width } = Dimensions.get('window');
const numColumns = 4;
const imageSize = (width - 6) / numColumns;

export default function GalleryScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const theme = {
    background: dark ? '#000' : '#fff',
    header: dark ? '#1c1c1e' : '#f5f5f7',
    card: dark ? '#2c2c2e' : '#f3f4f6',
    text: dark ? '#fff' : '#000',
    subtext: dark ? '#9ca3af' : '#6b7280',
    input: dark ? '#2c2c2e' : '#e5e7eb',
    searchBg: dark ? '#1c1c1e' : '#f5f5f7',
    iconColor: dark ? '#fff' : '#000',
    border: dark ? '#2c2c2e' : '#e5e7eb',
  };

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.header,
      },
      headerTintColor: theme.text,
      headerTitle: 'Gallery',
      headerTitleAlign: 'left',
      headerTitleStyle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginLeft: 0,
        marginTop: 12,
        color: theme.text,
      },
      headerRight: () => (
        <Pressable
          onPress={() => {
            setSearchVisible(v => !v);
            if (searchVisible) {
              setSearchQuery('');
              loadAllPhotos();
            }
          }}
          style={{ marginRight: 16 }}
        >
          <Ionicons
            name={searchVisible ? 'close' : 'search'}
            size={24}
            color={theme.iconColor}
          />
        </Pressable>
      ),
    });
  }, [navigation, searchVisible, dark]);

  useEffect(() => {
    loadAllPhotos();
  }, []);

  const loadAllPhotos = async () => {
    const token = await getSession();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: '' }),
      });

      const data = await response.json();

      if (response.ok) {
        setPhotos(data.result || []);
      } else {
        throw new Error(data.error || 'Failed to load photos');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to load photos: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadAllPhotos();
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          fullTextWeight: 0.5,
          semanticWeight: 2.0,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPhotos(data.results || []);
        if (data.count === 0) {
          Alert.alert('No Results', 'No photos match your search');
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      Alert.alert('Error', `Search failed: ${error.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    loadAllPhotos();
  };

  const handlePhotoPress = (index) => {
    setSelectedPhotoIndex(index);
    setViewerVisible(true);
  };

  const handlePhotoDeleted = (deletedId) => {
    setPhotos(photos.filter(p => p.id !== deletedId));
  };

  const renderPhoto = useCallback(({ item, index }) => (
    <TouchableOpacity
      onPress={() => handlePhotoPress(index)}
      activeOpacity={0.85}
      style={styles.photoContainer}
    >
      {item.thumbnail_data ? (
        <Image
          source={{ uri: item.thumbnail_data }}
          style={[styles.photoImage, { backgroundColor: theme.card }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.photoImage, styles.placeholderImage, { backgroundColor: theme.card }]}>
          <Ionicons name="image-outline" size={20} color="#9ca3af" />
        </View>
      )}
      {item.final_score && (
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>
            {Math.round(item.final_score * 100)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  ), [photos, dark]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {searchVisible && (
        <View style={[styles.searchContainer, { backgroundColor: theme.searchBg }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: theme.input }]}>
            <Ionicons name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search photos..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => { setSearchQuery(''); loadAllPhotos(); }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </Pressable>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            disabled={searching}
            style={styles.searchButton}
          >
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.countBar, { backgroundColor: theme.background }]}>
        <Text style={[styles.countText, { color: theme.subtext }]}>
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color="#9ca3af" />
          <Text style={[styles.emptyText, { color: theme.text }]}>No photos yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
            Upload some photos to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
        />
      )}

      <PhotoViewer
        visible={viewerVisible}
        photos={photos}
        initialIndex={selectedPhotoIndex}
        onClose={() => setViewerVisible(false)}
        onPhotoDeleted={handlePhotoDeleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  countBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  gridContent: {
    paddingBottom: 20,
  },
  photoContainer: {
    position: 'relative',
    margin: 0.5,
  },
  photoImage: {
    width: imageSize,
    height: imageSize,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});