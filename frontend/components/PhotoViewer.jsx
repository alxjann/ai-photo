import { Modal, View, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

export default function PhotoViewer({ visible, photo, onClose, onDelete, isDeleting = false }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  //photo animation
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
    }
  }, [visible]);

  if (!visible || !photo) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View className="flex-1 bg-black justify-center items-center">
        {photo.uri && (
          <Animated.View
            style={{
              width: '100%',
              height: '100%',
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }]
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
        <Pressable onPress={onClose} className="absolute top-14 right-6 z-50 p-2 bg-black/40 rounded-full">
          <Ionicons name="close" size={32} color="white" />
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={isDeleting}
          className="absolute top-14 left-6 z-50 p-2 rounded-full"
          style={{ backgroundColor: isDeleting ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.7)' }}
        >
          <Ionicons name="trash-outline" size={28} color="white" />
        </Pressable>
      </View>
    </Modal>
  );
}