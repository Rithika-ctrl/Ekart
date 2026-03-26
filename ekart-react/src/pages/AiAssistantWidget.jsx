import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CSS = `/* ── FAB ── */
.ai-fab {
    position: fixed; bottom: 2rem; right: 2rem; z-index: 9000;
    width: 60px; height: 60px; border-radius: 50%;
    background: linear-gradient(135deg, #f5a800, #d48f00);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 28px rgba(245,168,0,0.55);
    transition: transform 0.3s, box-shadow 0.3s;
    color: #1a1000;
}
.ai-fab:hover { transform: scale(1.1); box-shadow: 0 10px 36px rgba(245,168,0,0.7); }
.ai-fab-icon, .ai-fab-close { font-size: 1.4rem; }
.ai-fab-pulse {
    position: absolute; inset: -3px; border-radius: 50%;
    border: 2px solid rgba(245,168,0,0.4);
    animation: fabPulse 2.5s ease-out infinite;
}
@keyframes fabPulse {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
}

/* ── CHAT WINDOW ── */
.ai-chat-window {
    position: fixed; bottom: 7rem; right: 2rem; z-index: 8999;
    width: 380px; max-height: 600px;
    background: rgba(8, 10, 24, 0.96);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(245,168,0,0.35);
    border-radius: 20px;
    display: flex; flex-direction: column;
    box-shadow: 0 24px 80px rgba(0,0,0,0.7);
    transform: scale(0.85) translateY(20px);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    overflow: hidden;
}
.ai-chat-window.open {
    transform: scale(1) translateY(0);
    opacity: 1;
    pointer-events: all;
}

/* ── HEADER ── */
.ai-chat-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.1rem;
    background: linear-gradient(135deg, rgba(245,168,0,0.18), rgba(245,100,0,0.10));
    border-bottom: 1px solid rgba(245,168,0,0.2);
    flex-shrink: 0;
}
.ai-header-left { display: flex; align-items: center; gap: 0.75rem; }
.ai-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(245,168,0,0.2);
    border: 2px solid rgba(245,168,0,0.5);
    display: flex; align-items: center; justify-content: center;
    color: #f5a800; font-size: 1rem;
}
.ai-header-name { font-size: 0.88rem; font-weight: 700; color: white; }
.ai-header-status { font-size: 0.68rem; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 0.3rem; }
.ai-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; animation: blink 2s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ai-header-actions { display: flex; gap: 0.25rem; }
.ai-icon-btn {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(255,255,255,0.07); border: none; cursor: pointer;
    color: rgba(255,255,255,0.5); font-size: 0.7rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
}
.ai-icon-btn:hover { background: rgba(255,255,255,0.15); color: white; }

/* ── QUICK PROMPTS ── */
.ai-quick-prompts {
    padding: 0.75rem 1rem 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
}
.ai-quick-label { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 0.5rem; }
.ai-quick-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.ai-chip {
    font-size: 0.7rem; font-weight: 500;
    padding: 0.3rem 0.65rem; border-radius: 50px;
    background: rgba(245,168,0,0.1);
    border: 1px solid rgba(245,168,0,0.25);
    color: rgba(255,255,255,0.7); cursor: pointer;
    transition: all 0.2s; font-family: inherit;
}
.ai-chip:hover { background: rgba(245,168,0,0.22); color: white; border-color: rgba(245,168,0,0.5); }

/* ── MESSAGES ── */
.ai-messages {
    flex: 1; overflow-y: auto; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    scroll-behavior: smooth;
}
.ai-messages::-webkit-scrollbar { width: 4px; }
.ai-messages::-webkit-scrollbar-track { background: transparent; }
.ai-messages::-webkit-scrollbar-thumb { background: rgba(245,168,0,0.3); border-radius: 2px; }

.ai-msg { display: flex; align-items: flex-end; gap: 0.5rem; animation: msgIn 0.3s ease both; }
@keyframes msgIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.ai-msg-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: rgba(245,168,0,0.15);
    border: 1px solid rgba(245,168,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; color: #f5a800;
}
.ai-msg-bubble {
    max-width: 82%; padding: 0.65rem 0.9rem;
    border-radius: 16px; font-size: 0.82rem; line-height: 1.55;
}
.ai-msg-bot .ai-msg-bubble {
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.88);
    border-bottom-left-radius: 4px;
}
.ai-msg-user { flex-direction: row-reverse; }
.ai-msg-user .ai-msg-bubble {
    background: linear-gradient(135deg, #f5a800, #d48f00);
    color: #1a1000; font-weight: 500;
    border-bottom-right-radius: 4px;
}
.ai-msg-user .ai-msg-avatar {
    background: rgba(26,16,0,0.4);
    border-color: rgba(245,168,0,0.4);
    color: #f5a800;
}
.ai-msg-user .ai-msg-avatar i { font-size: 0.65rem; }

/* ── TYPING ── */
.ai-typing {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0 1rem 0.5rem;
}
.ai-typing-dots {
    display: flex; gap: 4px; padding: 0.6rem 0.8rem;
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; border-bottom-left-radius: 4px;
}
.ai-typing-dots span {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(245,168,0,0.7);
    animation: typingBounce 1.2s ease infinite;
}
.ai-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.ai-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
    0%,60%,100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
}

/* ── INPUT ── */
.ai-input-area {
    display: flex; align-items: flex-end; gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
}
.ai-input {
    flex: 1; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px; padding: 0.65rem 0.85rem;
    font-family: inherit; font-size: 0.82rem; color: white;
    outline: none; resize: none; max-height: 100px; line-height: 1.4;
    transition: border-color 0.2s;
}
.ai-input::placeholder { color: rgba(255,255,255,0.28); }
.ai-input:focus { border-color: rgba(245,168,0,0.5); }
.ai-send-btn {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #f5a800, #d48f00);
    border: none; cursor: pointer; color: #1a1000;
    font-size: 0.85rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
}
.ai-send-btn:hover { transform: scale(1.1); }
.ai-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* ── RESPONSIVE ── */
@media(max-width: 480px) {
    .ai-chat-window { width: calc(100vw - 2rem); right: 1rem; bottom: 6rem; }
    .ai-fab { bottom: 1.5rem; right: 1.5rem; }
}`;

