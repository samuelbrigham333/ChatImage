// AI assistance: Initial implementation developed with ChatGPT/Copilot and reviewed and adapted by the student.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBackendBaseUrl, resolveImageUrl } from '../services/api';

const MAX_RECONNECT_ATTEMPTS = 8;
const MAX_RECONNECT_DELAY_MS = 15000;
const MAX_CHAT_HISTORY = 200;

export function useChatWebSocket({ onPhotoSelected }) {
  const connectionConfig = useMemo(() => {
    try {
      const baseUrl = new URL(getBackendBaseUrl());
      return {
        wsUrl: `${baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${baseUrl.host}/ws`,
        error: '',
      };
    } catch (error) {
      return { wsUrl: null, error: error.message };
    }
  }, []);
  const [status, setStatus] = useState(connectionConfig.wsUrl ? 'connecting' : 'not_configured');
  const [connectionError, setConnectionError] = useState(connectionConfig.error);
  const [messages, setMessages] = useState([]);
  const [reconnectVersion, setReconnectVersion] = useState(0);
  const callbackRef = useRef(onPhotoSelected);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    callbackRef.current = onPhotoSelected;
  }, [onPhotoSelected]);

  useEffect(() => {
    let active = true;
    let socket;
    if (!connectionConfig.wsUrl) return undefined;
    const { wsUrl } = connectionConfig;
    const connect = () => {
      if (!active) return;
      setStatus(reconnectAttemptsRef.current ? 'reconnecting' : 'connecting');
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active || socketRef.current !== socket) return;
        reconnectAttemptsRef.current = 0;
        setConnectionError('');
        setStatus('connected');
      };

      socket.onmessage = (event) => {
        if (!active || typeof event.data !== 'string') return;
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message?.type === 'chat' && typeof message.text === 'string') {
          setMessages((current) => [...current, message].slice(-MAX_CHAT_HISTORY));
        } else if (message?.type === 'photo_selected' && typeof message.url === 'string') {
          try {
            callbackRef.current?.({ url: resolveImageUrl(message.url) });
          } catch {
            // Invalid remote URLs are ignored; the backend also validates photo selections.
          }
        }
      };

      socket.onerror = () => {
        if (active && socketRef.current === socket) {
          setConnectionError('Could not establish the WebSocket connection.');
          setStatus('offline');
        }
      };

      socket.onclose = () => {
        if (!active || socketRef.current !== socket) return;
        socketRef.current = null;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Reconnect attempts are exhausted. Tap Reconnect to try again.');
          setStatus('offline');
          return;
        }
        const delay = Math.min(750 * (2 ** reconnectAttemptsRef.current), MAX_RECONNECT_DELAY_MS);
        reconnectAttemptsRef.current += 1;
        setStatus('reconnecting');
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    reconnectAttemptsRef.current = 0;
    connect();
    return () => {
      active = false;
      clearTimeout(reconnectTimerRef.current);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [connectionConfig, reconnectVersion]);

  const send = useCallback((message) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch {
      setStatus('offline');
      return false;
    }
  }, []);

  const sendChat = useCallback((text) => {
    const normalizedText = text.trim();
    if (!normalizedText) return false;
    return send({
      type: 'chat',
      author: 'Device',
      text: normalizedText,
      timestamp: new Date().toISOString(),
    });
  }, [send]);

  const sendPhoto = useCallback((url) => {
    try {
      const safeUrl = resolveImageUrl(url);
      return send({ type: 'photo_selected', url: safeUrl });
    } catch {
      return false;
    }
  }, [send]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setReconnectVersion((value) => value + 1);
  }, []);

  return { status, connectionError, messages, sendChat, sendPhoto, reconnect };
}
