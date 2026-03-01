import { getSession } from './auth/authService';
import { API_URL } from 'config/api';

export const getPeople = async () => {
    const token = await getSession();
    const response = await fetch(`${API_URL}/api/people`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get people');
    return data.people;
};

export const registerPerson = async (imageUri, name) => {
    const token = await getSession();
    const formData = new FormData();
    formData.append('image', { uri: imageUri, name: 'face.jpg', type: 'image/jpeg' });
    formData.append('name', name);
    const response = await fetch(`${API_URL}/api/person`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to register person');
    return data.person;
};

export const deletePerson = async (personId) => {
    const token = await getSession();
    const response = await fetch(`${API_URL}/api/person/${personId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to delete person');
    return true;
};

export const getUnknownFaces = async () => {
    const token = await getSession();
    const response = await fetch(`${API_URL}/api/faces/unknown`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get unknown faces');
    return data.unknown_faces;
};

export const clusterFaces = async () => {
    const token = await getSession();
    const response = await fetch(`${API_URL}/api/faces/cluster`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Clustering failed');
    return data;
};

export const labelFace = async (unknownFaceId, name) => {
    const token = await getSession();
    const response = await fetch(`${API_URL}/api/faces/unknown/${unknownFaceId}/label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to label face');
    return data;
};