const SYSTEM_PROMPT = `You are the Ekart AI Assistant — a helpful, friendly support agent for the Ekart e-commerce platform.

ABOUT EKART:
- Ekart is an online shopping platform with Customers, Vendors, and Admins
- Customers can browse products, add to cart, place orders, track orders, write reviews, manage wishlist, request replacements
- Vendors can register, add/edit products (with images & video), view sales reports (daily/weekly/monthly), manage stock alerts, view their storefront
- Admins manage product approvals, refunds, banners, user search, analytics

KEY FEATURES YOU KNOW ABOUT:
- Order Tracking: Real-time tracking with stages — Processing → Shipped → Out for Delivery → Delivered
- Delivery Charge: FREE for orders above ₹500, ₹40 for orders below ₹500
- Estimated Delivery: 48 hours from order placement
- Cancel Order: Available on the "View Orders" page — cancels and restores stock
- Return/Replacement: Available within 7 days of order. Go to "View Orders" → "Request Replacement"
- Retry Payment: Available for COD orders within 24 hours from "View Orders"
- Forget Password: Available on login page for Customer and Vendor
- Password Rules: Must be 8+ characters with uppercase, lowercase, number, and special character
- OTP Verification: Email OTP is sent on registration; must verify before login
- Wishlist: Click the heart icon on any product to save it. View at "My Wishlist"
- Voice Search: Click the microphone icon on the search page to search by voice
- Stock Alerts: Vendors get email alerts when product stock falls below their set threshold
- Sales Reports: Vendors can view Daily, Weekly, Monthly sales with charts at "Sales Report"
- Vendor ID: Every vendor gets a unique ID like VND-00001 on their Store Front page
- Guest Browse: Users can browse products without logging in via "Browse as Guest"
- Express Checkout: Enabled automatically when checking out from cart
- Budget Mode: Slider on product page to filter by price budget
- Multiple Addresses: Add multiple delivery addresses under account settings
- Social Login: Google, Facebook, Instagram login available for customers; GitHub for admin

RESPONSE STYLE:
- Be warm, concise, and helpful
- Use simple language — not technical jargon
- Use emojis sparingly to be friendly (1-2 per message max)
- If you don't know something specific about Ekart, say so honestly and suggest contacting support
- Keep responses under 150 words unless a step-by-step guide is needed
- Format step-by-step guides with numbered steps`;

const DEFAULT_MESSAGE = {
    id: 'default-1',
    role: 'bot',
    content: "👋 Hi! I'm your <strong>Ekart Assistant</strong>.<br><br>I can help you with orders, products, payments, delivery, returns, and more. What can I help you with?",
    isHtml: true
};

/**
 * AiAssistantWidget Component
 * @param {Object} props
 * @param {string} props.geminiApiKey - The Gemini API key injected from the environment
 */
