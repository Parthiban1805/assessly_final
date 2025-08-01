import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, X, Bot, User } from 'lucide-react'; // Icons for send, close, bot, user
import { API_BASE_URL } from '../config/constants'; // Import the common API base URL

/**
 * TeacherChatbot component provides an interactive chat interface for teachers
 * to query student reports and data using an AI assistant.
 *
 * @param {object} props - The component props.
 * @param {function} props.closeChat - Callback function to close the chatbot window.
 * @returns {JSX.Element} The chatbot UI.
 */
const TeacherChatbot = ({ closeChat }) => {
    // State to store chat messages. Initial message from the bot.
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I help you with your student reports today?' }
    ]);
    // State for the current input value in the message composer.
    const [inputValue, setInputValue] = useState('');
    // State to indicate if a message is currently being processed by the API.
    const [isLoading, setIsLoading] = useState(false);
    // Ref to automatically scroll to the latest message in the chat.
    const messagesEndRef = useRef(null);

    /**
     * Scrolls the chat area to the bottom smoothly to show the latest messages.
     * Triggered whenever messages or loading state changes.
     */
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Effect hook to trigger scrolling to bottom after messages or loading state updates.
    useEffect(scrollToBottom, [messages, isLoading]);

    /**
     * Parses markdown tables from a given text and converts them into HTML tables.
     * This is crucial for displaying structured data returned by the AI.
     * The generated table is wrapped in a scrollable div for responsiveness.
     *
     * @param {string} text - The input text possibly containing markdown tables.
     * @returns {string} HTML string with tables converted and wrapped.
     */
    const parseMarkdownTable = (text) => {
        const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g;
        return text.replace(tableRegex, (match, headerRow, bodyRows) => {
            const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
            const rows = bodyRows.trim().split('\n').map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell));

            // Create a wrapper div that allows horizontal scrolling on small screens
            let tableWrapper = '<div class="overflow-x-auto rounded-md border border-slate-300 dark:border-gray-600 my-2">';

            let html = '<table class="w-full text-left border-collapse">';
            html += '<thead><tr class="bg-slate-100 dark:bg-gray-700">';
            headers.forEach(header => { html += `<th class="p-2 border-b border-slate-300 dark:border-gray-600 font-semibold text-slate-700 dark:text-gray-200 whitespace-nowrap">${header}</th>`; });
            html += '</tr></thead>';
            html += '<tbody>';
            rows.forEach(row => {
                html += '<tr class="border-b border-slate-200 dark:border-gray-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-gray-700/50">';
                row.forEach(cell => { html += `<td class="p-2 text-slate-800 dark:text-gray-100 whitespace-nowrap">${cell}</td>`; });
                html += '</tr>';
            });
            html += '</tbody></table>';

            tableWrapper += html + '</div>'; // Close the wrapper div

            return tableWrapper;
        });
    };

    /**
     * Renders message content, applying markdown table parsing and newline conversion.
     * Uses `dangerouslySetInnerHTML` as content comes from AI.
     *
     * @param {string} text - The raw text content of a message.
     * @returns {JSX.Element} A div containing the processed HTML content.
     */
    const renderMessageContent = (text) => {
        let processedText = parseMarkdownTable(text);
        // Replace newlines that are NOT part of the table logic now, if no table was processed.
        if (!processedText.includes('<table')) {
            processedText = processedText.replace(/\n/g, '<br>');
        }
        return <div className="prose prose-sm max-w-none prose-p:my-0 text-slate-800 dark:text-gray-100" dangerouslySetInnerHTML={{ __html: processedText }} />;
    };

    /**
     * Handles sending a new message to the chatbot API.
     * Prevents sending empty messages or multiple messages while loading.
     *
     * @param {Event} e - The form submission event.
     */
    const handleSendMessage = async (e) => {
        e.preventDefault();
        // Prevent sending if input is empty or a message is already being loaded.
        if (!inputValue.trim() || isLoading) return;

        // Add user's message to the chat history.
        const userMessage = { sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue(''); // Clear input field
        setIsLoading(true); // Set loading state to true

        try {
            // Retrieve authentication token from session storage.
            const token = sessionStorage.getItem("token");
            // Make API request to the teacher report chatbot endpoint.
            const response = await axios.post(`${API_BASE_URL}/reports/chatbot`,
                { query: inputValue }, // Send user query
                { headers: { 'Authorization': `Bearer ${token}` } } // Include authorization header
            );
            // Add bot's reply to the chat history.
            const botMessage = { sender: 'bot', text: response.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            // Handle API errors and display a generic error message from the bot.
            const errorMessage = { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
            console.error("Teacher Chatbot error:", error); // Log detailed error for debugging
        } finally {
            setIsLoading(false); // Reset loading state regardless of success or failure.
        }
    };

    return (
        <div className="fixed bottom-5 right-5 w-full max-w-sm h-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 animate-fade-in-up z-40">
            {/* Chatbot Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-800 dark:text-white">Teaching Assistant</h3>
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
                    <div key={index} className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* Bot's avatar */}
                        {msg.sender === 'bot' && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                            </div>
                        )}
                        {/* Message bubble, rendered with content parsing */}
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-100 rounded-bl-none'}`
                        }>
                            {renderMessageContent(msg.text)}
                        </div>
                        {/* User's avatar */}
                         {msg.sender === 'user' && (
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
                            <Bot className="w-5 h-5 text-slate-500 dark:text-gray-400" />
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
                        placeholder="Ask about your students..."
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

export default TeacherChatbot;
