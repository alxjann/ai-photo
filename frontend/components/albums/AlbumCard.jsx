import { useRef } from 'react';
import { View, Text, Image, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors } from 'theme/appColors.js';

const CARD_SIZE = 180;

export default function AlbumCard({ album, onPress, isDarkMode = false }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colors = getThemeColors(isDarkMode);

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
          className={`rounded-xl overflow-hidden ${colors.placeholderBg}`}
        >
          {album.photos.length > 0 ? (
            <Image
              source={{ uri: album.photos[0].uri }}
              style={{ width: CARD_SIZE, height: CARD_SIZE }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="images-outline" size={28} color={colors.emptyIcon} />
            </View>
          )}
        </View>

        <View className="mt-2 px-0.5">
          <Text className={`text-[13px] font-medium ${colors.title}`} numberOfLines={1}>
            {album.name}
          </Text>
          <Text className={`text-[13px] ${colors.textSecondary}`}>{album.photos.length}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

