import { Modal, View, Pressable, Animated, Text, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import PagerView from 'react-native-pager-view';
import { useThemeContext } from 'context/ThemeContext.jsx';
import { getThemeColors } from 'theme/appColors.js';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function TagPill({ tag, colors }) {
  return (
    <View className={`rounded-full px-3 py-1 mr-2 mb-2 ${colors.tagBg}`}>
      <Text className={`text-xs ${colors.tagText}`}>{tag}</Text>
    </View>
  );
}

export default function PhotoViewer({ visible, photos = [], initialIndex = 0, onClose, onDelete, isDeleting = false }) {
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);
  const pagerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [sheetVisible, setSheetVisible] = useState(false);

  const currentPhoto = photos?.[currentIndex];
  const photoData = currentPhoto?.item ?? currentPhoto;
  const tags = photoData?.tags
    ? photoData.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const openSheet = () => {
    setSheetVisible(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        tension: 65,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setSheetVisible(false));
  };

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        pagerRef.current?.setPageWithoutAnimation(initialIndex);
      }, 0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      sheetAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      setSheetVisible(false);
    }
  }, [visible, initialIndex]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'This will remove the photo from your library. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  if (!visible || !photos?.length) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View className="flex-1 bg-black">
        <Animated.View style={{ flex: 1, opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={initialIndex}
            onPageSelected={(e) => {
              setCurrentIndex(e.nativeEvent.position);
              if (sheetVisible) closeSheet();
            }}
          >
            {photos.map((photo, index) => {
              const uri = photo.uri ?? photo.item?.uri;
              const key = photo.item?.device_asset_id ?? photo.device_asset_id ?? index;

              // only render the current page and its immediate neighbors.
              const shouldRenderImage = Math.abs(index - currentIndex) <= 1;

              return (
                <View key={key} className="flex-1 justify-center items-center">
                  {uri && shouldRenderImage ? (
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  ) : uri && !shouldRenderImage ? (
                    // placeholder for offscreen pages to avoid heavy decoding on open
                    <View className="w-full h-full bg-black" />
                  ) : (
                    <ActivityIndicator size="large" color="white" />
                  )}
                </View>
              );
            })}
          </PagerView>
        </Animated.View>

        <Pressable onPress={onClose} className="absolute top-14 left-4 z-50 flex-row items-center p-2">
          <Ionicons name="chevron-back" size={28} color="white" />
          <Text className="text-white text-base font-medium">Back</Text>
        </Pressable>

        {photos.length > 1 && (
          <View className="absolute top-14 right-4 z-50 bg-black/50 rounded-full px-3 py-1">
            <Text className="text-white text-sm font-medium">
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        )}

        <View className="absolute bottom-12 right-6 z-50 flex-row items-center gap-4">
          <Pressable onPress={openSheet} className="p-2">
            <Ionicons name="information-circle-outline" size={28} color="white" />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            disabled={isDeleting}
            className="p-2"
            style={{ opacity: isDeleting ? 0.4 : 1 }}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color="white" />
              : <Ionicons name="trash-outline" size={28} color="white" />
            }
          </Pressable>
        </View>

        {sheetVisible && (
          <>
            <Animated.View
              style={{ opacity: backdropAnim }}
              className="absolute inset-0 bg-black/60 z-50"
            >
              <Pressable className="flex-1" onPress={closeSheet} />
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ translateY: sheetAnim }],
                height: SCREEN_HEIGHT * 0.5,
              }}
              className={`absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl ${colors.sheetBg}`}
            >
              <View className={`flex-row items-center justify-between px-5 py-4 border-b ${colors.sheetBorder}`}>
                <Text className={`text-lg font-semibold ${colors.title}`}>Photo Info</Text>
                <Pressable onPress={closeSheet}>
                  <Ionicons name="close" size={22} color={colors.icon} />
                </Pressable>
              </View>

              <ScrollView
                className="px-5 pt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {photoData?.literal && (
                  <View className="mb-4">
                    <Text className={`text-sm font-semibold tracking-wider mb-1 ${colors.title}`}>Literal</Text>
                    <Text className={`text-md leading-relaxed ${colors.body}`}>{photoData.literal}</Text>
                  </View>
                )}
                {photoData?.descriptive && (
                  <View className="mb-4">
                    <Text className={`text-sm font-semibold tracking-wider mb-1 ${colors.title}`}>Descriptive</Text>
                    <Text className={`text-md leading-relaxed ${colors.body}`}>{photoData.descriptive}</Text>
                  </View>
                )}
                <View className="mb-4">
                  <Text className={`text-xs font-semibold uppercase tracking-wider mb-1 ${colors.title}`}>Manual Description</Text>
                  <Text className={`text-sm leading-relaxed ${colors.body}`}>
                    {photoData?.manual_description ?? 'None'}
                  </Text>
                </View>

                {tags.length > 0 && (
                  <View className="mb-4">
                    <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${colors.title}`}>Tags</Text>
                    <View className="flex-row flex-wrap">
                      {tags.map((tag, i) => (
                        <TagPill key={i} tag={tag} colors={colors} />
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>
    </Modal>
  );
}

