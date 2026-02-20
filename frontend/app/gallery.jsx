import React, { useState, useEffect } from 'react';
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
  Image,
  Dimensions,
} from 'react-native';
import { API_URL } from '../config/api';
import PhotoViewer from './photoViewer';

const { width } = Dimensions.get('window');
const numColumns = 3;
const imageSize = width / numColumns;

export default function GalleryScreen() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchMode, setSearchMode] = useState('balanced');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    loadAllPhotos();
  }, []);

  const loadAllPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPhotos(data.results || []);
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

  const getSearchWeights = () => {
    switch (searchMode) {
      case 'keyword':
        return { fullTextWeight: 3.0, semanticWeight: 0.5 };
      case 'semantic':
        return { fullTextWeight: 0.5, semanticWeight: 2.0 };
      case 'balanced':
      default:
        return { fullTextWeight: 1.5, semanticWeight: 1.0 };
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadAllPhotos();
      return;
    }

    setSearching(true);
    try {
      const weights = getSearchWeights();
      
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          ...weights
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

  const handleClearSearch = () => {
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

  const renderPhoto = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.photoContainer}
      onPress={() => handlePhotoPress(index)}
      activeOpacity={0.8}
    >
      {item.image_data ? (
        <Image
          source={{ uri: item.image_data }}
          style={styles.photoImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photoImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
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
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Gallery</Text>
            <Text style={styles.subtitle}>
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={loading || refreshing}
            style={styles.refreshButton}
          >
            {refreshing ? (
              <ActivityIndicator color="#007AFF" size="small" />
            ) : (
              <Text style={styles.refreshIcon}>Refresh</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search photos..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={handleClearSearch}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>X</Text>
          </TouchableOpacity>
        )}
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

      <View style={styles.searchModeContainer}>
        <Text style={styles.searchModeLabel}>Mode:</Text>
        {['keyword', 'balanced', 'semantic'].map(mode => (
          <TouchableOpacity
            key={mode}
            onPress={() => setSearchMode(mode)}
            style={[
              styles.modeButton,
              searchMode === mode && styles.modeButtonActive
            ]}
          >
            <Text style={styles.modeButtonText}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>No Photos</Text>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>
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
    backgroundColor: '#1f2937',
  },
  header: {
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 12,
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#1f2937',
    color: '#fff',
  },
  clearButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4b5563',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#9ca3af',
  },
  searchButton: {
    width: 80,
    height: 40,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  searchModeContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    gap: 8,
  },
  searchModeLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginRight: 8,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#4b5563',
  },
  modeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  gridContent: {
    paddingBottom: 20,
  },
  photoContainer: {
    position: 'relative',
  },
  photoImage: {
    width: imageSize,
    height: imageSize,
    backgroundColor: '#374151',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    opacity: 0.3,
    color: '#fff',
  },
  scoreBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
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