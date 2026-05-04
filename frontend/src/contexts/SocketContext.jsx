import { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const subscriptionsRef = useRef({});

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        // Re-subscribe to all pending subscriptions
        Object.entries(subscriptionsRef.current).forEach(([dest, cb]) => {
          client.subscribe(dest, msg => cb(JSON.parse(msg.body)));
        });
      },
      onDisconnect: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      setConnected(false);
    };
  }, [user]);

  const subscribe = useCallback((destination, callback) => {
    subscriptionsRef.current[destination] = callback;
    if (clientRef.current?.connected) {
      const sub = clientRef.current.subscribe(destination, msg => callback(JSON.parse(msg.body)));
      return () => {
        sub.unsubscribe();
        delete subscriptionsRef.current[destination];
      };
    }
    return () => { delete subscriptionsRef.current[destination]; };
  }, []);

  const send = useCallback((destination, body) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body)
      });
    }
  }, []);

  return (
    <SocketContext.Provider value={{ connected, subscribe, send }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
