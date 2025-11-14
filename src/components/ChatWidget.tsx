import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../hooks/useChat';
import { MessageCircle, Send, X, Bot, User, Loader, Phone, MessageSquare } from 'lucide-react';
import VoiceChat from './VoiceChat'; // Crearemos este componente a continuación

type Mode = 'selection' | 'chat' | 'voice';

const ChatInterface: React.FC = () => {
    const [inputValue, setInputValue] = useState('');
    const { messages, isLoading, sendMessage } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            sendMessage(inputValue);
            setInputValue('');
        }
    };

    return (
        <>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'bot' && (
                                <div className="flex-shrink-0 bg-primary text-white rounded-full h-8 w-8 flex items-center justify-center">
                                    <Bot size={20} />
                                </div>
                            )}
                            <div className={`px-4 py-2 rounded-lg max-w-xs md:max-w-sm ${msg.sender === 'user' ? 'bg-secondary text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                <div className="text-sm whitespace-pre-wrap">
                                    <ReactMarkdown>
                                        {msg.text}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            {msg.sender === 'user' && (
                                <div className="flex-shrink-0 bg-secondary text-white rounded-full h-8 w-8 flex items-center justify-center">
                                    <User size={20} />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                            <div className="flex-shrink-0 bg-primary text-white rounded-full h-8 w-8 flex items-center justify-center">
                                <Bot size={20} />
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-gray-200">
                                <Loader className="animate-spin text-primary" size={20} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={"Escribe tu pregunta..."}
                        className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2 rounded-full hover:bg-primary-dark disabled:bg-gray-400" disabled={isLoading}>
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </>
    );
};

const CircularTextIcon = () => (
    <svg viewBox="0 0 100 100" width="84" height="84" className="animate-spin-slow">
        <path id="circlePath" fill="none" stroke="none" d="M 12, 50 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        <text fill="#FFFFFF" fontSize="16" fontWeight="bold" letterSpacing="2.5">
            <textPath href="#circlePath" startOffset="50%" textAnchor="middle">
                ATENCION AL PACIENTE
            </textPath>
        </text>
        <MessageCircle size={32} x="34" y="34" stroke="white" />
    </svg>
);

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<Mode>('selection');

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(() => setMode('selection'), 300);
    };

    const renderContent = () => {
        switch (mode) {
            case 'chat':
                return <ChatInterface />;
            case 'voice':
                return <VoiceChat />;
            case 'selection':
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                        <h3 className="text-xl font-bold text-dark mb-6 text-center">¿Cómo prefieres comunicarte?</h3>
                        <div className="space-y-4 w-full">
                            <button onClick={() => setMode('chat')} className="w-full flex items-center justify-center p-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all">
                                <MessageSquare className="mr-3" />
                                Chatear con VidaBot
                            </button>
                            <button onClick={() => setMode('voice')} className="w-full flex items-center justify-center p-4 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-all">
                                <Phone className="mr-3" />
                                Llamar a un Asistente
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-primary text-white w-24 h-24 rounded-full shadow-lg hover:bg-primary-dark transition-transform transform hover:scale-110 z-50 flex items-center justify-center"
                aria-label="Abrir chat"
            >
                {isOpen ? <X size={32} /> : <CircularTextIcon />}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 inset-x-4 sm:inset-auto sm:right-6 w-auto sm:w-[360px] max-w-[calc(100vw-2rem)] sm:max-w-sm h-[70vh] max-h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 animate-fade-in-up">
                    <header className="bg-primary text-white p-4 flex justify-between items-center rounded-t-lg">
                        <div className="flex items-center space-x-2">
                            <Bot size={20} />
                            <h3 className="font-semibold text-lg">Atención al paciente</h3>
                        </div>
                        <button onClick={handleClose} aria-label="Cerrar chat">
                            <X size={20} />
                        </button>
                    </header>
                    {renderContent()}
                </div>
            )}
        </>
    );
};

export default ChatWidget;
