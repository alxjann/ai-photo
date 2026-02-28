import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getPeople, registerPerson, deletePerson } from 'service/peopleService';
import { useRouter } from 'expo-router';

export default function People() {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [registering, setRegistering] = useState(false);
    const router = useRouter();

    const fetchPeople = useCallback(async () => {
        try {
            const data = await getPeople();
            setPeople(data);
        } catch (e) {
            console.error('fetchPeople error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPeople(); }, []);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Gallery access is required to pick a photo.');
            return;
        }
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
            setModalVisible(false);
            setName('');
            setSelectedImage(null);
        } catch (e) {
            Alert.alert('Registration failed', e.message);
        } finally {
            setRegistering(false);
        }
    };

    const handleDelete = (person) => {
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

    const renderPerson = ({ item }) => (
        <Pressable
            onPress={() => handlePersonPress(item)}
            onLongPress={() => handleDelete(item)}
            className="flex-row items-center px-4 py-3 border-b border-gray-100"
        >
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="#9ca3af" />
            </View>
            <Text className="text-base font-medium text-gray-900 capitalize flex-1">{item.name}</Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
        </Pressable>
    );

    return (
        <View className="flex-1 bg-white">
            <View className="bg-white pt-16 pb-3 px-4 border-b border-gray-100">
                <View className="flex-row items-center justify-between">
                    <Text className="text-3xl font-extrabold text-gray-900 tracking-tight">People</Text>
                    <Pressable onPress={() => setModalVisible(true)}>
                        <Ionicons name="person-add-outline" size={22} color="#111" />
                    </Pressable>
                </View>
                <Text className="text-xs text-gray-400 mt-0.5">
                    {people.length} {people.length === 1 ? 'person' : 'people'}
                </Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#000" />
                </View>
            ) : people.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8">
                    <Ionicons name="people-outline" size={48} color="#d1d5db" />
                    <Text className="text-gray-400 text-center mt-4 text-base">
                        No people added yet. Tap the icon above to register someone.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={people}
                    keyExtractor={item => item.id}
                    renderItem={renderPerson}
                />
            )}

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white px-6 pt-8">
                    <View className="flex-row items-center justify-between mb-8">
                        <Text className="text-2xl font-bold text-gray-900">Add Person</Text>
                        <Pressable onPress={() => { setModalVisible(false); setName(''); setSelectedImage(null); }}>
                            <Ionicons name="close" size={24} color="#111" />
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={pickImage}
                        className="w-full h-48 bg-gray-100 rounded-2xl items-center justify-center mb-6"
                    >
                        {selectedImage ? (
                            <Text className="text-green-600 font-medium">Photo selected ✓</Text>
                        ) : (
                            <>
                                <Ionicons name="camera-outline" size={36} color="#9ca3af" />
                                <Text className="text-gray-400 mt-2">Tap to pick a clear face photo</Text>
                            </>
                        )}
                    </Pressable>

                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Name (e.g. Ralph)"
                        placeholderTextColor="#aaa"
                        className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 text-base mb-6"
                    />

                    <Pressable
                        onPress={handleRegister}
                        disabled={registering}
                        className="bg-black rounded-xl py-4 items-center"
                    >
                        {registering
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-semibold text-base">Register</Text>
                        }
                    </Pressable>

                    <Text className="text-xs text-gray-400 text-center mt-4">
                        Use a clear, front-facing photo for best results. Long-press a person to remove them.
                    </Text>
                </View>
            </Modal>
        </View>
    );
}