export default function AiAssistantWidget({ geminiApiKey = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState([DEFAULT_MESSAGE]);
    const [inputValue, setInputValue] = useState('');
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);

    const messagesRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages, isTyping, isOpen]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px';
        }
    }, [inputValue]);

    const formatText = (text) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin:0.2rem 0;"><strong>$1.</strong> $2</div>')
            .replace(/\n/g, '<br>');
    };

    const toggleChat = () => {
        setIsOpen((prev) => !prev);
        if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 350);
        }
    };

    const clearChat = () => {
        setMessages([{
            id: Date.now().toString(),
            role: 'bot',
            content: "👋 Chat cleared! How can I help you?",
            isHtml: true
        }]);
        setShowQuickPrompts(true);
    };

    const sendQuick = (text) => {
        setInputValue('');
        sendMessage(text);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const sendMessage = async (textToProcess) => {
        const text = (textToProcess || inputValue).trim();
        if (!text || isTyping) return;

        setShowQuickPrompts(false);
        setInputValue('');
        
        const newUserMsg = { id: Date.now().toString(), role: 'user', content: text };
        setMessages((prev) => [...prev, newUserMsg]);
        setIsTyping(true);

        try {
            const geminiContents = [
                {
                    role: 'user',
                    parts: [{ text: 'System instructions:\n' + SYSTEM_PROMPT + '\n\nAcknowledge these instructions briefly.' }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'Understood. I am the Ekart Assistant, ready to help customers and vendors.' }]
                }
            ];

            // Add previous conversational history, ignoring default pre-formatted UI messages
            messages.forEach((msg) => {
                if (msg.id !== 'default-1' && !msg.isHtml) {
                    geminiContents.push({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    });
                }
            });

            // Add the current message
            geminiContents.push({
                role: 'user',
                parts: [{ text: text }]
            });

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: geminiContents })
                }
            );

            const data = await response.json();

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const reply = data.candidates[0].content.parts[0].text;
                setMessages((prev) => [
                    ...prev,
                    { id: Date.now().toString() + '-bot', role: 'bot', content: reply }
                ]);
            } else {
                throw new Error('Invalid response from Gemini');
            }

        } catch (err) {
            console.error('AI error:', err);
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString() + '-err',
                    role: 'bot',
                    content: "Sorry, I'm having trouble connecting right now. Please try again in a moment, or contact our support team. 🙏",
                    isHtml: false
                }
            ]);
        } finally {
            setIsTyping(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    return (
        <>
            <style>{CSS}</style>

            {/* ── FAB BUTTON ── */}
            <button className="ai-fab" id="aiFab" onClick={toggleChat} title="Ekart AI Assistant">
                <i className="fas fa-robot ai-fab-icon" style={{ display: isOpen ? 'none' : '' }}></i>
                <i className="fas fa-times ai-fab-close" style={{ display: isOpen ? '' : 'none' }}></i>
                <span className="ai-fab-pulse"></span>
            </button>

            {/* ── CHAT WINDOW ── */}
            <div className={`ai-chat-window ${isOpen ? 'open' : ''}`} id="aiChatWindow">

                {/* Header */}
                <div className="ai-chat-header">
                    <div className="ai-header-left">
                        <div className="ai-avatar"><i className="fas fa-robot"></i></div>
                        <div>
                            <div className="ai-header-name">Ekart Assistant</div>
                            <div className="ai-header-status"><span className="ai-dot"></span> Online</div>
                        </div>
                    </div>
                    <div className="ai-header-actions">
                        <button className="ai-icon-btn" onClick={clearChat} title="Clear chat">
                            <i className="fas fa-trash-alt"></i>
                        </button>
                        <button className="ai-icon-btn" onClick={toggleChat} title="Close">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* Quick prompts */}
                {showQuickPrompts && (
                    <div className="ai-quick-prompts" id="quickPrompts">
                        <div className="ai-quick-label">Quick questions</div>
                        <div className="ai-quick-chips">
                            <button className="ai-chip" onClick={() => sendQuick('How do I track my order?')}>📦 Track order</button>
                            <button className="ai-chip" onClick={() => sendQuick('How do I cancel an order?')}>❌ Cancel order</button>
                            <button className="ai-chip" onClick={() => sendQuick('How do I add a product?')}>➕ Add product</button>
                            <button className="ai-chip" onClick={() => sendQuick('How does delivery charge work?')}>🚚 Delivery charge</button>
                            <button className="ai-chip" onClick={() => sendQuick('How do I reset my password?')}>🔑 Reset password</button>
                            <button className="ai-chip" onClick={() => sendQuick('How do I request a replacement?')}>🔄 Replacement</button>
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="ai-messages" id="aiMessages" ref={messagesRef}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`ai-msg ${msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}`}>
                            <div className="ai-msg-avatar">
                                <i className={`fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                            </div>
                            <div 
                                className="ai-msg-bubble" 
                                dangerouslySetInnerHTML={{ __html: msg.isHtml ? msg.content : formatText(msg.content) }} 
                            />
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="ai-typing" id="aiTyping">
                            <div className="ai-msg-avatar"><i className="fas fa-robot"></i></div>
                            <div className="ai-typing-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="ai-input-area">
                    <textarea 
                        className="ai-input" 
                        id="aiInput"
                        ref={inputRef}
                        placeholder="Ask me anything about Ekart..."
                        rows="1"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKey}
                    ></textarea>
                    <button 
                        className="ai-send-btn" 
                        id="aiSendBtn" 
                        onClick={() => sendMessage()} 
                        disabled={isTyping}
                    >
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>

            </div>
        </>
    );
}