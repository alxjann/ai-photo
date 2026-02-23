import { Modal, View, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getPhotoLocalURI } from 'service/photoService';

export default function PhotoViewer({ visible, photo, onClose }) {
  const [localUri, setLocalUri] = useState(null);

  useEffect(() => {
    if (!photo?.photo_id) {
      setLocalUri(null);
      return;
    }

    const handleGetPhotoURI = async () => {
      const result = await getPhotoLocalURI(photo.photo_id);
      setLocalUri(result);
    };

    handleGetPhotoURI();
  }, [photo]);

  if (!visible) return null;

  const handleClose = () => {
    setLocalUri(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black justify-center items-center">
        {localUri && (
          <Image
            source={{ uri: localUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        )}
        <Pressable onPress={handleClose} className="absolute top-14 right-6 z-50 p-2 bg-black/40 rounded-full">
          <Ionicons name="close" size={32} color="white" />
        </Pressable>
      </View>
    </Modal>
  );
}