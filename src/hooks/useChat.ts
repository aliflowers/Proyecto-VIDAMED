import { useState, useCallback, useEffect } from 'react';
import { Message } from '@/types';

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
      const newMessages: Message[] = [botResponse];

      // Repreguntas dirigidas basadas en meta
      const meta = (data && data.meta) ? data.meta : undefined;
      if (meta && meta.type === 'error') {
        const slot = meta.slot as string | undefined;
        let followUp = '';
        switch (slot) {
          case 'date':
            followUp = meta.format
              ? `¿Podrías indicar la fecha en formato ${meta.format}?`
              : '¿Podrías indicar la fecha (YYYY-MM-DD) o un día de lunes a sábado?';
            break;
          case 'time':
            followUp = 'Por favor, elige una hora disponible en formato HH:mm (24h).';
            break;
          case 'location':
            if (Array.isArray(meta.options)) {
              followUp = `Elige la ubicación: ${meta.options.join(' | ')}.`;
            } else {
              followUp = 'Elige ubicación: Sede Principal Maracay | Sede La Colonia Tovar | Servicio a Domicilio.';
            }
            break;
          case 'direccion':
            followUp = 'Indica la dirección exacta para el servicio a domicilio.';
            break;
          case 'ciudad_domicilio':
            followUp = 'Indica la ciudad del domicilio: Maracay o La Colonia Tovar.';
            break;
          case 'studies':
            followUp = 'Indica el estudio (o la lista completa si son varios).';
            break;
          case 'cedula':
            followUp = 'Indica tu número de cédula (solo dígitos).';
            break;
          case 'telefono':
            followUp = 'Indica tu número de teléfono (solo dígitos).';
            break;
          case 'primer_nombre':
            followUp = '¿Cuál es tu primer nombre?';
            break;
          case 'primer_apellido':
            followUp = '¿Cuál es tu primer apellido?';
            break;
          default:
            if (meta.format) {
              followUp = `Por favor, proporciona el dato con el formato ${meta.format}.`;
            }
            break;
        }
        if (followUp) {
          newMessages.push({ id: 'followup-' + Date.now().toString(), text: followUp, sender: 'bot' });
        }
      }

      setMessages(prev => [...prev, ...newMessages]);

    } catch (error: any) {
      console.error("Error al enviar mensaje al backend:", error);
      const detail = typeof error?.message === 'string' ? error.message : 'Ocurrió un error al procesar tu solicitud.';
      const errorMessage: Message = { id: 'error-' + Date.now(), text: `Lo siento, no se pudo completar tu solicitud. Detalle: ${detail}`, sender: 'bot' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, isLoading, sendMessage };
};