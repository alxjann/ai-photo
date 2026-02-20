import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  clamp,
  runOnJS,
} from 'react-native-reanimated';
import { API_URL } from '../config/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_SIZE = 60;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function ZoomableImage({ uri, onSingleTap }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        resetZoom();
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (savedScale.value > 1) {
        resetZoom();
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const singleTapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      runOnJS(onSingleTap)();
    });

  const composed = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.photoSlide, animatedStyle]}>
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export default function PhotoViewer({ visible, photos, initialIndex, onClose, onPhotoDeleted }) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [fullImages, setFullImages] = useState({});
  const [loadingFull, setLoadingFull] = useState(false);
  const flatListRef = useRef(null);
  const thumbnailListRef = useRef(null);

  const safeIndex = Math.min(Math.max(currentIndex, 0), (photos?.length ?? 1) - 1);
  const currentPhoto = photos?.[safeIndex] ?? null;

  const fetchFullImage = useCallback(async (photo) => {
    if (!photo || fullImages[photo.id]) return;
    setLoadingFull(true);
    try {
      const response = await fetch(`${API_URL}/api/photo/${photo.id}`);
      const data = await response.json();
      if (data.image_data) {
        setFullImages(prev => ({ ...prev, [photo.id]: data.image_data }));
      }
    } catch (e) {
    } finally {
      setLoadingFull(false);
    }
  }, [fullImages]);

  useEffect(() => {
    if (visible && photos && photos.length > 0) {
      const idx = Math.min(Math.max(initialIndex, 0), photos.length - 1);
      setCurrentIndex(idx);
      setShowDetails(false);
      setShowControls(true);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        thumbnailListRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.5 });
      }, 100);
      fetchFullImage(photos[idx]);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (currentPhoto) fetchFullImage(currentPhoto);
  }, [currentIndex]);

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

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  if (!visible || !photos || photos.length === 0) return null;
  if (!currentPhoto) return null;

  const handleDelete = () => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
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
              if (photos.length === 1) onClose();
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
    ]);
  };

  const handleThumbnailPress = (index) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleSingleTap = () => {
    setShowControls(v => !v);
    if (showDetails) setShowDetails(false);
  };

  const renderPhoto = ({ item }) => {
    const imageUri = fullImages[item.id] || item.thumbnail_data;
    return (
      <View style={styles.photoSlideContainer}>
        <ZoomableImage uri={imageUri} onSingleTap={handleSingleTap} />
        {loadingFull && !fullImages[item.id] && (
          <ActivityIndicator style={styles.imageLoader} color="#fff" size="small" />
        )}
      </View>
    );
  };

  const renderThumbnail = ({ item, index }) => {
    const isActive = index === safeIndex;
    return (
      <TouchableOpacity
        onPress={() => handleThumbnailPress(index)}
        style={[styles.thumbnailContainer, isActive && styles.thumbnailContainerActive]}
      >
        <Image
          source={{ uri: item.thumbnail_data }}
          style={styles.thumbnail}
          contentFit="cover"
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={styles.container}>
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
          decelerationRate="fast"
        />

        {showControls && (
          <>
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={onClose} style={styles.topBarButton}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.counter}>
                {safeIndex + 1} / {photos.length}
              </Text>

              <View style={styles.topBarRight}>
                <TouchableOpacity
                  onPress={() => setShowDetails(v => !v)}
                  style={styles.topBarButton}
                >
                  <Ionicons
                    name={showDetails ? 'information-circle' : 'information-circle-outline'}
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.topBarButton}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={22} color="#ff453a" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 8 }]}>
              <FlatList
                ref={thumbnailListRef}
                data={photos}
                renderItem={renderThumbnail}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
                getItemLayout={(data, index) => ({
                  length: THUMBNAIL_SIZE + 6,
                  offset: (THUMBNAIL_SIZE + 6) * index,
                  index,
                })}
              />
            </View>
          </>
        )}

        {showDetails && currentPhoto && (
          <View style={[styles.detailsPanel, { top: insets.top + 70 }]}>
            <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
              {currentPhoto.manual_description && (
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="pencil-outline" size={14} color="#60a5fa" />
                    <Text style={styles.detailLabel}>Your Note</Text>
                  </View>
                  <Text style={styles.detailText}>{currentPhoto.manual_description}</Text>
                </View>
              )}
              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  <Ionicons name="eye-outline" size={14} color="#60a5fa" />
                  <Text style={styles.detailLabel}>AI Description</Text>
                </View>
                <Text style={styles.detailText}>{currentPhoto.descriptive}</Text>
              </View>
              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  <Ionicons name="list-outline" size={14} color="#60a5fa" />
                  <Text style={styles.detailLabel}>Details</Text>
                </View>
                <Text style={styles.detailText}>{currentPhoto.literal}</Text>
              </View>
              {currentPhoto.tags && (
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="pricetag-outline" size={14} color="#60a5fa" />
                    <Text style={styles.detailLabel}>Tags</Text>
                  </View>
                  <View style={styles.tagsContainer}>
                    {currentPhoto.tags.split(',').map((tag, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{tag.trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoSlideContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageLoader: {
    position: 'absolute',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  topBarButton: {
    padding: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counter: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  thumbnailList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 6,
  },
  thumbnailContainerActive: {
    borderColor: '#fff',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  detailsPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.45,
    backgroundColor: 'rgba(15, 15, 15, 0.96)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 9,
  },
  detailsScroll: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailLabel: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  tagText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '500',
  },
});