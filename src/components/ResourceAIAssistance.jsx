import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Bot, Send, Paperclip, Mic, Minimize2, Maximize2, X, MessageSquare, Loader2 } from "lucide-react";
import { sendMessageToClaude, buildResourcePrompt, isClaudeConfigured } from "../services/claudeService";

export const ResourceAIAssistance = ({
    isOpen,
    onOpenChange,
    resourceData,
    isMinimized,
    onMinimize,
    onMaximize,
    onClose,
    index = 0
}) => {
    const [aiMessages, setAiMessages] = useState([]);
    const [aiInput, setAiInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [position, setPosition] = useState({ x: 24, y: 24 }); // Position from bottom-right
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const initialDataSent = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [aiMessages]);

    // Send message to Claude API
    const sendToClaude = async (userContent, existingMessages = []) => {
        setIsLoading(true);

        // Build conversation history for context
        const conversationHistory = existingMessages
            .filter(msg => msg.role === "user" || msg.role === "assistant")
            .map(msg => ({ role: msg.role, content: msg.content }));

        // Add current user message
        conversationHistory.push({ role: "user", content: userContent });

        try {
            const response = await sendMessageToClaude(conversationHistory);

            if (response.success) {
                const aiResponse = {
                    id: Date.now(),
                    role: "assistant",
                    content: response.content,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setAiMessages(prev => [...prev, aiResponse]);
            } else {
                const errorResponse = {
                    id: Date.now(),
                    role: "assistant",
                    content: `Sorry, I encountered an error: ${response.error}. Please try again.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isError: true,
                };
                setAiMessages(prev => [...prev, errorResponse]);
            }
        } catch (error) {
            const errorResponse = {
                id: Date.now(),
                role: "assistant",
                content: `Sorry, I encountered an unexpected error. Please try again.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true,
            };
            setAiMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize chat when opened with resource data - auto-send to Claude for analysis
    useEffect(() => {
        if (isOpen && resourceData && initialDataSent.current !== resourceData.id) {
            const resourcePrompt = buildResourcePrompt(resourceData);
            
            // Show user message (the resource issues being sent)
            const userMessage = {
                id: Date.now(),
                role: "user",
                content: resourcePrompt,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            
            setAiMessages([userMessage]);
            initialDataSent.current = resourceData.id;

            // Auto-send to Claude for analysis
            if (isClaudeConfigured()) {
                sendToClaude(resourcePrompt, []);
            } else {
                setAiMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: "assistant",
                    content: "⚠️ Claude API is not configured. Please set VITE_ANTHROPIC_API_KEY in your environment variables.",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isError: true,
                }]);
            }
        } else if (isOpen && !resourceData && aiMessages.length === 0) {
            // General help mode - show welcome message
            setAiMessages([
                {
                    id: Date.now(),
                    role: "assistant",
                    content: "Hi! I'm your AI API migration assistant powered by Claude. How can I help you with your migration today?\n\nI can help with:\n• Analyzing migration issues and warnings\n• Suggesting solutions for compatibility problems\n• Explaining differences between Apigee Edge and Apigee X/Kong\n• Best practices for API migration",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ]);
        }
    }, [isOpen, resourceData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!aiInput.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            role: "user",
            content: aiInput,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const updatedMessages = [...aiMessages, userMessage];
        setAiMessages(updatedMessages);
        setAiInput("");

        // Send to Claude
        await sendToClaude(aiInput, aiMessages);
    };

    // Drag handlers for portrait mode
    const handleMouseDown = (e) => {
        // Prevent dragging when clicking on interactive elements
        if (e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' ||
            e.target.closest('button')) {
            return;
        }
        
        setIsDragging(true);
        setDragStart({
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = dragStart.x - e.clientX;
        const deltaY = dragStart.y - e.clientY;
        
        setPosition(prev => ({
            x: Math.max(0, prev.x + deltaX),
            y: Math.max(0, prev.y + deltaY)
        }));
        
        setDragStart({
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add global mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragStart]);

    if (!isOpen) return null;

    // Memoize chat content to prevent recreation on every render
    const chatContent = useMemo(() => (
        <>
            {/* Chat Messages Area */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                {aiMessages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 items-start ${message.role === "user" ? "justify-end" : "max-w-[90%]"}`}
                    >
                        {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-xl bg-[#F97316]/20 flex items-center justify-center flex-shrink-0 text-[#F97316] ring-1 ring-[#F97316]/30">
                                <Bot className="w-4 h-4" />
                            </div>
                        )}
                        <div className={`flex flex-col gap-1 ${message.role === "user" ? "items-end max-w-[85%]" : ""}`}>
                            <div
                                className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${message.role === "user"
                                    ? "bg-[#F97316] text-white rounded-tr-none shadow-lg shadow-orange-500/20"
                                    : "bg-white/5 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-sm"
                                    }`}
                            >
                                {message.content.split('\n').map((line, i) => (
                                    <p key={i} className={line.startsWith('**') ? 'font-bold' : ''}>
                                        {line.replace(/\*\*/g, '')}
                                    </p>
                                ))}
                            </div>
                            <span className="text-[9px] text-slate-500 px-1 font-medium uppercase tracking-wider">{message.timestamp}</span>
                        </div>
                    </div>
                ))}
                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex gap-3 items-start max-w-[90%]">
                        <div className="w-8 h-8 rounded-xl bg-[#F97316]/20 flex items-center justify-center flex-shrink-0 text-[#F97316] ring-1 ring-[#F97316]/30">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="p-3 rounded-2xl text-xs leading-relaxed bg-white/5 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-sm flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F97316]" />
                                <span className="text-slate-400">Analyzing...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-[#0B0F1A] backdrop-blur-md">
                <form onSubmit={handleSubmit} className="relative group">
                    <textarea
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleSubmit(e);
                            }
                        }}
                        className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 pr-12 text-xs text-white focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316] outline-none transition-all placeholder-slate-500 resize-none shadow-inner"
                        placeholder="Ask a question..."
                        rows="2"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-[10px] w-8 h-8 bg-[#F97316] hover:bg-orange-600 text-white rounded-lg flex items-center justify-center transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!aiInput.trim() || isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </>
    ), [aiMessages, isLoading, aiInput, handleSubmit]);

    // State 1: Minimized View (Small corner widget)
    if (isMinimized) {
        const horizontalOffset = 24 + (index * 300);
        return (
            <div
                className="fixed bottom-6 z-[110] w-72 bg-[#1A1F2C] border border-[#F97316]/30 rounded-xl shadow-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-[#242938] transition-all animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-[#F97316]/20"
                style={{ right: `${horizontalOffset}px` }}
                onClick={onMaximize}
            >
                <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col truncate text-left">
                        <span className="text-xs font-bold text-white">AI Assistant</span>
                        <span className="text-[10px] text-slate-400 truncate">
                            {resourceData ? `Helping with ${resourceData.name}` : "Ready to help"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); onMaximize(); }}
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    // State 2: Maximized View (Centered full modal)
    if (isMaximized) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange} className="z-[200]">
                <DialogContent className="max-w-[850px] w-full h-[85vh] bg-[#0B0F1A] border-white/10 p-0 overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(249,115,22,0.25)] ring-1 ring-white/5 [&>button]:hidden">
                    <DialogHeader className="p-6 pb-2 flex flex-row items-center justify-between border-b border-white/5">
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-[#F97316]/10 rounded-xl ring-1 ring-[#F97316]/20">
                                    <Bot className="w-6 h-6 text-[#F97316]" />
                                </div>
                                {resourceData ? `Troubleshooting: ${resourceData.name}` : "Happy To Help - AI @ your service"}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 pl-11">
                                {resourceData ? `Analyzing issues for ${resourceData.type} - ${resourceData.name}` : ""}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 pr-2">
                            <button
                                onClick={() => setIsMaximized(false)}
                                className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors border border-white/5"
                                title="Restore to corner"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-400 transition-colors border border-white/5"
                                title="Close AI assistant"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </DialogHeader>

                    <div className="flex-grow flex flex-col min-h-0 bg-[#0B0F1A]">
                        {/* Chat Messages Area */}
                        <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                            {aiMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-4 items-start ${message.role === "user" ? "justify-end" : "max-w-[90%]"}`}
                                >
                                    {message.role === "assistant" && (
                                        <div className="w-9 h-9 rounded-xl bg-[#F97316]/20 flex items-center justify-center flex-shrink-0 text-[#F97316] ring-1 ring-[#F97316]/30">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className={`flex flex-col gap-1.5 ${message.role === "user" ? "items-end max-w-[85%]" : ""}`}>
                                        <div
                                            className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${message.role === "user"
                                                ? "bg-[#F97316] text-white rounded-tr-none shadow-lg shadow-orange-500/20"
                                                : "bg-white/5 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-sm"
                                                }`}
                                        >
                                            {message.content.split('\n').map((line, i) => (
                                                <p key={i} className={line.startsWith('**') ? 'font-bold' : ''}>
                                                    {line.replace(/\*\*/g, '')}
                                                </p>
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-slate-500 px-1 font-medium uppercase tracking-wider">{message.timestamp}</span>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4 items-start max-w-[90%]">
                                    <div className="w-9 h-9 rounded-xl bg-[#F97316]/20 flex items-center justify-center flex-shrink-0 text-[#F97316] ring-1 ring-[#F97316]/30">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="p-4 rounded-2xl text-sm leading-relaxed bg-white/5 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-sm flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#F97316]" />
                                            <span className="text-slate-400">Analyzing your request...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-white/10 bg-[#0B0F1A] backdrop-blur-md">
                            <form onSubmit={handleSubmit} className="relative group">
                                <textarea
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            handleSubmit(e);
                                        }
                                    }}
                                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4 pr-16 text-sm text-white focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316] outline-none transition-all placeholder-slate-500 resize-none shadow-inner"
                                    placeholder="Ask a follow-up or describe a fix..."
                                    rows="2"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-3 top-[18px] w-10 h-10 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-orange-500/30 group-hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!aiInput.trim() || isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>

                            <div className="flex justify-between items-center mt-4 px-1">
                                <div className="flex items-center gap-5">
                                    <button className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#F97316] transition-colors font-medium">
                                        <Paperclip className="w-3.5 h-3.5" />
                                        Upload Log
                                    </button>
                                    <button className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#F97316] transition-colors font-medium">
                                        <Mic className="w-3.5 h-3.5" />
                                        Voice
                                    </button>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono tracking-tighter">Press Cmd + Enter to send</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // State 3: Default View (Bottom-right portrait)
    return (
        <div 
            className="fixed z-[110] w-[380px] h-[500px] bg-[#0B0F1A] border border-[#F97316]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-[#F97316]/20"
            style={{ 
                right: `${position.x}px`, 
                bottom: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
        >
            {/* Header - Draggable */}
            <div 
                className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#F97316]/10 to-transparent cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-3 pointer-events-none">
                    <div className="w-9 h-9 rounded-xl bg-[#F97316] flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">AI Assistant</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {resourceData ? `${resourceData.name}` : "Migration Help"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 pointer-events-auto">
                    <button
                        onClick={() => setIsMaximized(true)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Maximize"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Chat Content */}
            {chatContent}
        </div>
    );
};
