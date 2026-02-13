import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  StyleSheet 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config/api';

export default function UploadScreen() {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null); // Clear previous result
    }
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: image,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      console.log('Uploading to:', `${API_URL}/api/image`);

      // Upload to backend - AI will process automatically
      const response = await fetch(`${API_URL}/api/image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success! 🎉', 
          'AI has analyzed your photo and generated descriptions!'
        );
        setResult({
          success: true,
          message: 'Image processed with AI successfully'
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to process image');
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AI Photo Upload</Text>
        <Text style={styles.subtitle}>
          Upload a photo and AI will automatically generate descriptive tags
        </Text>

        <TouchableOpacity
          onPress={pickImage}
          style={styles.selectButton}
        >
          <Text style={styles.selectButtonText}>
            📷 Select Image from Gallery
          </Text>
        </TouchableOpacity>

        {image && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: image }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}

        <TouchableOpacity
          onPress={handleUpload}
          disabled={!image || uploading}
          style={[
            styles.uploadButton,
            (!image || uploading) && styles.uploadButtonDisabled
          ]}
        >
          {uploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadButtonText}>
                Processing with AI...
              </Text>
            </View>
          ) : (
            <Text style={styles.uploadButtonText}>
              🤖 Upload & Process with AI
            </Text>
          )}
        </TouchableOpacity>

        {uploading && (
          <Text style={styles.processingText}>
            AI is analyzing your photo... This may take 10-20 seconds
          </Text>
        )}

        {result && (
          <View style={[
            styles.resultContainer,
            result.success ? styles.resultSuccess : styles.resultError
          ]}>
            <Text style={styles.resultText}>
              {result.success ? '✓ ' : '✗ '}
              {result.success ? result.message : result.error}
            </Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What happens when you upload?</Text>
          <Text style={styles.infoText}>
            • AI analyzes your photo{'\n'}
            • Generates literal description (visual facts){'\n'}
            • Generates descriptive tags (context & mood){'\n'}
            • Creates searchable embeddings{'\n'}
            • Saves everything to database
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  selectButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 300,
  },
  uploadButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  processingText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#34C759',
  },
  resultError: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoBox: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
});
