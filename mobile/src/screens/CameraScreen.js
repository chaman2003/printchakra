import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  request,
  PERMISSIONS,
  RESULTS,
  check,
} from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

const {width, height} = Dimensions.get('window');

const CameraScreen = ({navigation}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const camera = useRef(null);
  const devices = useCameraDevices();
  const device = devices.back;

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;
      
      const result = await check(permission);
      
      if (result === RESULTS.GRANTED) {
        setHasPermission(true);
      } else {
        requestCameraPermission();
      }
    } catch (error) {
      console.error('Permission check error:', error);
      Alert.alert('Error', 'Failed to check camera permission');
    }
  };

  const requestCameraPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;
      
      const result = await request(permission);
      
      if (result === RESULTS.GRANTED) {
        setHasPermission(true);
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission to scan documents',
          [
            {text: 'Cancel', onPress: () => navigation.goBack()},
            {text: 'Settings', onPress: () => {/* Open settings */}},
          ]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  const capturePhoto = async () => {
    if (!camera.current || !isCameraReady) {
      Alert.alert('Error', 'Camera is not ready');
      return;
    }

    setIsLoading(true);
    
    try {
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: flashMode,
        enableAutoRedEyeReduction: true,
      });

      console.log('Photo captured:', photo.path);
      
      // Process the captured image
      await processImage(photo.path);
      
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsLoading(false);
    }
  };

  const processImage = async (imagePath) => {
    try {
      // Generate device ID
      const deviceId = await generateDeviceId();
      
      // Upload to backend for OCR processing
      const result = await ApiService.uploadDocument(
        Platform.OS === 'ios' ? imagePath : `file://${imagePath}`,
        deviceId
      );

      Alert.alert(
        'Success!',
        `Document processed successfully!\n\nExtracted text preview:\n${
          result.extracted_text.substring(0, 100)
        }${result.extracted_text.length > 100 ? '...' : ''}`,
        [
          {text: 'Scan Another', style: 'default'},
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
            text: 'Go to Documents',
            style: 'default',
            onPress: () => navigation.navigate('Documents'),
          },
        ]
      );
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Failed',
        error.message || 'Failed to process document. Please try again.'
      );
    }
  };

  const generateDeviceId = async () => {
    // Simple device ID generation
    return `android_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const toggleFlash = () => {
    setFlashMode(current => (current === 'off' ? 'on' : 'off'));
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-alt" size={80} color="#ccc" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            PrintChakra needs camera access to scan documents
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
        enableZoomGesture={true}
        onInitialized={() => setIsCameraReady(true)}
      />

      {/* Camera overlay */}
      <View style={styles.overlay}>
        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleFlash}>
            <Icon 
              name={flashMode === 'on' ? 'flash-on' : 'flash-off'} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>

        {/* Document frame guide */}
        <View style={styles.frameGuide}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <View style={styles.captureContainer}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                isLoading && styles.captureButtonDisabled,
              ]}
              onPress={capturePhoto}
              disabled={isLoading || !isCameraReady}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#ffffff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.instructionText}>
            Position document within the frame and tap to capture
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameGuide: {
    position: 'absolute',
    top: height * 0.2,
    left: width * 0.1,
    right: width * 0.1,
    bottom: height * 0.3,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: '#2196F3',
    top: 0,
    left: 0,
  },
  topRight: {
    transform: [{rotate: '90deg'}],
    top: 0,
    right: 0,
    left: 'auto',
  },
  bottomLeft: {
    transform: [{rotate: '-90deg'}],
    bottom: 0,
    top: 'auto',
    left: 0,
  },
  bottomRight: {
    transform: [{rotate: '180deg'}],
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    borderRadius: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 20,
  },
});

export default CameraScreen;
