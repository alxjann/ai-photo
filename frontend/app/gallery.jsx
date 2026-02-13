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

const { width } = Dimensions.get('window');
const numColumns = 3; // 3x3 grid
const imageSize = width / numColumns;

export default function GalleryScreen() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllPhotos();
  }, []);

  const loadAllPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '' }), 
      });

      const data = await response.json();
      console.log(`✅ Loaded ${data.results?.length || 0} photos`);
      
      if (response.ok) {
        setPhotos(data.results || []);
      } else {
        console.error('❌ Error:', data.error);
        throw new Error(data.error || 'Failed to load photos');
      }
    } catch (error) {
      console.error('❌ Load error:', error.message);
      Alert.alert('Error', `Failed to load photos: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    loadAllPhotos();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadAllPhotos();
      return;
    }

    setSearching(true);
    try {
      console.log('🔍 Searching for:', searchQuery);
      
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();
      console.log(`✅ Search complete: ${data.count || 0} results`);
      
      if (response.ok) {
        setPhotos(data.results || []);
        if (data.count === 0) {
          Alert.alert('No Results', 'No photos match your search');
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('❌ Search error:', error.message);
      Alert.alert('Error', `Search failed: ${error.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    loadAllPhotos();
  };

  const renderPhoto = ({ item }) => (
    <View style={styles.photoContainer}>
      {item.image_data ? (
        <Image
          source={{ uri: item.image_data }}
          style={styles.photoImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photoImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>📷</Text>
        </View>
      )}
      {/* Show similarity badge on search results */}
      {item.similarity && (
        <View style={styles.similarityBadge}>
          <Text style={styles.similarityText}>
            {Math.round(item.similarity * 100)}%
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
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
              <Text style={styles.refreshIcon}>🔄</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
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
            <Text style={styles.clearButtonText}>✕</Text>
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
            <Text style={styles.searchButtonText}>🔍</Text>
          )}
        </TouchableOpacity>
      </View>

      {searching && (
        <Text style={styles.searchingText}>
          Searching...
        </Text>
      )}

      {/* Gallery Grid */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>
            Upload some photos to get started!
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns} // Force re-render if columns change
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937', // Dark background like test.jsx
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
    fontSize: 20,
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
    width: 40,
    height: 40,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  searchingText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    paddingVertical: 8,
    fontStyle: 'italic',
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 32,
    opacity: 0.3,
  },
  similarityBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  similarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});