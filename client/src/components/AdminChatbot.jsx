import axios from 'axios';
import { Send, User, UserCog, X } from 'lucide-react'; // Using a different icon for the admin bot
import { useEffect, useRef, useState } from 'react';

const AdminChatbot = ({ closeChat }) => {
    // --- All existing state and logic is preserved ---
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello Admin! How can I assist you with managing school data today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage = { role: 'user', content: inputValue };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = sessionStorage.getItem("token");
            const conversationHistory = newMessages.slice(1);

            const response = await axios.post('http://localhost:5000/api/v1/admin/chatbot', 
                { query: inputValue, conversationHistory },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            const botMessage = { role: 'assistant', content: response.data.reply };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            const errorMessageText = error.response?.data?.message || 'Sorry, I encountered an error. Please try again.';
            const errorMessage = { role: 'assistant', content: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
            console.error("Admin Chatbot error:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- UI ONLY CHANGES BELOW THIS LINE ---

    return (
        <div className="fixed bottom-5 right-5 w-full max-w-sm h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserCog className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Admin Assistant</h3>
                        <p className="text-xs text-green-600 font-semibold">Online</p>
                    </div>
                </div>
                <button onClick={closeChat} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <UserCog className="w-5 h-5 text-slate-500" />
                            </div>
                        )}
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-slate-100 text-slate-800 rounded-bl-none'}`
                        }>
                            {/* Using a div with `whitespace-pre-wrap` for better formatting control */}
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                        </div>
                         {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-slate-600" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-end gap-2.5 justify-start">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <UserCog className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="max-w-[80%] p-3 rounded-2xl bg-slate-100 text-slate-800 rounded-bl-none flex items-center gap-2">
                           <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                           <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                           <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-slate-200 flex-shrink-0">
                <form className="relative" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask anything..."
                        disabled={isLoading}
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full transition-colors hover:bg-blue-700 disabled:bg-slate-300"
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminChatbot;