// AI assistance: Initial implementation developed with ChatGPT/Copilot and reviewed and adapted by the student.
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ChatSection } from './components/ChatSection';
import { PhotoSection } from './components/PhotoSection';
import { getPhotos, uploadPhoto } from './services/api';
import { useChatWebSocket } from './hooks/useChatWebSocket';

export default function App() {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [capturedUri, setCapturedUri] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [photoSelectionVersion, setPhotoSelectionVersion] = useState(0);
  const uploadLockRef = useRef(false);

  const handlePhotoSelected = useCallback((photo) => {
    setSelectedPhoto(photo);
    setCapturedUri(null);
    setPhotoSelectionVersion((version) => version + 1);
  }, []);

  const { status, connectionError, messages, sendChat, sendPhoto, reconnect } = useChatWebSocket({
    onPhotoSelected: handlePhotoSelected,
  });

  const refreshGallery = useCallback(async () => {
    setGalleryLoading(true);
    setGalleryError('');
    try {
      setGallery(await getPhotos());
    } catch (error) {
      setGalleryError(error.message);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const handleUpload = useCallback(async (uri) => {
    if (uploadLockRef.current) return;
    uploadLockRef.current = true;
    setUploading(true);
    setUploadStatus('Uploading photo…');
    try {
      const photo = await uploadPhoto(uri);
      setSelectedPhoto(photo);
      setCapturedUri(null);
      setPhotoSelectionVersion((version) => version + 1);
      setUploadStatus('Photo uploaded.');
      await refreshGallery();
      if (!sendPhoto(photo.url)) {
        setUploadStatus('Photo uploaded, but it could not be shared. Check the chat connection.');
      }
    } catch (error) {
      setUploadStatus(`Upload failed: ${error.message}`);
    } finally {
      uploadLockRef.current = false;
      setUploading(false);
    }
  }, [refreshGallery, sendPhoto]);

  const handleSelectPhoto = useCallback((photo) => {
    setSelectedPhoto(photo);
    setCapturedUri(null);
    setPhotoSelectionVersion((version) => version + 1);
    if (!sendPhoto(photo.url)) {
      Alert.alert('Not shared yet', 'The photo is selected on this device, but the chat connection is unavailable.');
    }
  }, [sendPhoto]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CS3720 · MINI PROJECT 1</Text>
            <Text style={styles.title}>Chat About a Photo</Text>
          </View>
          <View style={styles.connectionPill}>
            <View style={[styles.connectionDot, status === 'connected' && styles.connectedDot]} />
            <Text style={styles.connectionText}>{statusLabel(status)}</Text>
          </View>
        </View>
        <View style={styles.photoArea}>
          <PhotoSection
            photo={selectedPhoto}
            photoSelectionVersion={photoSelectionVersion}
            capturedUri={capturedUri}
            onCaptured={setCapturedUri}
            gallery={gallery}
            galleryLoading={galleryLoading}
            galleryError={galleryError}
            uploading={uploading}
            uploadStatus={uploadStatus}
            onUpload={handleUpload}
            onSelectPhoto={handleSelectPhoto}
            onRefreshGallery={refreshGallery}
          />
        </View>
        <View style={styles.chatArea}>
          <ChatSection
            messages={messages}
            connectionStatus={status}
            connectionError={connectionError}
            onSend={sendChat}
            onReconnect={reconnect}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function statusLabel(status) {
  if (status === 'connected') return 'Live';
  if (status === 'connecting' || status === 'reconnecting') return 'Connecting';
  if (status === 'not_configured') return 'Set URL';
  return 'Offline';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#10141c' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eyebrow: { color: '#91a0b6', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: '#f5f7fa', fontSize: 22, fontWeight: '800', marginTop: 2 },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202734',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#f0ae58', marginRight: 6 },
  connectedDot: { backgroundColor: '#5bd19b' },
  connectionText: { color: '#d8dfeb', fontSize: 11, fontWeight: '700' },
  photoArea: { flex: 0.85, minHeight: 0, marginBottom: 12 },
  chatArea: { flex: 1.15, minHeight: 0 },
});
