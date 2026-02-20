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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config/api';

export default function UploadScreen() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  const pickImages = async () => {
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

        const response = await fetch(`${API_URL}/api/image`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
          successfulUploads.push(i);
          console.log(`Image ${i + 1}/${images.length} uploaded successfully`);
        } else {
          const errorMsg = data.error || data.details || 'Unknown error';
          console.log('Error message:', errorMsg);
          
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
        <Text style={styles.removeButtonText}>✕</Text>
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

        <TouchableOpacity
          onPress={pickImages}
          style={styles.selectButton}
          disabled={uploading}
        >
          <Text style={styles.selectButtonText}>
            📷 Select Images ({images.length}/10)
          </Text>
        </TouchableOpacity>

        {images.length > 0 && (
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
            <Text style={styles.uploadButtonText}>
              🤖 Upload & Process {images.length > 0 ? `(${images.length})` : ''}
            </Text>
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
              🔄 Processing image {currentProgress.current} of {currentProgress.total}
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
            {result.details?.failed > 0 && (
              <Text style={styles.resultSubtext}>
                {result.details.failed} image(s) failed to process
              </Text>
            )}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            • Select up to 10 photos{'\n'}
            • AI analyzes each photo{'\n'}
            • Creates searchable descriptions{'\n'}
            • Uploads one by one for progress tracking{'\n'}
            • Takes ~10-20 seconds per photo
          </Text>
        </View>
      </View>
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
  selectButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  selectButtonText: {
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
});