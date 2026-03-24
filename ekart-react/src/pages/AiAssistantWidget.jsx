import { useState, useRef, useEffect, useCallback } from "react";

// ──────────────────────────────────────────────────────────────────────────────
// Pass your Gemini API key as a prop: <AiAssistantWidget geminiApiKey="..." />
// ──────────────────────────────────────────────────────────────────────────────

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

const QUICK_PROMPTS = [
  { label: "📦 Track order",      text: "How do I track my order?" },
  { label: "❌ Cancel order",     text: "How do I cancel an order?" },
  { label: "➕ Add product",      text: "How do I add a product?" },
  { label: "🚚 Delivery charge",  text: "How does delivery charge work?" },
  { label: "🔑 Reset password",   text: "How do I reset my password?" },
  { label: "🔄 Replacement",      text: "How do I request a replacement?" },
];

const INITIAL_MESSAGE = {
  role: "bot",
  html: `👋 Hi! I'm your <strong>Ekart Assistant</strong>.<br/><br/>I can help you with orders, products, payments, delivery, returns, and more. What can I help you with?`,
};

/** Convert markdown-lite text to safe HTML string */
function formatText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin:0.2rem 0"><strong>$1.</strong> $2</div>')
    .replace(/\n/g, "<br/>");
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  @keyframes fabPulse {
    0%   { transform: scale(1);   opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1;   }
    50%       { opacity: 0.4; }
  }
  @keyframes msgIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0);   }
    30%            { transform: translateY(-6px); }
  }

  .ekart-fab {
    position: fixed; bottom: 2rem; right: 2rem; z-index: 9000;
    width: 60px; height: 60px; border-radius: 50%;
    background: linear-gradient(135deg, #f5a800, #d48f00);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 28px rgba(245,168,0,0.55);
    transition: transform 0.3s, box-shadow 0.3s;
    color: #1a1000;
  }
  .ekart-fab:hover { transform: scale(1.1); box-shadow: 0 10px 36px rgba(245,168,0,0.7); }

  .ekart-fab-pulse {
    position: absolute; inset: -3px; border-radius: 50%;
    border: 2px solid rgba(245,168,0,0.4);
    animation: fabPulse 2.5s ease-out infinite;
    pointer-events: none;
  }

  .ekart-chat-window {
    position: fixed; bottom: 7rem; right: 2rem; z-index: 8999;
    width: 380px; max-height: 600px;
    background: rgba(8,10,24,0.96);
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
  .ekart-chat-window.open {
    transform: scale(1) translateY(0);
    opacity: 1;
    pointer-events: all;
  }

  .ekart-chat-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.1rem;
    background: linear-gradient(135deg, rgba(245,168,0,0.18), rgba(245,100,0,0.10));
    border-bottom: 1px solid rgba(245,168,0,0.2);
    flex-shrink: 0;
  }
  .ekart-header-left { display: flex; align-items: center; gap: 0.75rem; }
  .ekart-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(245,168,0,0.2);
    border: 2px solid rgba(245,168,0,0.5);
    display: flex; align-items: center; justify-content: center;
    color: #f5a800; font-size: 1rem; flex-shrink: 0;
  }
  .ekart-header-name  { font-size: 0.88rem; font-weight: 700; color: white; }
  .ekart-header-status {
    font-size: 0.68rem; color: rgba(255,255,255,0.5);
    display: flex; align-items: center; gap: 0.3rem;
  }
  .ekart-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e; display: inline-block; animation: blink 2s infinite;
  }
  .ekart-header-actions { display: flex; gap: 0.25rem; }
  .ekart-icon-btn {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(255,255,255,0.07); border: none; cursor: pointer;
    color: rgba(255,255,255,0.5); font-size: 0.7rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .ekart-icon-btn:hover { background: rgba(255,255,255,0.15); color: white; }

  .ekart-quick-prompts {
    padding: 0.75rem 1rem 0.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .ekart-quick-label {
    font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 0.5rem;
  }
  .ekart-quick-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .ekart-chip {
    font-size: 0.7rem; font-weight: 500;
    padding: 0.3rem 0.65rem; border-radius: 50px;
    background: rgba(245,168,0,0.1);
    border: 1px solid rgba(245,168,0,0.25);
    color: rgba(255,255,255,0.7); cursor: pointer;
    transition: all 0.2s; font-family: inherit;
  }
  .ekart-chip:hover { background: rgba(245,168,0,0.22); color: white; border-color: rgba(245,168,0,0.5); }

  .ekart-messages {
    flex: 1; overflow-y: auto; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    scroll-behavior: smooth;
  }
  .ekart-messages::-webkit-scrollbar { width: 4px; }
  .ekart-messages::-webkit-scrollbar-track { background: transparent; }
  .ekart-messages::-webkit-scrollbar-thumb { background: rgba(245,168,0,0.3); border-radius: 2px; }

  .ekart-msg { display: flex; align-items: flex-end; gap: 0.5rem; animation: msgIn 0.3s ease both; }
  .ekart-msg-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: rgba(245,168,0,0.15);
    border: 1px solid rgba(245,168,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; color: #f5a800;
  }
  .ekart-msg-bubble {
    max-width: 82%; padding: 0.65rem 0.9rem;
    border-radius: 16px; font-size: 0.82rem; line-height: 1.55;
  }
  .ekart-msg-bot .ekart-msg-bubble {
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.88);
    border-bottom-left-radius: 4px;
  }
  .ekart-msg-user { flex-direction: row-reverse; }
  .ekart-msg-user .ekart-msg-bubble {
    background: linear-gradient(135deg, #f5a800, #d48f00);
    color: #1a1000; font-weight: 500;
    border-bottom-right-radius: 4px;
  }
  .ekart-msg-user .ekart-msg-avatar {
    background: rgba(26,16,0,0.4);
    border-color: rgba(245,168,0,0.4);
    color: #f5a800;
  }

  .ekart-typing {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0 1rem 0.5rem;
  }
  .ekart-typing-dots {
    display: flex; gap: 4px; padding: 0.6rem 0.8rem;
    background: rgba(255,255,255,0.09);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; border-bottom-left-radius: 4px;
  }
  .ekart-typing-dots span {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(245,168,0,0.7);
    animation: typingBounce 1.2s ease infinite;
  }
  .ekart-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .ekart-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

  .ekart-input-area {
    display: flex; align-items: flex-end; gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .ekart-input {
    flex: 1; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 12px; padding: 0.65rem 0.85rem;
    font-family: inherit; font-size: 0.82rem; color: white;
    outline: none; resize: none; max-height: 100px; line-height: 1.4;
    transition: border-color 0.2s;
  }
  .ekart-input::placeholder { color: rgba(255,255,255,0.28); }
  .ekart-input:focus { border-color: rgba(245,168,0,0.5); }
  .ekart-send-btn {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #f5a800, #d48f00);
    border: none; cursor: pointer; color: #1a1000; font-size: 0.85rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .ekart-send-btn:hover:not(:disabled) { transform: scale(1.1); }
  .ekart-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (max-width: 480px) {
    .ekart-chat-window { width: calc(100vw - 2rem); right: 1rem; bottom: 6rem; }
    .ekart-fab         { bottom: 1.5rem; right: 1.5rem; }
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function AiAssistantWidget({ geminiApiKey = "" }) {
  const [isOpen,        setIsOpen]        = useState(false);
  const [isTyping,      setIsTyping]      = useState(false);
  const [showQuick,     setShowQuick]     = useState(true);
  const [messages,      setMessages]      = useState([INITIAL_MESSAGE]);
  const [inputText,     setInputText]     = useState("");
  const [inputHeight,   setInputHeight]   = useState("auto");

  const historyRef  = useRef([]);   // { role: "user"|"assistant", content: string }
  const messagesRef = useRef(null);
  const inputRef    = useRef(null);
  const textareaRef = useRef(null);

  // Inject styles once
  useEffect(() => {
    const id = "ekart-widget-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = styles;
      document.head.appendChild(el);
    }
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesRef.current) {
      setTimeout(() => {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 50);
    }
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const toggleChat = () => setIsOpen((v) => !v);

  const clearChat = () => {
    historyRef.current = [];
    setMessages([{ ...INITIAL_MESSAGE, html: "👋 Chat cleared! How can I help you?" }]);
    setShowQuick(true);
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 100) + "px";
    }
  };

  const sendMessage = useCallback(
    async (overrideText) => {
      if (isTyping) return;
      const text = (overrideText ?? inputText).trim();
      if (!text) return;

      setShowQuick(false);
      setMessages((prev) => [...prev, { role: "user", html: formatText(text) }]);
      setInputText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      historyRef.current.push({ role: "user", content: text });

      setIsTyping(true);

      try {
        const geminiContents = [
          {
            role: "user",
            parts: [{ text: "System instructions:\n" + SYSTEM_PROMPT + "\n\nAcknowledge these instructions briefly." }],
          },
          {
            role: "model",
            parts: [{ text: "Understood. I am the Ekart Assistant, ready to help customers and vendors." }],
          },
          ...historyRef.current.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        ];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: geminiContents }),
          }
        );

        const data = await res.json();

        if (data.candidates?.[0]?.content) {
          const reply = data.candidates[0].content.parts[0].text;
          historyRef.current.push({ role: "assistant", content: reply });
          setMessages((prev) => [...prev, { role: "bot", html: formatText(reply) }]);
        } else {
          throw new Error("Invalid Gemini response");
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            html: "Sorry, I'm having trouble connecting right now. Please try again in a moment, or contact our support team. 🙏",
          },
        ]);
        console.error("AI error:", err);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    },
    [isTyping, inputText, geminiApiKey]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendQuick = (text) => {
    setInputText(text);
    setShowQuick(false);
    // Use the text directly since state update is async
    sendMessage(text);
  };

  return (
    <>
      {/* FAB */}
      <button className="ekart-fab" onClick={toggleChat} title="Ekart AI Assistant">
        <i
          className="fas fa-robot"
          style={{ fontSize: "1.4rem", display: isOpen ? "none" : "block" }}
        />
        <i
          className="fas fa-times"
          style={{ fontSize: "1.4rem", display: isOpen ? "block" : "none" }}
        />
        <span className="ekart-fab-pulse" />
      </button>

      {/* Chat Window */}
      <div className={`ekart-chat-window${isOpen ? " open" : ""}`}>

        {/* Header */}
        <div className="ekart-chat-header">
          <div className="ekart-header-left">
            <div className="ekart-avatar">
              <i className="fas fa-robot" />
            </div>
            <div>
              <div className="ekart-header-name">Ekart Assistant</div>
              <div className="ekart-header-status">
                <span className="ekart-dot" /> Online
              </div>
            </div>
          </div>
          <div className="ekart-header-actions">
            <button className="ekart-icon-btn" onClick={clearChat} title="Clear chat">
              <i className="fas fa-trash-alt" />
            </button>
            <button className="ekart-icon-btn" onClick={toggleChat} title="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        {showQuick && (
          <div className="ekart-quick-prompts">
            <div className="ekart-quick-label">Quick questions</div>
            <div className="ekart-quick-chips">
              {QUICK_PROMPTS.map((q) => (
                <button key={q.text} className="ekart-chip" onClick={() => sendQuick(q.text)}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="ekart-messages" ref={messagesRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`ekart-msg ekart-msg-${msg.role}`}>
              <div className="ekart-msg-avatar">
                <i className={`fas ${msg.role === "user" ? "fa-user" : "fa-robot"}`} />
              </div>
              <div
                className="ekart-msg-bubble"
                dangerouslySetInnerHTML={{ __html: msg.html }}
              />
            </div>
          ))}
        </div>

        {/* Typing Indicator */}
        {isTyping && (
          <div className="ekart-typing">
            <div className="ekart-msg-avatar">
              <i className="fas fa-robot" />
            </div>
            <div className="ekart-typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Input */}
        <div className="ekart-input-area">
          <textarea
            ref={(el) => {
              textareaRef.current = el;
              inputRef.current = el;
            }}
            className="ekart-input"
            placeholder="Ask me anything about Ekart..."
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            className="ekart-send-btn"
            onClick={() => sendMessage()}
            disabled={isTyping}
          >
            <i className="fas fa-paper-plane" />
          </button>
        </div>

      </div>
    </>
  );
}