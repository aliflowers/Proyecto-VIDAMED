import { useState, useRef, useCallback, useEffect } from 'react';
import { Message } from '../types';
import { createChat } from '../src/services/geminiService';
import type { Chat } from '@google/genai';


export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    // Initialize the chat session when the hook is first used
    const chatInstance = createChat();
    chatRef.current = chatInstance;

    if (chatInstance) {
      setIsChatEnabled(true);
      setMessages([
          { id: 'initial', text: '¡Hola! Soy VidaBot, tu asistente virtual. ¿Cómo puedo ayudarte hoy con nuestros servicios de laboratorio?', sender: 'bot' }
      ]);
    } else {
      setIsChatEnabled(false);
      setMessages([
          { id: 'initial-error', text: 'El chat con IA no está disponible en este momento. Por favor, contacta al laboratorio directamente para tus consultas.', sender: 'bot' }
      ]);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !chatRef.current) return;

    const userMessage: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const stream = await chatRef.current.sendMessageStream({ message: text });
      
      let botResponse = '';
      const botMessageId = (Date.now() + 1).toString();
      
      // Add a placeholder for the bot message
      setMessages(prev => [...prev, { id: botMessageId, text: '', sender: 'bot' }]);

      for await (const chunk of stream) {
        botResponse += chunk.text;
        setMessages(prev => prev.map(msg => 
            msg.id === botMessageId ? { ...msg, text: botResponse } : msg
        ));
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = { id: 'error-' + Date.now(), text: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.', sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, isLoading, sendMessage, isChatEnabled };
};
