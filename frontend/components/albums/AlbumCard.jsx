import { useRef } from 'react';
import { View, Text, Image, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CARD_SIZE = 180;

export default function AlbumCard({ album, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable
      onPress={() => onPress(album)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ width: CARD_SIZE }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View
          style={{ width: CARD_SIZE, height: CARD_SIZE }}
          className="rounded-xl overflow-hidden bg-gray-200"
        >
          {album.photos.length > 0 ? (
            <Image
              source={{ uri: album.photos[0].uri }}
              style={{ width: CARD_SIZE, height: CARD_SIZE }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="images-outline" size={28} color="#c0c0c0" />
            </View>
          )}
        </View>

        <View className="mt-2 px-0.5">
          <Text className="text-[13px] font-medium text-black" numberOfLines={1}>
            {album.name}
          </Text>
          <Text className="text-[13px] text-gray-400">{album.photos.length}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}