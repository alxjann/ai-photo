import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_SIZE = 70;

export default function PhotoViewer({ visible, photos, initialIndex, onClose, onPhotoDeleted }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const flatListRef = useRef(null);
  const thumbnailListRef = useRef(null);

  const currentPhoto = photos[currentIndex];

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);
      thumbnailListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  useEffect(() => {
    if (visible && flatListRef.current && photos && photos.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
        thumbnailListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
      setCurrentIndex(initialIndex);
      setShowDetails(false);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && currentPhoto && !loadedImages[currentPhoto.id]) {
      fetch(`${API_URL}/api/photo/${currentPhoto.id}`)
        .then(r => r.json())
        .then(data => {
          setLoadedImages(prev => ({
            ...prev,
            [currentPhoto.id]: data.image_data,
          }));
        });
    }
  }, [currentPhoto?.id, visible]);

  if (!visible || !photos || photos.length === 0) return null;
  if (!currentPhoto) return null;

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const response = await fetch(`${API_URL}/api/photo/${currentPhoto.id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                if (photos.length === 1) {
                  onClose();
                }
                onPhotoDeleted(currentPhoto.id);
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleThumbnailPress = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const renderPhoto = ({ item }) => {
    const fullImage = loadedImages[item.id];

    return (
      <Pressable
        style={styles.photoSlide}
        onPress={() => {
          setShowControls(!showControls);
          if (showDetails) setShowDetails(false);
        }}
      >
        <Image
          source={{ uri: fullImage || item.thumbnail_data }}
          style={styles.image}
          resizeMode="contain"
        />
      </Pressable>
    );
  };

  const renderThumbnail = ({ item, index }) => {
    const isActive = index === currentIndex;
    return (
      <TouchableOpacity
        onPress={() => handleThumbnailPress(index)}
        style={[
          styles.thumbnailContainer,
          isActive && styles.thumbnailContainerActive,
        ]}
      >
        <Image
          source={{ uri: item.thumbnail_data }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {showControls && (
          <>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>

              <View style={styles.topRightButtons}>
                <TouchableOpacity 
                  onPress={() => setShowDetails(!showDetails)} 
                  style={styles.iconButton}
                >
                  <Ionicons 
                    name={showDetails ? "information-circle" : "information-circle-outline"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleDelete} 
                  style={styles.deleteButton}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={24} color="#ff3b30" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomContainer}>
              <FlatList
                ref={thumbnailListRef}
                data={photos}
                renderItem={renderThumbnail}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
                getItemLayout={(data, index) => ({
                  length: THUMBNAIL_SIZE + 8,
                  offset: (THUMBNAIL_SIZE + 8) * index,
                  index,
                })}
              />

              <View style={styles.infoBar}>
                <Text style={styles.counter}>
                  {currentIndex + 1} of {photos.length}
                </Text>
              </View>
            </View>
          </>
        )}

        {showDetails && (
          <View style={styles.detailsPanel}>
            <ScrollView style={styles.detailsScroll}>
              {currentPhoto.manual_description && (
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="pencil-outline" size={16} color="#60a5fa" />
                    <Text style={styles.detailLabel}>Your Note</Text>
                  </View>
                  <Text style={styles.detailText}>{currentPhoto.manual_description}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  <Ionicons name="eye-outline" size={16} color="#60a5fa" />
                  <Text style={styles.detailLabel}>AI Description</Text>
                </View>
                <Text style={styles.detailText}>{currentPhoto.descriptive}</Text>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  <Ionicons name="list-outline" size={16} color="#60a5fa" />
                  <Text style={styles.detailLabel}>Details</Text>
                </View>
                <Text style={styles.detailText}>{currentPhoto.literal}</Text>
              </View>

              {currentPhoto.tags && (
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="pricetag-outline" size={16} color="#60a5fa" />
                    <Text style={styles.detailLabel}>Tags</Text>
                  </View>
                  <View style={styles.tagsContainer}>
                    {currentPhoto.tags.split(',').map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag.trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  photoSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
  },
  backButton: { padding: 4 },
  topRightButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconButton: { padding: 4 },
  deleteButton: { padding: 4 },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingBottom: 30,
    zIndex: 10,
  },
  thumbnailList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailContainerActive: { borderColor: '#fff' },
  thumbnail: { width: '100%', height: '100%' },
  infoBar: { alignItems: 'center', paddingVertical: 8 },
  counter: { color: '#fff', fontSize: 13, fontWeight: '500' },
  detailsPanel: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.5,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 9,
  },
  detailsScroll: { padding: 16 },
  detailSection: { marginBottom: 20 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  detailLabel: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: { color: '#e5e7eb', fontSize: 14, lineHeight: 20 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tagText: { color: '#93c5fd', fontSize: 12, fontWeight: '500' },
});