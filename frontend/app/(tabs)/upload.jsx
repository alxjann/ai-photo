import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config/api.js';

export default function UploadScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const theme = {
    background: dark ? '#000' : '#fff',
    card: dark ? '#1c1c1e' : '#f3f4f6',
    input: dark ? '#2c2c2e' : '#f3f4f6',
    border: dark ? '#3a3a3c' : '#e5e7eb',
    text: dark ? '#fff' : '#000',
    subtext: dark ? '#9ca3af' : '#6b7280',
    placeholder: dark ? '#6b7280' : '#9ca3af',
  };

  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [manualDescription, setManualDescription] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1,
    });

    if (!result.canceled) {
      setImages(result.assets);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets]);
      setResult(null);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    setUploading(true);
    setResult(null);
    setCurrentProgress({ current: 0, total: images.length });

    const successfulUploads = [];
    const failedUploads = [];
    let duplicateCount = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setCurrentProgress({ current: i + 1, total: images.length });

      try {
        const formData = new FormData();
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `photo-${i}.jpg`,
        });

        if (manualDescription.trim()) {
          formData.append('manualDescription', manualDescription.trim());
        }

        const response = await fetch(`${API_URL}/api/image`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const data = await response.json();

        if (response.ok) {
          successfulUploads.push(i);
        } else {
          const errorMsg = data.error || data.details || 'Unknown error';
          if (errorMsg.includes('Duplicate')) {
            duplicateCount++;
          } else {
            failedUploads.push({ index: i, error: errorMsg });
          }
        }
      } catch (error) {
        failedUploads.push({ index: i, error: error.message });
      }
    }

    const successCount = successfulUploads.length;
    const failCount = failedUploads.length;

    let message = `Successfully processed ${successCount} out of ${images.length} photos`;
    if (duplicateCount > 0) message += `\n${duplicateCount} duplicate(s) skipped`;
    if (failCount > 0) message += `\n${failCount} failed`;

    Alert.alert('Upload Complete', message);

    setResult({
      success: true,
      message: `${successCount}/${images.length} images processed`,
      details: { successful: successCount, failed: failCount, duplicates: duplicateCount },
    });

    if (successCount > 0) {
      setImages([]);
      setManualDescription('');
    }

    setUploading(false);
    setCurrentProgress({ current: 0, total: 0 });
  };

  const renderImagePreview = ({ item, index }) => (
    <View style={styles.imagePreviewWrapper}>
      <Image source={{ uri: item.uri }} style={styles.previewImage} resizeMode="cover" />
      <TouchableOpacity
        onPress={() => removeImage(index)}
        style={styles.removeButton}
        disabled={uploading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={22} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          Upload up to 10 photos. AI will analyze each automatically.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={pickImages}
            style={[styles.actionButton, styles.selectButton]}
            disabled={uploading}
          >
            <Ionicons name="images-outline" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Gallery ({images.length}/10)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={takePhoto}
            style={[styles.actionButton, styles.cameraButton]}
            disabled={uploading || images.length >= 10}
          >
            <Ionicons name="camera-outline" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {images.length > 0 && (
          <>
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={[styles.previewTitle, { color: theme.text }]}>
                  Selected ({images.length})
                </Text>
                <TouchableOpacity onPress={() => setImages([])} disabled={uploading}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={images}
                renderItem={renderImagePreview}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.previewListContent}
              />
            </View>

            <View style={styles.descriptionContainer}>
              <View style={styles.descriptionHeader}>
                <Text style={[styles.descriptionLabel, { color: theme.text }]}>
                  Add Description (Optional)
                </Text>
                <TouchableOpacity onPress={() => setShowDescriptionModal(true)}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.subtext} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.descriptionInput, {
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                  color: theme.text,
                }]}
                placeholder="e.g., Family vacation at the beach, Summer 2024"
                placeholderTextColor={theme.placeholder}
                value={manualDescription}
                onChangeText={setManualDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
                editable={!uploading}
              />
              <Text style={[styles.characterCount, { color: theme.subtext }]}>
                {manualDescription.length}/200
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={handleUpload}
          disabled={images.length === 0 || uploading}
          style={[
            styles.uploadButton,
            (images.length === 0 || uploading) && styles.uploadButtonDisabled,
          ]}
        >
          {uploading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadButtonText}>
                Processing {currentProgress.current}/{currentProgress.total}
              </Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
              <Text style={styles.uploadButtonText}>
                Upload & Process {images.length > 0 ? `(${images.length})` : ''}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {uploading && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.card }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentProgress.current / currentProgress.total) * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.processingText, { color: theme.text }]}>
              Processing image {currentProgress.current} of {currentProgress.total}
            </Text>
            <Text style={[styles.processingSubtext, { color: theme.subtext }]}>
              This may take 10-20 seconds per photo
            </Text>
          </View>
        )}

        {result && (
          <View style={[
            styles.resultContainer,
            result.success ? styles.resultSuccess : styles.resultError,
          ]}>
            <Text style={styles.resultText}>
              {result.success ? '✓ ' : '✗ '}{result.message}
            </Text>
            {result.details?.duplicates > 0 && (
              <Text style={styles.resultSubtext}>{result.details.duplicates} duplicate(s) skipped</Text>
            )}
            {result.details?.failed > 0 && (
              <Text style={styles.resultSubtext}>{result.details.failed} failed</Text>
            )}
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: theme.card, borderLeftColor: '#007AFF' }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>How it works</Text>
          <Text style={[styles.infoText, { color: theme.subtext }]}>
            • Select from gallery or take new photos{'\n'}
            • Add optional description for context{'\n'}
            • AI analyzes and creates searchable tags{'\n'}
            • Duplicates are automatically detected{'\n'}
            • Takes ~10-20 seconds per photo
          </Text>
        </View>
      </View>

      <Modal
        visible={showDescriptionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: dark ? '#1c1c1e' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Manual Description</Text>
            <Text style={[styles.modalText, { color: theme.subtext }]}>
              Adding a description helps you find photos later. The AI will still analyze the image, but your description provides additional context.
            </Text>
            <Text style={[styles.modalText, { color: theme.subtext }]}>
              Examples:{'\n'}
              • "Family vacation in Hawaii"{'\n'}
              • "Birthday party at home"{'\n'}
              • "Work conference 2024"
            </Text>
            <TouchableOpacity
              onPress={() => setShowDescriptionModal(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  selectButton: {
    backgroundColor: '#007AFF',
  },
  cameraButton: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  previewContainer: {
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  previewListContent: {
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  imagePreviewWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 11,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#34c759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34c759',
  },
  processingText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  processingSubtext: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#34c759',
  },
  resultError: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    color: '#000',
  },
  resultSubtext: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 4,
  },
  infoBox: {
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});