import { memo, useCallback } from 'react';
import { View, Dimensions, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from 'context/ThemeContext.jsx';

const { width: windowWidth } = Dimensions.get('window');

function PhotoItem({ localUri, numColumns, onPress, item }) {
  const { isDarkMode } = useThemeContext();
  const size = (windowWidth - 4) / numColumns - 4;

  const isVideo = item?.isVideo || item?.mediaType === 'video';
  const isGif = (item?.uri || localUri || '').toLowerCase().endsWith('.gif');

  const handlePress = useCallback(() => {
    onPress({ item });
  }, [onPress, item]);

  return (
    <Pressable onPress={handlePress}>
      <View className={`m-0.5 overflow-hidden ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-200'}`} style={{ width: size, height: size }}>
        {localUri && (
          <Image
            source={{ uri: localUri }}
            style={{ width: size, height: size }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}

        {/* Video badge */}
        {isVideo && (
          <View className="absolute bottom-1 right-1 bg-black/55 rounded p-0.5">
            <Ionicons name="play" size={12} color="white" />
          </View>
        )}

        {/* GIF badge */}
        {isGif && !isVideo && (
          <View className="absolute bottom-1 right-1 bg-black/55 rounded px-1 py-0.5">
            <Text className="text-white text-[9px] font-bold">GIF</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default memo(PhotoItem);