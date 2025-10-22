import { useState, useCallback, useEffect } from 'react';
import { Message } from '../types';

// La estructura de un historial de chat que espera la API de Gemini
interface ChatHistoryPart {
  text: string;
}

interface ChatHistory {
  role: 'user' | 'model';
  parts: ChatHistoryPart[];
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(true);

  const initialBotMessage: Message = { id: 'initial', text: '¡Hola! Soy VidaBot, tu asistente virtual. Pregúntame sobre nuestros estudios, precios o agenda una cita.', sender: 'bot' };

  useEffect(() => {
    setMessages([initialBotMessage]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), text, sender: 'user' };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      // --- CORRECCIÓN CLAVE ---
      // Filtramos el mensaje inicial del bot antes de enviarlo al backend.
      const historyToBeSent = currentMessages
        .filter(msg => msg.id !== 'initial') // Excluye el saludo inicial
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        } as ChatHistory));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: historyToBeSent }),
      });

      let serverMessage = '';
      if (!response.ok) {
        try {
          const errJson = await response.json();
          serverMessage = (errJson && (errJson.error || errJson.message))
            ? (errJson.error || errJson.message)
            : JSON.stringify(errJson);
        } catch {
          try {
            serverMessage = await response.text();
          } catch {}
        }
        throw new Error(serverMessage || 'Error en la respuesta del servidor');
      }

      const data = await response.json();
      const replyText = (data && (data.response || data.message))
        ? (data.response || data.message)
        : 'No se recibió respuesta del servidor.';
      
      const botResponse: Message = { id: Date.now().toString(), text: replyText, sender: 'bot' };
      setMessages(prev => [...prev, botResponse]);

    } catch (error: any) {
      console.error("Error al enviar mensaje al backend:", error);
      const detail = typeof error?.message === 'string' ? error.message : 'Ocurrió un error al procesar tu solicitud.';
      const errorMessage: Message = { id: 'error-' + Date.now(), text: `Lo siento, no se pudo completar tu solicitud. Detalle: ${detail}`, sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, isLoading, sendMessage, isChatEnabled };
};