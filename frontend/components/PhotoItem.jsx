import { useCallback, memo } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';

const { width: windowWidth } = Dimensions.get('window');

function PhotoItem({ localUri, numColumns, onPress, item }) {
  const size = (windowWidth - 4) / numColumns - 4;

  const handlePress = useCallback(() => {
    onPress({ item, uri: localUri });
  }, [onPress, item, localUri]);

  return (
    <Pressable onPress={handlePress}>
      <View className="m-0.5 overflow-hidden bg-gray-200" style={{ width: size, height: size }}>
        {localUri && (
          <Image
            source={{ uri: localUri }}
            style={{ width: size, height: size }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
      </View>
    </Pressable>
  );
};

export default memo(PhotoItem);