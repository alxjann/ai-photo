import { useState, useEffect, useCallback, memo } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getPhotoLocalURI } from 'service/photoService';

const { width: windowWidth } = Dimensions.get('window');

function PhotoItem({ photoId, localUri, numColumns, onPress, item }) {
  const [resolvedUri, setResolvedUri] = useState(localUri ?? null);
  const size = (windowWidth - 4) / numColumns - 4;

  const isVideo = item?.isVideo || item?.mediaType === 'video';
  const isGif = (item?.uri || localUri || '').toLowerCase().endsWith('.gif');

  useEffect(() => {
    if (localUri) {
      setResolvedUri(localUri);
      return;
    }

    if (!photoId) return;

    let isMounted = true;

    const handleGetPhotoURI = async () => {
      try {
        const result = await getPhotoLocalURI(photoId);
        if (isMounted) setResolvedUri(result);
      } catch (error) {
        console.error("Error fetching local URI:", error);
      }
    };

    handleGetPhotoURI();
    return () => { isMounted = false; };
  }, [photoId, localUri]);

  const handlePress = useCallback(() => {
    onPress({ item, uri: resolvedUri });
  }, [onPress, item, resolvedUri]);

  return (
    <Pressable onPress={handlePress}>
      <View className="m-0.5 overflow-hidden bg-gray-200" style={{ width: size, height: size }}>
        {resolvedUri && (
          <Image
            source={{ uri: resolvedUri }}
            style={{ width: size, height: size }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}

        {/* Video badge */}
        {isVideo && (
          <View
            style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4, padding: 2 }}
          >
            <Ionicons name="play" size={12} color="white" />
          </View>
        )}

        {/* GIF badge */}
        {isGif && !isVideo && (
          <View
            style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}
          >
            <Ionicons name="image" size={10} color="white" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default memo(PhotoItem);