import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Alert, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { getPeople, registerPerson, deletePerson, getUnknownFaces, clusterFaces, labelFace } from 'service/peopleService';
import { getPhotoLocalURI } from 'service/photoService';
import { getSession } from 'service/auth/authService';
import { API_URL } from 'config/api';
import { useRouter } from 'expo-router';

export default function People() {
    const [people, setPeople] = useState([]);
    const [unknownFaces, setUnknownFaces] = useState([]);
    const [unknownUris, setUnknownUris] = useState({});
    const [loading, setLoading] = useState(true);
    const [clustering, setClustering] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [labelModalVisible, setLabelModalVisible] = useState(false);
    const [selectedUnknown, setSelectedUnknown] = useState(null);
    const [name, setName] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [registering, setRegistering] = useState(false);
    const [labeling, setLabeling] = useState(false);
    const router = useRouter();

    const fetchAll = useCallback(async () => {
        try {
            const [peopleData, unknownData] = await Promise.all([getPeople(), getUnknownFaces()]);
            setPeople(peopleData);
            setUnknownFaces(unknownData);
            resolveUnknownUris(unknownData);
        } catch (e) {
            console.error('fetchAll error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const resolveUnknownUris = async (unknownData) => {
        const uris = {};
        await Promise.all(unknownData.map(async (face) => {
            if (face.representative_photo_id) {
                try {
                    const token = await getSession();
                    const response = await fetch(`${API_URL}/api/photo/${face.representative_photo_id}`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const data = await response.json();
                    if (data?.photo?.device_asset_id) {
                        const uri = await getPhotoLocalURI(data.photo.device_asset_id);
                        uris[face.id] = uri;
                    }
                } catch {}
            }
        }));
        setUnknownUris(uris);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleCluster = async () => {
        setClustering(true);
        try {
            await clusterFaces();
            await fetchAll();
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setClustering(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission needed', 'Gallery access is required.');
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
        if (!result.canceled) setSelectedImage(result.assets[0].uri);
    };

    const handleRegister = async () => {
        if (!name.trim()) return Alert.alert('Name required', 'Please enter a name.');
        if (!selectedImage) return Alert.alert('Photo required', 'Please select a photo.');
        setRegistering(true);
        try {
            const person = await registerPerson(selectedImage, name.trim());
            setPeople(prev => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
            setAddModalVisible(false);
            setName('');
            setSelectedImage(null);
        } catch (e) {
            Alert.alert('Registration failed', e.message);
        } finally {
            setRegistering(false);
        }
    };

    const handleLabel = async () => {
        if (!name.trim()) return Alert.alert('Name required', 'Please enter a name.');
        setLabeling(true);
        try {
            await labelFace(selectedUnknown.id, name.trim());
            setUnknownFaces(prev => prev.filter(f => f.id !== selectedUnknown.id));
            const updatedPeople = await getPeople();
            setPeople(updatedPeople);
            setLabelModalVisible(false);
            setName('');
            setSelectedUnknown(null);
        } catch (e) {
            Alert.alert('Failed', e.message);
        } finally {
            setLabeling(false);
        }
    };

    const handleDeletePerson = (person) => {
        Alert.alert(`Remove ${person.name}?`, 'They will no longer be recognized in new uploads.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    await deletePerson(person.id);
                    setPeople(prev => prev.filter(p => p.id !== person.id));
                }
            },
        ]);
    };

    const handlePersonPress = (person) => {
        router.push({ pathname: '/(tabs)/library', params: { query: person.name } });
    };

    const FaceAvatar = ({ uri, size = 48 }) => (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
            {uri
                ? <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
                : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={size * 0.5} color="#9ca3af" />
                  </View>
            }
        </View>
    );

    const renderPerson = ({ item }) => (
        <Pressable
            onPress={() => handlePersonPress(item)}
            onLongPress={() => handleDeletePerson(item)}
            className="flex-row items-center px-4 py-3 border-b border-gray-100"
        >
            <FaceAvatar uri={null} size={44} />
            <Text className="text-base font-medium text-gray-900 capitalize flex-1 ml-3">{item.name}</Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
        </Pressable>
    );

    const renderUnknown = ({ item, index }) => (
        <Pressable
            onPress={() => { setSelectedUnknown(item); setLabelModalVisible(true); }}
            className="flex-row items-center px-4 py-3 border-b border-gray-100"
        >
            <FaceAvatar uri={unknownUris[item.id]} size={44} />
            <View className="ml-3 flex-1">
                <Text className="text-base font-medium text-gray-900">Unknown Person {index + 1}</Text>
                <Text className="text-xs text-gray-400">Tap to name</Text>
            </View>
            <Ionicons name="help-circle-outline" size={20} color="#9ca3af" />
        </Pressable>
    );

    return (
        <View className="flex-1 bg-white">
            <View className="bg-white pt-16 pb-3 px-4 border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                    <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">People</Text>
                    <View className="flex-row gap-4">
                        <Pressable onPress={handleCluster} disabled={clustering}>
                            {clustering
                                ? <ActivityIndicator color="#000" />
                                : <Ionicons name="scan-outline" size={22} color="#111" />
                            }
                        </Pressable>
                        <Pressable onPress={() => setAddModalVisible(true)}>
                            <Ionicons name="person-add-outline" size={22} color="#111" />
                        </Pressable>
                    </View>
                </View>
                <Text className="text-xs text-gray-400 mt-0.5">
                    {people.length} named · {unknownFaces.length} unknown
                </Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#000" />
                </View>
            ) : (
                <FlatList
                    data={[
                        ...unknownFaces.map(f => ({ ...f, _type: 'unknown' })),
                        ...people.map(p => ({ ...p, _type: 'known' })),
                    ]}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={unknownFaces.length > 0 ? (
                        <View className="px-4 pt-4 pb-2">
                            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Name These People</Text>
                        </View>
                    ) : null}
                    renderItem={({ item, index }) =>
                        item._type === 'unknown'
                            ? renderUnknown({ item, index })
                            : renderPerson({ item })
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-8 pt-20">
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text className="text-gray-400 text-center mt-4 text-base">
                                Upload photos with faces, then tap the scan icon to find people.
                            </Text>
                        </View>
                    }
                />
            )}

            <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white px-6 pt-8">
                    <View className="flex-row items-center justify-between mb-8">
                        <Text className="text-2xl font-bold text-gray-900">Add Person</Text>
                        <Pressable onPress={() => { setAddModalVisible(false); setName(''); setSelectedImage(null); }}>
                            <Ionicons name="close" size={24} color="#111" />
                        </Pressable>
                    </View>
                    <Pressable onPress={pickImage} className="w-full h-48 bg-gray-100 rounded-2xl items-center justify-center mb-6">
                        {selectedImage
                            ? <Text className="text-green-600 font-medium">Photo selected ✓</Text>
                            : <>
                                <Ionicons name="camera-outline" size={36} color="#9ca3af" />
                                <Text className="text-gray-400 mt-2">Tap to pick a clear face photo</Text>
                              </>
                        }
                    </Pressable>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Name (e.g. Ralph)"
                        placeholderTextColor="#aaa"
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 text-base mb-6"
                    />
                    <Pressable onPress={handleRegister} disabled={registering} className="bg-black rounded-xl py-4 items-center">
                        {registering ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-base">Register</Text>}
                    </Pressable>
                </View>
            </Modal>

            <Modal visible={labelModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white px-6 pt-8">
                    <View className="flex-row items-center justify-between mb-8">
                        <Text className="text-2xl font-bold text-gray-900">Who is this?</Text>
                        <Pressable onPress={() => { setLabelModalVisible(false); setName(''); setSelectedUnknown(null); }}>
                            <Ionicons name="close" size={24} color="#111" />
                        </Pressable>
                    </View>
                    {selectedUnknown && unknownUris[selectedUnknown.id] && (
                        <View className="w-full h-64 rounded-2xl overflow-hidden mb-6 bg-gray-100">
                            <Image source={{ uri: unknownUris[selectedUnknown.id] }} className="w-full h-full" resizeMode="cover" />
                        </View>
                    )}
                    {(!selectedUnknown || !unknownUris[selectedUnknown?.id]) && (
                        <View className="w-full h-48 bg-gray-100 rounded-2xl items-center justify-center mb-6">
                            <Ionicons name="person-outline" size={64} color="#d1d5db" />
                            <Text className="text-gray-400 mt-2 text-sm">No preview available</Text>
                        </View>
                    )}
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter their name"
                        placeholderTextColor="#aaa"
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 text-base mb-4"
                        autoFocus
                    />
                    <Pressable onPress={handleLabel} disabled={labeling} className="bg-black rounded-xl py-4 items-center">
                        {labeling ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-base">That's {name || '...'}</Text>}
                    </Pressable>
                </View>
            </Modal>
        </View>
    );
}