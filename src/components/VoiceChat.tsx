import React, { useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Phone, Loader, PhoneOff } from 'lucide-react';

const VoiceChat: React.FC = () => {
    const [micEnabled, setMicEnabled] = useState(false);
    const { status, startSession, endSession, isSpeaking } = useConversation({
        onError: (errorMessage: string) => {
            console.error('Voice chat error:', errorMessage);
            alert(`Error en la llamada: ${errorMessage}`);
        },
    });

    const requestMicrophone = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicEnabled(true);
            console.log('Microphone access granted.');
        } catch (error) {
            console.error('Microphone access denied:', error);
            alert('Se necesita acceso al micrófono para iniciar la llamada.');
        }
    };

    const handleStartCall = async () => {
        try {
            if (!micEnabled) {
                await requestMicrophone();
            }
            if (micEnabled || (await navigator.mediaDevices.getUserMedia({ audio: true }))) {
                console.log('Fetching ElevenLabs conversation token...');
                const resp = await fetch('/api/voice/token');
                if (!resp.ok) {
                    const text = await resp.text();
                    throw new Error(`No se pudo obtener el token de conversación. Detalles: ${text}`);
                }
                const data = await resp.json();
                const token = data?.token as string | undefined;
                if (!token) {
                    throw new Error('Respuesta inválida del servidor: token ausente');
                }
                console.log('Starting voice session with ElevenLabs...');
                await startSession({
                    conversationToken: token,
                    connectionType: 'webrtc',
                });
            }
        } catch (err: any) {
            console.error('Error al iniciar la sesión de voz:', err);
            alert(`Error al iniciar la llamada: ${err?.message || 'Error desconocido'}`);
        }
    };

    const handleEndCall = () => {
        console.log('Ending voice session...');
        endSession();
    };

    const renderStatus = () => {
        if (status === 'connected') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="relative mb-4">
                        <Phone size={48} className="text-green-500" />
                        {isSpeaking && (
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
                        )}
                    </div>
                    <p className="font-semibold text-lg text-dark">Conectado</p>
                    <p className="text-sm text-gray-500">{isSpeaking ? 'El asistente está hablando...' : 'Escuchando...'}</p>
                    <button onClick={handleEndCall} className="mt-8 flex items-center justify-center p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all">
                        <PhoneOff size={24} />
                    </button>
                </div>
            );
        }

        if (status === 'disconnected') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <h3 className="text-lg font-bold text-dark mb-4">Asistente de Voz</h3>
                    <p className="text-gray-600 mb-6">Habla directamente con un asistente de IA para resolver tus dudas.</p>
                    <button onClick={handleStartCall} className="flex items-center justify-center p-4 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all">
                        <Phone size={24} />
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader className="animate-spin text-primary" size={40} />
                <p className="mt-4 text-lg text-gray-600">Conectando...</p>
            </div>
        );
    };

    return (
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex items-center justify-center">
            {renderStatus()}
        </div>
    );
};

export default VoiceChat;
