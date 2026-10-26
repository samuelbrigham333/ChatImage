// AI assistance: Initial implementation developed with ChatGPT/Copilot and reviewed and adapted by the student.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export function PhotoSection({
  photo,
  photoSelectionVersion,
  capturedUri,
  onCaptured,
  gallery,
  galleryLoading,
  galleryError,
  uploading,
  uploadStatus,
  onUpload,
  onSelectPhoto,
  onRefreshGallery,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraSelectionVersion, setCameraSelectionVersion] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);
  const cameraVisible = cameraSelectionVersion === photoSelectionVersion;

  useEffect(() => {
    onRefreshGallery();
  }, [onRefreshGallery]);

  const openCamera = async () => {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            'Camera permission needed',
            'Allow camera access in device settings to capture and share a photo.',
          );
          return;
        }
      }
      onCaptured(null);
      setCameraSelectionVersion(photoSelectionVersion);
    } catch (error) {
      Alert.alert('Camera permission unavailable', error.message);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!result?.uri) throw new Error('The camera did not return a photo.');
      onCaptured(result.uri);
      setCameraSelectionVersion(null);
    } catch (error) {
      Alert.alert('Could not capture photo', error.message);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Shared photo</Text>
          <Text style={styles.sectionSubtitle}>Upload or choose a photo for everyone</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onRefreshGallery} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>Refresh</Text>
        </Pressable>
      </View>

      {cameraVisible ? (
        <View style={styles.mediaFrame}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <View style={styles.cameraControls}>
            <Pressable onPress={() => setCameraSelectionVersion(null)} style={styles.secondaryButton}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={capturing}
              onPress={capturePhoto}
              style={[styles.primaryButton, capturing && styles.disabledButton]}
            >
              {capturing ? <ActivityIndicator color="#10141c" /> : <Text style={styles.primaryButtonText}>Capture</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.mediaFrame}>
          {capturedUri || photo?.url ? (
            <Image
              accessibilityLabel="Current shared photo"
              source={{ uri: capturedUri || photo.url }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.emptyPhoto}>
              <Text style={styles.emptyIcon}>▧</Text>
              <Text style={styles.emptyTitle}>No photo selected</Text>
              <Text style={styles.emptySubtitle}>Capture a photo or choose one below</Text>
            </View>
          )}
          {capturedUri ? (
            <View style={styles.cameraControls}>
              <Pressable onPress={() => onCaptured(null)} style={styles.secondaryButton}>
                <Text style={styles.buttonText}>Retake</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={uploading}
                onPress={() => onUpload(capturedUri)}
                style={[styles.primaryButton, uploading && styles.disabledButton]}
              >
                {uploading ? <ActivityIndicator color="#10141c" /> : <Text style={styles.primaryButtonText}>Upload</Text>}
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={uploading}
              onPress={openCamera}
              style={[styles.primaryButton, styles.cameraButton]}
            >
              <Text style={styles.primaryButtonText}>Open camera</Text>
            </Pressable>
          )}
        </View>
      )}

      {!!uploadStatus && <Text accessibilityLiveRegion="polite" style={styles.statusText}>{uploadStatus}</Text>}
      <View style={styles.galleryHeading}>
        <Text style={styles.galleryTitle}>Recent uploads</Text>
        {galleryLoading && <ActivityIndicator size="small" color="#9baac1" />}
      </View>
      {galleryError ? (
        <Text style={styles.errorText}>{galleryError}</Text>
      ) : gallery.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryList}>
          {gallery.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select photo ${item.filename}`}
              key={item.filename}
              onPress={() => {
                onCaptured(null);
                onSelectPhoto(item);
              }}
              style={[styles.thumbnailButton, photo?.url === item.url && styles.selectedThumbnail]}
            >
              <Image source={{ uri: item.url }} style={styles.thumbnail} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        !galleryLoading && <Text style={styles.emptyGallery}>No uploaded photos yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#191f2a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#293242',
  },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#f3f5f8', fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { color: '#98a5b9', fontSize: 11, marginTop: 2 },
  smallButton: { borderColor: '#3a4658', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  smallButtonText: { color: '#c5d0e0', fontSize: 11, fontWeight: '700' },
  mediaFrame: {
    flex: 1,
    minHeight: 112,
    maxHeight: 260,
    backgroundColor: '#111720',
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImage: { width: '100%', height: '100%' },
  emptyPhoto: { alignItems: 'center' },
  emptyIcon: { color: '#74849b', fontSize: 30 },
  emptyTitle: { color: '#dce3ed', fontSize: 13, fontWeight: '700', marginTop: 3 },
  emptySubtitle: { color: '#8795a9', fontSize: 11, marginTop: 3 },
  primaryButton: {
    backgroundColor: '#baf36d',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 38,
    borderRadius: 11,
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: '#17200e', fontSize: 12, fontWeight: '800' },
  cameraButton: { position: 'absolute', bottom: 10, alignSelf: 'center' },
  cameraControls: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: { backgroundColor: '#273142', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 },
  buttonText: { color: '#f5f7fa', fontWeight: '700', fontSize: 12 },
  disabledButton: { opacity: 0.55 },
  statusText: { color: '#bfccdd', fontSize: 11, marginTop: 7 },
  galleryHeading: { flexDirection: 'row', alignItems: 'center', marginTop: 9, marginBottom: 5 },
  galleryTitle: { color: '#d6dfeb', fontSize: 11, fontWeight: '700', marginRight: 8 },
  galleryList: { gap: 8, paddingVertical: 2 },
  thumbnailButton: { borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: '#3a4658' },
  selectedThumbnail: { borderColor: '#baf36d', borderWidth: 2 },
  thumbnail: { width: 48, height: 42, backgroundColor: '#283141' },
  emptyGallery: { color: '#8391a6', fontSize: 10, paddingVertical: 6 },
  errorText: { color: '#ff9d9d', fontSize: 10 },
});
