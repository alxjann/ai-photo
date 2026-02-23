import { useState, useEffect, useCallback, memo } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { getPhotoLocalURI } from 'service/photoService';

const { width: windowWidth } = Dimensions.get('window');

const PhotoItem = ({ photoId, localUri, numColumns, onPress, item }) => {
  const [resolvedUri, setResolvedUri] = useState(localUri ?? null);
  const size = (windowWidth - 4) / numColumns - 4;

  useEffect(() => {
    if (localUri) {
      setResolvedUri(localUri);
      return;
    }

    let isMounted = true;

    const handleGetPhotoURI = async () => {
      try {
        const result = await getPhotoLocalURI(photoId);
        if (isMounted) {
          console.log(photoId);
          setResolvedUri(result);
        }
      } catch (error) {
        console.error("Error fetching local URI:", error);
      }
    };

    handleGetPhotoURI();
    return () => { isMounted = false; };
  }, [photoId, localUri]);

  const handlePress = useCallback(() => {
    onPress({ ...item, uri: resolvedUri });
  }, [onPress, item, resolvedUri]);

  return (
    <Pressable onPress={handlePress}>
      <View className="m-0.5 overflow-hidden bg-gray-200" style={{ width: size, height: size }}>
        {resolvedUri && (
          <Image
            source={{ uri: resolvedUri }}
            style={{ width: size, height: size }}
            contentFit="cover"
          />
        )}
      </View>
    </Pressable>
  );
};

export default memo(PhotoItem);