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
} from 'react-native';
import { API_URL } from '../config/api';

export default function GalleryScreen() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // load all photos 
  useEffect(() => {
    loadAllPhotos();
  }, []);

  const loadAllPhotos = async () => {
    setLoading(true);
    try {
      console.log('Loading photos from:', `${API_URL}/api/search`);
      
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '' }), 
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setPhotos(data.results || []);
        console.log(`Loaded ${data.results?.length || 0} photos`);
      } else {
        console.error('Error response:', data);
        throw new Error(data.error || 'Failed to load photos');
      }
    } catch (error) {
      console.error('Load error:', error);
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
      console.log('Searching for:', searchQuery);
      
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPhotos(data.results || []);
        Alert.alert(
          'Search Complete',
          `Found ${data.count || 0} ${data.count === 1 ? 'photo' : 'photos'}`
        );
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
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
    <View style={styles.photoCard}>
      <View style={styles.photoHeader}>
        <Text style={styles.photoId}>Photo ID: {item.id.substring(0, 8)}...</Text>
        {item.similarity && (
          <Text style={styles.similarity}>
            {Math.round(item.similarity * 100)}% match
          </Text>
        )}
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionLabel}>🎯 Descriptive:</Text>
        <Text style={styles.descriptionText}>{item.descriptive}</Text>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionLabel}>👁️ Literal:</Text>
        <Text style={styles.descriptionText}>{item.literal}</Text>
      </View>

      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>AI Photo Gallery</Text>
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

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search with AI... (e.g., 'happy moments', 'sunset')"
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
          AI is searching through embeddings...
        </Text>
      )}

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
            <Text style={styles.retryButtonText}>🔄 Retry Loading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  clearButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 20,
  },
  searchingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginVertical: 8,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  photoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  similarity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
});