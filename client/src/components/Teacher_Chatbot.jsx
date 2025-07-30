import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, X, Bot, User } from 'lucide-react';

const TeacherChatbot = ({ closeChat }) => {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I help you with your student reports today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    // THE FIX: The generated table is now wrapped in a scrollable div.
    const parseMarkdownTable = (text) => {
        const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g;
        return text.replace(tableRegex, (match, headerRow, bodyRows) => {
            const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
            const rows = bodyRows.trim().split('\n').map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell));
            
            // Create a wrapper div that allows horizontal scrolling on small screens
            let tableWrapper = '<div class="overflow-x-auto rounded-md border border-slate-300 my-2">';
            
            let html = '<table class="w-full text-left border-collapse">';
            html += '<thead><tr class="bg-slate-100">';
            headers.forEach(header => { html += `<th class="p-2 border-b border-slate-300 font-semibold text-slate-700 whitespace-nowrap">${header}</th>`; });
            html += '</tr></thead>';
            html += '<tbody>';
            rows.forEach(row => {
                html += '<tr class="border-b border-slate-200 last:border-b-0">';
                row.forEach(cell => { html += `<td class="p-2 whitespace-nowrap">${cell}</td>`; });
                html += '</tr>';
            });
            html += '</tbody></table>';

            // Close the wrapper div
            tableWrapper += html + '</div>';

            return tableWrapper;
        });
    };

    const renderMessageContent = (text) => {
        let processedText = parseMarkdownTable(text);
        // Replace newlines that are NOT part of the table logic now.
        if (!processedText.includes('<table')) {
            processedText = processedText.replace(/\n/g, '<br>');
        }
        return <div className="prose prose-sm max-w-none prose-p:my-0" dangerouslySetInnerHTML={{ __html: processedText }} />;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;
        const userMessage = { sender: 'user', text: inputValue };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem("token");
            const response = await axios.post('http://localhost:5000/api/v1/reports/chatbot', 
                { query: inputValue },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const botMessage = { sender: 'bot', text: response.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed bottom-5 right-5 w-full max-w-sm h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 animate-fade-in-up z-40">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-800">Teaching Assistant</h3>
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
                    <div key={index} className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'bot' && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-slate-500" />
                            </div>
                        )}
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.sender === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-slate-100 text-slate-800 rounded-bl-none'}`
                        }>
                            {renderMessageContent(msg.text)}
                        </div>
                         {msg.sender === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-slate-600" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-end gap-2.5 justify-start">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-slate-500" />
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
                        placeholder="Ask about your students..."
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

export default TeacherChatbot;