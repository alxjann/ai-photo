import { Modal, View, Pressable, Animated, Text, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PhotoViewer({ visible, photo, onClose, onDelete, isDeleting = false }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [sheetVisible, setSheetVisible] = useState(false);

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
  }, [visible]);

  if (!visible || !photo) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View className="flex-1 bg-black justify-center items-center">

        {/* Photo */}
        {photo.uri && (
          <Animated.View
            style={{
              width: '100%',
              height: '100%',
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Image
              source={{ uri: photo.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        )}

        <Pressable onPress={onClose} className="absolute top-14 left-4 z-50 flex-row items-center p-2">
          <Ionicons name="chevron-back" size={28} color="white" />
          <Text className="text-white text-base font-medium">Back</Text>
        </Pressable>

        <View className="absolute bottom-12 right-6 z-50 flex-row items-center gap-4">
          <Pressable onPress={openSheet} className="p-2">
            <Ionicons name="information-circle-outline" size={28} color="white" />
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={isDeleting}
            className="p-2"
            style={{ opacity: isDeleting ? 0.4 : 1 }}
          >
            <Ionicons name="trash-outline" size={28} color="white" />
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
              className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl"
            >
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                <Text className="text-black text-lg font-semibold">Photo Info</Text>
                <Pressable onPress={closeSheet}>
                  <Ionicons name="close" size={22} color="black" />
                </Pressable>
              </View>

              <ScrollView className="px-5 pt-4" showsVerticalScrollIndicator={false}>
                {photo.item.literal && (
                  <View className="mb-4">
                    <Text className="text-black text-sm font-semibold tracking-wider mb-1">Literal</Text>
                    <Text className="text-gray-600 text-md leading-relaxed">{photo.item.literal}</Text>
                  </View>
                )}
                {photo.item.descriptive && (
                  <View className="mb-4">
                    <Text className="text-black text-sm font-semibold tracking-wider mb-1">Descriptive</Text>
                    <Text className="text-gray-600 text-md leading-relaxed">{photo.item.descriptive}</Text>
                  </View>
                )}
                <View className="mb-4">
                    <Text className="text-black text-xs font-semibold uppercase tracking-wider mb-1">Manual Description</Text>
                    <Text className="text-gray-600 text-sm leading-relaxed">{photo.item.manual_description ?? 'None'}</Text>
                </View>

              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>
    </Modal>
  );
}