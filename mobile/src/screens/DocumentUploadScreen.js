import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

const {width} = Dimensions.get('window');

const DocumentUploadScreen = ({navigation}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const pickDocuments = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.images,
          'image/jpeg',
          'image/png',
          'image/bmp',
          'image/tiff',
        ],
        allowMultiSelection: true,
      });

      setSelectedFiles(results);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
      } else {
        Alert.alert('Error', 'Failed to pick documents');
        console.error('Document picker error:', err);
      }
    }
  };

  const uploadFile = async (file, index) => {
    setIsUploading(true);
    setUploadProgress(prev => ({...prev, [index]: 0}));

    try {
      // Generate device ID
      const deviceId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[index] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return {...prev, [index]: currentProgress + 10};
        });
      }, 200);

      const result = await ApiService.uploadDocument(file.uri, deviceId);
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({...prev, [index]: 100}));

      Alert.alert(
        'Success!',
        `Document "${file.name}" processed successfully!\n\n${
          result.file_type === 'pdf' 
            ? `PDF processed with ${result.processing_details?.processing_method || 'OCR'}`
            : 'Image processed with OCR'
        }`,
        [
          {text: 'Upload More', style: 'default'},
          {
            text: 'View Document',
            style: 'default',
            onPress: () => {
              navigation.navigate('DocumentDetail', {
                documentId: result.document_id,
              });
            },
          },
          {
            text: 'View All Documents',
            style: 'default',
            onPress: () => navigation.navigate('Documents'),
          },
        ]
      );

      // Remove uploaded file from selection
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload document. Please try again.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(prev => {
        const newProgress = {...prev};
        delete newProgress[index];
        return newProgress;
      });
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = {...prev};
      delete newProgress[index];
      return newProgress;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type, name) => {
    if (type?.includes('pdf') || name?.toLowerCase().endsWith('.pdf')) {
      return '📄';
    }
    return '🖼️';
  };

  const renderFileItem = ({item, index}) => {
    const isUploading = uploadProgress[index] !== undefined;
    const progress = uploadProgress[index] || 0;

    return (
      <View style={styles.fileItem}>
        <View style={styles.fileInfo}>
          <Text style={styles.fileIcon}>
            {getFileIcon(item.type, item.name)}
          </Text>
          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(item.size)} • {item.type || 'Unknown type'}
            </Text>
            {isUploading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[styles.progressFill, {width: `${progress}%`}]} 
                  />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={() => uploadFile(item, index)}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Icon name="cloud-upload" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => removeFile(index)}
            disabled={isUploading}
          >
            <Icon name="close" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Documents</Text>
      </View>

      <View style={styles.content}>
        {selectedFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="insert-drive-file" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Documents Selected</Text>
            <Text style={styles.emptySubtitle}>
              Select images or PDF files to upload and process
            </Text>
            
            <TouchableOpacity
              style={styles.pickButton}
              onPress={pickDocuments}
            >
              <Icon name="add" size={24} color="#ffffff" />
              <Text style={styles.pickButtonText}>Select Files</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedCount}>
                {selectedFiles.length} file(s) selected
              </Text>
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={pickDocuments}
              >
                <Icon name="add" size={20} color="#007bff" />
                <Text style={styles.addMoreText}>Add More</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedFiles}
              renderItem={renderFileItem}
              keyExtractor={(item, index) => `${item.name}_${index}`}
              style={styles.fileList}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pickButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
  },
  addMoreText: {
    color: '#007bff',
    fontSize: 14,
    marginLeft: 5,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
  },
  fileActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#4caf50',
  },
  removeButton: {
    backgroundColor: '#f44336',
  },
});

export default DocumentUploadScreen;
