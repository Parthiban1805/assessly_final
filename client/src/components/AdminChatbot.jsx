import axios from 'axios';
import { Send, User, UserCog, X } from 'lucide-react'; // Icons for send, user, admin bot, and close
import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config/constants'; // Import the common API base URL

/**
 * AdminChatbot component provides an interactive chat interface for administrators
 * to query and manage school data using an AI assistant.
 *
 * @param {object} props - The component props.
 * @param {function} props.closeChat - Callback function to close the chatbot window.
 * @returns {JSX.Element} The chatbot UI.
 */
const AdminChatbot = ({ closeChat }) => {
    // State to store chat messages. Initial message from the assistant.
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello Admin! How can I assist you with managing school data today?' }
    ]);
    // State for the current input value in the message composer.
    const [inputValue, setInputValue] = useState('');
    // State to indicate if a message is currently being processed by the API.
    const [isLoading, setIsLoading] = useState(false);
    // Ref to automatically scroll to the latest message.
    const messagesEndRef = useRef(null);

    /**
     * Scrolls the chat area to the bottom to show the latest messages.
     * Triggered whenever messages or loading state changes.
     */
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Effect hook to scroll to bottom when messages or loading state updates.
    useEffect(scrollToBottom, [messages, isLoading]);

    /**
     * Handles sending a new message to the chatbot.
     * Prevents sending empty messages or multiple messages while loading.
     *
     * @param {Event} e - The form submission event.
     */
    const handleSendMessage = async (e) => {
        e.preventDefault();
        // Prevent sending if input is empty or a message is already being loaded.
        if (!inputValue.trim() || isLoading) return;

        // Add user's message to the chat history.
        const userMessage = { role: 'user', content: inputValue };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue(''); // Clear input field
        setIsLoading(true); // Set loading state to true

        try {
            // Retrieve authentication token from session storage.
            const token = sessionStorage.getItem("token");
            // Exclude the initial welcome message from the conversation history sent to the backend.
            const conversationHistory = newMessages.slice(1);

            // Make API request to the admin chatbot endpoint.
            const response = await axios.post(`${API_BASE_URL}/admin/chatbot`,
                { query: inputValue, conversationHistory },
                { headers: { 'Authorization': `Bearer ${token}` } } // Include authorization header
            );

            // Add bot's reply to the chat history.
            const botMessage = { role: 'assistant', content: response.data.reply };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            // Handle API errors and display an error message from the bot.
            const errorMessageText = error.response?.data?.message || 'Sorry, I encountered an error. Please try again.';
            const errorMessage = { role: 'assistant', content: errorMessageText };
            setMessages(prev => [...prev, errorMessage]);
            console.error("Admin Chatbot error:", error); // Log detailed error for debugging
        } finally {
            setIsLoading(false); // Reset loading state regardless of success or failure.
        }
    };

    return (
        <div className="fixed bottom-5 right-5 w-full max-w-sm h-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 animate-fade-in-up z-50">
            {/* Chatbot Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <UserCog className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Admin Assistant</h3>
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Online</p>
                    </div>
                </div>
                {/* Button to close the chatbot */}
                <button onClick={closeChat} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full" aria-label="Close chat">
                    <X size={20} />
                </button>
            </div>

            {/* Messages Display Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* Assistant's avatar */}
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <UserCog className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                            </div>
                        )}
                        {/* Message bubble */}
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-100 rounded-bl-none'}`
                        }>
                            {/* `whitespace-pre-wrap` preserves newlines and wraps text */}
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                        </div>
                        {/* User's avatar */}
                         {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-slate-600 dark:text-gray-300" />
                            </div>
                        )}
                    </div>
                ))}
                {/* Loading indicator (typing animation) */}
                {isLoading && (
                     <div className="flex items-end gap-2.5 justify-start">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <UserCog className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                        </div>
                        <div className="max-w-[80%] p-3 rounded-2xl bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-100 rounded-bl-none flex items-center gap-2">
                           <span className="h-2 w-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                           <span className="h-2 w-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                           <span className="h-2 w-2 bg-slate-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                {/* Empty div for scroll reference */}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form */}
            <div className="p-4 border-t border-slate-200 dark:border-gray-700 flex-shrink-0">
                <form className="relative" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask anything..."
                        disabled={isLoading}
                        className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-gray-700 border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full transition-colors hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-600"
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
