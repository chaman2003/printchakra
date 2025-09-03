import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Share,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

const {width} = Dimensions.get('window');

const DocumentDetailScreen = ({navigation, route}) => {
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const {documentId} = route.params;

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await ApiService.getDocument(documentId);
      setDocument(response);
    } catch (error) {
      Alert.alert('Error', 'Failed to load document');
      console.error('Load document error:', error);
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteDocument(documentId);
              Alert.alert('Success', 'Document deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
              console.error('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  const shareText = async () => {
    if (!document?.ocr_text) {
      Alert.alert('No Text', 'No text content available to share');
      return;
    }

    try {
      await Share.share({
        message: document.ocr_text,
        title: `Text from ${document.filename}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={80} color="#f44336" />
        <Text style={styles.errorText}>Document not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Document Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: ApiService.getDocumentImageUrl(documentId),
            headers: {
              Authorization: `Bearer ${ApiService.getAuthToken()}`,
            },
          }}
          style={styles.documentImage}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          resizeMode="contain"
        />
        {imageLoading && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        )}
      </View>

      {/* Document Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.filename}>{document.filename}</Text>
        
        <View style={styles.metadataContainer}>
          <View style={styles.metadataRow}>
            <Icon name="access-time" size={16} color="#666" />
            <Text style={styles.metadataText}>
              Captured: {formatDate(document.captured_at)}
            </Text>
          </View>
          
          <View style={styles.metadataRow}>
            <Icon name="storage" size={16} color="#666" />
            <Text style={styles.metadataText}>
              Size: {formatFileSize(document.metadata.file_size)}
            </Text>
          </View>
          
          {document.metadata.dimensions && (
            <View style={styles.metadataRow}>
              <Icon name="photo-size-select-actual" size={16} color="#666" />
              <Text style={styles.metadataText}>
                Dimensions: {document.metadata.dimensions.width} × {document.metadata.dimensions.height}
              </Text>
            </View>
          )}
          
          {document.metadata.processing_time && (
            <View style={styles.metadataRow}>
              <Icon name="timer" size={16} color="#666" />
              <Text style={styles.metadataText}>
                Processing time: {document.metadata.processing_time.toFixed(2)}s
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* OCR Text */}
      {document.ocr_text ? (
        <View style={styles.textContainer}>
          <View style={styles.textHeader}>
            <Text style={styles.textTitle}>Extracted Text</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareText}>
              <Icon name="share" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.ocrText} selectable={true}>
              {document.ocr_text}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noTextContainer}>
          <Icon name="text-fields" size={48} color="#ccc" />
          <Text style={styles.noTextTitle}>No text extracted</Text>
          <Text style={styles.noTextSubtitle}>
            The document might not contain readable text or the OCR processing failed.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareActionButton]}
          onPress={shareText}>
          <Icon name="share" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Share Text</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteActionButton]}
          onPress={deleteDocument}>
          <Icon name="delete" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    backgroundColor: '#ffffff',
    margin: 15,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  documentImage: {
    width: width - 30,
    height: 300,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filename: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  metadataContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  textContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  textTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    padding: 5,
  },
  textContent: {
    padding: 20,
  },
  ocrText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  noTextContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 40,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noTextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 10,
  },
  noTextSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 30,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  shareActionButton: {
    backgroundColor: '#4CAF50',
  },
  deleteActionButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DocumentDetailScreen;
