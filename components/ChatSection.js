// AI assistance: Initial implementation developed with ChatGPT/Copilot and reviewed and adapted by the student.
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export function ChatSection({ messages, connectionStatus, connectionError, onSend, onReconnect }) {
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (onSend(trimmed)) {
      setText('');
      setSendError('');
    } else {
      setSendError('Message not sent. Reconnect to the chat and try again.');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Live chat</Text>
          <Text style={styles.subtitle}>{messages.length} message{messages.length === 1 ? '' : 's'} this session</Text>
        </View>
        {connectionStatus !== 'connected' && (
          <Pressable accessibilityRole="button" onPress={onReconnect} style={styles.reconnectButton}>
            <Text style={styles.reconnectText}>Reconnect</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptySubtitle}>Messages appear here for everyone connected.</Text>
          </View>
        ) : messages.map((message, index) => (
          <View key={`${message.timestamp || 'message'}-${index}`} style={styles.messageBubble}>
            <View style={styles.messageMeta}>
              <Text style={styles.author}>{message.author || 'Device'}</Text>
              {!!message.timestamp && (
                <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
              )}
            </View>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      {connectionStatus !== 'connected' && !!connectionError && (
        <Text style={styles.connectionError}>{connectionError}</Text>
      )}
      {!!sendError && <Text style={styles.errorText}>{sendError}</Text>}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Chat message"
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          placeholder="Write a message…"
          placeholderTextColor="#8290a5"
          returnKeyType="send"
          maxLength={1000}
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!text.trim()}
          onPress={sendMessage}
          style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#191f2a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#293242',
  },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: '#f3f5f8', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#98a5b9', fontSize: 10, marginTop: 2 },
  reconnectButton: { backgroundColor: '#293548', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  reconnectText: { color: '#dce5f2', fontSize: 10, fontWeight: '700' },
  messageList: { flex: 1, minHeight: 0 },
  messageContent: { flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 4, gap: 7 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#c7d0df', fontSize: 12, fontWeight: '700' },
  emptySubtitle: { color: '#8391a6', fontSize: 10, marginTop: 4, textAlign: 'center' },
  messageBubble: { alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: '#252e3d', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 8 },
  author: { color: '#baf36d', fontWeight: '800', fontSize: 10 },
  timestamp: { color: '#8190a5', fontSize: 9 },
  messageText: { color: '#eef1f5', fontSize: 12, lineHeight: 17 },
  errorText: { color: '#ff9d9d', fontSize: 10, marginBottom: 5 },
  connectionError: { color: '#d8b873', fontSize: 10, marginTop: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: '#2a3444', paddingTop: 9, marginTop: 8 },
  input: { flex: 1, maxHeight: 80, minHeight: 40, backgroundColor: '#111720', borderRadius: 11, color: '#f2f4f8', paddingHorizontal: 11, paddingVertical: 9, fontSize: 12 },
  sendButton: { height: 40, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#baf36d', borderRadius: 11 },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: '#17200e', fontWeight: '800', fontSize: 11 },
});
