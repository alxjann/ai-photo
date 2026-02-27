import { useState } from 'react';
import { Modal, View, Pressable, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { deletePhoto } from 'service/photoService';

function TagPill({ tag }) {
    return (
        <View className="bg-white/10 border border-white/20 rounded-full px-3 py-1 mr-2 mb-2">
            <Text className="text-white/80 text-xs">{tag}</Text>
        </View>
    );
}

function Section({ title, content }) {
    if (!content) return null;
    return (
        <View className="mb-5">
            <Text className="text-white/40 text-xs font-medium uppercase tracking-widest mb-2">
                {title}
            </Text>
            <Text className="text-white/90 text-sm leading-relaxed">{content}</Text>
        </View>
    );
}

export default function PhotoViewer({ visible, photo, onClose, onDelete }) {
    const [showDetails, setShowDetails] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        Alert.alert(
            'Delete Photo',
            'This will remove the photo from your library. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            await deletePhoto(photoData.id);
                            setDeleting(false);
                            onClose();
                            onDelete?.(photoData.id);
                        } catch (err) {
                            setDeleting(false);
                            Alert.alert('Error', 'Failed to delete photo. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    if (!visible || !photo) return null;

    // PhotoItem passes { item, uri } — unwrap if needed
    const photoData = photo.item ? { ...photo.item, uri: photo.uri } : photo;

    const tags = photoData.tags
        ? photoData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

    return (
        <Modal visible={visible} transparent={false} onRequestClose={onClose}>
            <View className="flex-1 bg-black">

                {/* Photo */}
                <View className="flex-1 justify-center items-center">
                    {photoData.uri && (
                        <Image
                            source={{ uri: photoData.uri }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />
                    )}
                </View>

                {/* Top bar */}
                <View className="absolute top-0 left-0 right-0 flex-row justify-between items-center pt-14 px-5 z-50">
                    <Pressable
                        onPress={onClose}
                        className="p-2 bg-black/40 rounded-full"
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </Pressable>

                    <View className="flex-row items-center gap-2">
                        {/* Details button — only show if photo has AI data */}
                        {(photoData.descriptive || photoData.literal || photoData.tags) && (
                            <Pressable
                                onPress={() => setShowDetails(true)}
                                className="flex-row items-center gap-1.5 bg-black/40 rounded-full px-4 py-2"
                            >
                                <Ionicons name="information-circle-outline" size={16} color="white" />
                                <Text className="text-white text-sm font-medium">Details</Text>
                            </Pressable>
                        )}

                        {/* Delete button */}
                        <Pressable
                            onPress={handleDelete}
                            disabled={deleting}
                            className="p-2 bg-black/40 rounded-full"
                        >
                            {deleting
                                ? <ActivityIndicator size="small" color="white" />
                                : <Ionicons name="trash-outline" size={22} color="#ff4444" />
                            }
                        </Pressable>
                    </View>
                </View>

                {/* Details bottom sheet */}
                {showDetails && (
                    <View className="absolute inset-0 z-50">
                        {/* Backdrop */}
                        <Pressable
                            className="absolute inset-0 bg-black/60"
                            onPress={() => setShowDetails(false)}
                        />

                        {/* Sheet */}
                        <View className="absolute bottom-0 left-0 right-0 bg-neutral-950 rounded-t-3xl max-h-[70%]">
                            {/* Handle */}
                            <View className="items-center pt-3 pb-2">
                                <View className="w-10 h-1 bg-white/20 rounded-full" />
                            </View>

                            {/* Header */}
                            <View className="flex-row justify-between items-center px-5 pb-3 border-b border-white/10">
                                <Text className="text-white font-semibold text-base">Photo Details</Text>
                                <Pressable onPress={() => setShowDetails(false)}>
                                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
                                </Pressable>
                            </View>

                            <ScrollView
                                className="px-5 pt-4"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 40 }}
                            >
                                <Section title="Description" content={photoData.descriptive} />
                                <Section title="Visual Details" content={photoData.literal} />

                                {tags.length > 0 && (
                                    <View className="mb-5">
                                        <Text className="text-white/40 text-xs font-medium uppercase tracking-widest mb-3">
                                            Tags
                                        </Text>
                                        <View className="flex-row flex-wrap">
                                            {tags.map((tag, i) => (
                                                <TagPill key={i} tag={tag} />
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {photoData.needs_reprocessing && (
                                    <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                                        <Text className="text-yellow-400 text-xs">
                                            ⚠️ This photo hasn't been analyzed by AI yet.
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}