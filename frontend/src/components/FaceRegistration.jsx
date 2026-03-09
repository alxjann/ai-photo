import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getThemeColors } from '../theme/appColors';
import { getSession } from '../service/auth/authService';
import { API_URL } from '../config/api';

const registerFace = async (name, imageUri) => {
    const token = await getSession();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', { uri: imageUri, name: 'face.jpg', type: 'image/jpeg' });
    const res = await fetch(`${API_URL}/api/faces/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register face');
    return data.face;
};

const getKnownFaces = async () => {
    const token = await getSession();
    const res = await fetch(`${API_URL}/api/faces`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch faces');
    return data.faces;
};

const deleteFaceApi = async (id) => {
    const token = await getSession();
    const res = await fetch(`${API_URL}/api/faces/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete face');
};

export default function FaceRegistration({ isDarkMode }) {
    const colors = getThemeColors(isDarkMode);
    const [faces, setFaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [pendingUri, setPendingUri] = useState(null);
    const [nameInput, setNameInput] = useState('');

    const loadFaces = useCallback(async () => {
        try {
            const data = await getKnownFaces();
            setFaces(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFaces(); }, []);

    const handleAdd = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: false,
            quality: 0.8,
        });
        if (result.canceled) return;
        setPendingUri(result.assets[0].uri);
        setNameInput('');
        setModalVisible(true);
    };

    const handleConfirmRegister = async () => {
        if (!nameInput.trim() || !pendingUri) return;
        setModalVisible(false);
        setRegistering(true);
        try {
            const face = await registerFace(nameInput.trim(), pendingUri);
            setFaces(prev => [...prev, face]);
            Alert.alert('Registered!', `${nameInput.trim()} has been registered. New photos with their face will be tagged automatically.`);
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setRegistering(false);
            setPendingUri(null);
            setNameInput('');
        }
    };

    const handleDelete = (face) => {
        Alert.alert('Remove Face', `Remove ${face.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteFaceApi(face.id);
                        setFaces(prev => prev.filter(f => f.id !== face.id));
                    } catch (e) {
                        Alert.alert('Error', e.message);
                    }
                },
            },
        ]);
    };

    return (
        <View className={`rounded-2xl mx-3 overflow-hidden mb-6 ${colors.cardBg}`}>
            {/* Header */}
            <View className={`flex-row items-center justify-between px-4 py-4 border-b ${colors.divider}`}>
                <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${colors.iconBg}`}>
                        <Ionicons name="people-outline" size={18} color={colors.iconColor} />
                    </View>
                    <Text className={`text-base font-semibold ${colors.textPrimary}`}>Face Recognition</Text>
                </View>
                <Pressable
                    onPress={handleAdd}
                    disabled={registering}
                    className={`flex-row items-center px-3 py-1.5 rounded-full ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-100'}`}
                >
                    {registering
                        ? <ActivityIndicator size="small" color={colors.iconColor} />
                        : <>
                            <Ionicons name="add" size={16} color={colors.iconColor} />
                            <Text className={`text-sm font-medium ml-1 ${colors.textPrimary}`}>Add</Text>
                          </>
                    }
                </Pressable>
            </View>

            {/* Face list */}
            {loading ? (
                <View className="py-6 items-center">
                    <ActivityIndicator size="small" color={colors.iconColor} />
                </View>
            ) : faces.length === 0 ? (
                <View className="py-6 px-4 items-center">
                    <Ionicons name="people-outline" size={32} color={colors.emptyIcon} />
                    <Text className={`text-sm mt-2 text-center ${colors.textSecondary}`}>
                        No faces registered yet.{'\n'}Tap Add to register someone.
                    </Text>
                </View>
            ) : (
                <View className="px-4 py-3">
                    {faces.map((face, i) => (
                        <View
                            key={face.id}
                            className={`flex-row items-center justify-between py-3 ${i < faces.length - 1 ? `border-b ${colors.divider}` : ''}`}
                        >
                            <View className="flex-row items-center">
                                <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                                    <Text className={`text-base font-bold ${colors.textPrimary}`}>
                                        {face.name[0].toUpperCase()}
                                    </Text>
                                </View>
                                <Text className={`text-base font-medium ${colors.textPrimary}`}>{face.name}</Text>
                            </View>
                            <Pressable onPress={() => handleDelete(face)} className="p-1">
                                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                            </Pressable>
                        </View>
                    ))}
                </View>
            )}

            {/* Name input modal */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <Pressable
                    className="flex-1 bg-black/50 justify-center px-6"
                    onPress={() => setModalVisible(false)}
                >
                    <Pressable onPress={() => {}} className={`rounded-2xl p-6 ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}>
                        <Text className={`text-lg font-bold mb-1 ${colors.textPrimary}`}>Who is this?</Text>
                        <Text className={`text-sm mb-4 ${colors.textSecondary}`}>Enter the name of the person in the photo</Text>
                        <TextInput
                            placeholder="e.g. Ralph"
                            placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                            value={nameInput}
                            onChangeText={setNameInput}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleConfirmRegister}
                            className={`rounded-xl px-4 py-3 mb-4 text-base ${isDarkMode ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-black'}`}
                        />
                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={() => { setModalVisible(false); setPendingUri(null); }}
                                className={`flex-1 py-3 rounded-xl items-center ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-100'}`}
                            >
                                <Text className={`font-semibold ${colors.textSecondary}`}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleConfirmRegister}
                                disabled={!nameInput.trim()}
                                className="flex-1 py-3 rounded-xl items-center bg-black"
                                style={{ opacity: nameInput.trim() ? 1 : 0.4 }}
                            >
                                <Text className="font-semibold text-white">Register</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}