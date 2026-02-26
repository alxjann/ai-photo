import { Modal, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export default function PhotoViewer({ visible, photo, onClose, onDelete, isDeleting = false }) {
  if (!visible || !photo) return null;

  return (
    <Modal visible={visible} transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-black justify-center items-center">
        {photo.uri && (
          <Image
            source={{ uri: photo.uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
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
