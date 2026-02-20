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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config/api';

export default function UploadScreen() {
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
        console.log(`Uploading image ${i + 1}/${images.length}...`);
        
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
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const data = await response.json();

        if (response.ok) {
          successfulUploads.push(i);
          console.log(`Image ${i + 1}/${images.length} uploaded successfully`);
        } else {
          const errorMsg = data.error || data.details || 'Unknown error';
          
          if (errorMsg.includes('Duplicate')) {
            duplicateCount++;
            console.log(`Image ${i + 1} is a duplicate - skipped`);
          } else {
            failedUploads.push({ index: i, error: errorMsg });
            console.error(`Image ${i + 1}/${images.length} failed:`, errorMsg);
          }
        }
      } catch (error) {
        console.error(`Image ${i + 1}/${images.length} error:`, error.message);
        failedUploads.push({ index: i, error: error.message });
      }
    }

    const successCount = successfulUploads.length;
    const failCount = failedUploads.length;
    
    let message = `Successfully processed ${successCount} out of ${images.length} photos`;
    if (duplicateCount > 0) {
      message += `\n${duplicateCount} duplicate(s) skipped`;
    }
    if (failCount > 0) {
      message += `\n${failCount} failed`;
    }
    
    Alert.alert('Upload Complete', message);
    
    setResult({
      success: true,
      message: `${successCount}/${images.length} images processed`,
      details: { 
        successful: successCount, 
        failed: failCount,
        duplicates: duplicateCount
      }
    });
    
    if (successCount > 0) {
      setImages([]);
      setManualDescription('');
    }
    
    setUploading(false);
    setCurrentProgress({ current: 0, total: 0 });
  };

  const renderImagePreview = ({ item, index }) => (
    <View style={styles.imagePreview}>
      <Image
        source={{ uri: item.uri }}
        style={styles.previewImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        onPress={() => removeImage(index)}
        style={styles.removeButton}
        disabled={uploading}
      >
        <Ionicons name="close-circle" size={24} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Photos</Text>
        <Text style={styles.subtitle}>
          Upload up to 10 photos. AI will analyze each automatically.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={pickImages}
            style={[styles.actionButton, styles.selectButton]}
            disabled={uploading}
          >
            <Ionicons name="images-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>
              Gallery ({images.length}/10)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={takePhoto}
            style={[styles.actionButton, styles.cameraButton]}
            disabled={uploading || images.length >= 10}
          >
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {images.length > 0 && (
          <>
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>
                  Selected ({images.length})
                </Text>
                <TouchableOpacity 
                  onPress={() => setImages([])}
                  disabled={uploading}
                >
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={images}
                renderItem={renderImagePreview}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.previewList}
              />
            </View>

            <View style={styles.descriptionContainer}>
              <View style={styles.descriptionHeader}>
                <Text style={styles.descriptionLabel}>
                  Add Description (Optional)
                </Text>
                <TouchableOpacity onPress={() => setShowDescriptionModal(true)}>
                  <Ionicons name="information-circle-outline" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.descriptionInput}
                placeholder="e.g., Family vacation at the beach, Summer 2024"
                placeholderTextColor="#6b7280"
                value={manualDescription}
                onChangeText={setManualDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
                editable={!uploading}
              />
              <Text style={styles.characterCount}>
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
            (images.length === 0 || uploading) && styles.uploadButtonDisabled
          ]}
        >
          {uploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadButtonText}>
                Processing {currentProgress.current}/{currentProgress.total}
              </Text>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>
                Upload & Process {images.length > 0 ? `(${images.length})` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {uploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(currentProgress.current / currentProgress.total) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.processingText}>
              Processing image {currentProgress.current} of {currentProgress.total}
            </Text>
            <Text style={styles.processingSubtext}>
              This may take 10-20 seconds per photo
            </Text>
          </View>
        )}

        {result && (
          <View style={[
            styles.resultContainer,
            result.success ? styles.resultSuccess : styles.resultError
          ]}>
            <Text style={styles.resultText}>
              {result.success ? '✓ ' : '✗ '}
              {result.message}
            </Text>
            {result.details?.duplicates > 0 && (
              <Text style={styles.resultSubtext}>
                {result.details.duplicates} duplicate(s) skipped
              </Text>
            )}
            {result.details?.failed > 0 && (
              <Text style={styles.resultSubtext}>
                {result.details.failed} failed
              </Text>
            )}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Description</Text>
            <Text style={styles.modalText}>
              Adding a description helps you find photos later. The AI will still analyze the image, but your description provides additional context.
            </Text>
            <Text style={styles.modalText}>
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
    backgroundColor: '#1f2937',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
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
    backgroundColor: '#3b82f6',
  },
  cameraButton: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clearAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  previewList: {
    marginBottom: 8,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
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
    color: '#fff',
  },
  descriptionInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#4b5563',
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
  progressContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  processingText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingSubtext: {
    marginTop: 4,
    textAlign: 'center',
    color: '#9ca3af',
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
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  resultError: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    color: '#fff',
  },
  resultSubtext: {
    fontSize: 12,
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 4,
  },
  infoBox: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});