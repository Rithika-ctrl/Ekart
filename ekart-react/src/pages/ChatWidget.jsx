import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ChatWidget = ({ role = 'guest', userName = '' }) => {
  // --- Role Configuration ---
  const getRoleConfig = (r, name) => {
    const config = {
      customer: {
        headerName: 'Ekart Assistant',
        statusText: 'Here to help with your orders',
        pillClass: 'ek-role-customer',
        pillLabel: '🛍️ Customer',
        welcome: `👋 Hi <strong>${name || 'there'}</strong>! I can see your real orders, cart, and account details. Ask me anything specific!<br><br>Try: <em>"Show my orders"</em> or <em>"What's in my cart?"</em>`,
        chips: [
          { label: '📦 My orders', msg: 'Show me all my orders with their status' },
          { label: '🛒 My cart', msg: 'What items are in my cart?' },
          { label: '🚚 Track latest order', msg: 'What is the status of my most recent order?' },
          { label: '💰 My refunds', msg: 'Do I have any pending refunds?' },
          { label: '🔄 Return policy', msg: 'How do I return or replace an item?' },
          { label: '💳 Payment options', msg: 'What payment methods are available?' },
        ]
      },
      vendor: {
        headerName: 'Vendor Hub',
        statusText: 'Your store assistant',
        pillClass: 'ek-role-vendor',
        pillLabel: '🏪 Vendor',
        welcome: `👋 Hi <strong>${name || 'there'}</strong>! I can see your live product listings and customer orders. Ask me anything about your store!<br><br>Try: <em>"Show my products"</em> or <em>"Any low stock alerts?"</em>`,
        chips: [
          { label: '📦 My products', msg: 'Show me all my products with their status and stock' },
          { label: '📉 Low stock alerts', msg: 'Which of my products have low stock?' },
          { label: '🛒 My orders', msg: 'Show me recent orders for my products' },
          { label: '⏳ Pending approvals', msg: 'Which of my products are still pending admin approval?' },
          { label: '📊 Sales summary', msg: 'What is my total revenue and how many orders have I received?' },
          { label: '➕ Add new product', msg: 'How do I add a new product to my store?' },
        ]
      },
      admin: {
        headerName: 'Admin Console',
        statusText: 'Platform management',
        pillClass: 'ek-role-admin',
        pillLabel: '🔧 Admin',
        welcome: `👋 Hi <strong>${name || 'Admin'}</strong>! I have live platform data — pending approvals, refunds, order stats. What do you need?<br><br>Try: <em>"How many products are pending approval?"</em>`,
        chips: [
          { label: '✅ Pending approvals', msg: 'How many products are pending approval? List them.' },
          { label: '💰 Pending refunds', msg: 'Show me all pending refund requests' },
          { label: '📊 Platform stats', msg: 'Give me an overview of the platform — orders, customers, products' },
          { label: '📦 Recent orders', msg: 'What is the current order breakdown by status?' },
          { label: '👥 Customer count', msg: 'How many customers are registered on the platform?' },
          { label: '⚙️ Manage users', msg: 'How do I manage customer accounts and permissions?' },
        ]
      },
      guest: {
        headerName: 'Ekart Assistant',
        statusText: 'Online — here to help',
        pillClass: 'ek-role-guest',
        pillLabel: 'Guest',
        welcome: `👋 Welcome to Ekart! I can help you explore the platform.<br><br>Register or login for a personalized experience with order tracking, cart, and more.`,
        chips: [
          { label: '🛍️ Browse products', msg: 'How do I browse and search products on Ekart?' },
          { label: '📝 How to register', msg: 'How do I create an account on Ekart?' },
          { label: '🚚 Delivery info', msg: 'What are the delivery charges and timelines?' },
          { label: '💳 Payment options', msg: 'What payment methods does Ekart support?' },
          { label: '🔄 Return policy', msg: 'What is the return and replacement policy?' },
        ]
      }
    };
    return config[r] || config['guest'];
  };

  const currentConfig = getRoleConfig(role, userName);

  // --- State ---
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: currentConfig.welcome, isHtml: true }
  ]);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // --- Auto-scroll Effect ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  // --- Handlers ---
  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (!hasOpenedOnce) setHasOpenedOnce(true);
    if (!isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 350);
    }
  };

  const handleClear = () => {
    setMessages([{ role: 'assistant', text: currentConfig.welcome, isHtml: true }]);
    setShowChips(true);
  };

  const handleChipClick = (msg) => {
    setShowChips(false);
    sendMessage(msg);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 90) + 'px';
    }
  };

  const sendMessage = async (textOverride = null) => {
    const text = textOverride !== null ? textOverride.trim() : inputValue.trim();
    if (!text || isBusy) return;

    setShowChips(false);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Optimistically add user message
    const newMsg = { role: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setIsBusy(true);

    try {
      // Build history excluding welcome messages to send to backend
      const historyToSent = messages
        .filter(m => !m.isHtml) 
        .map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyToSent
        })
      });
      const data = await res.json();
      const reply = data.reply || 'Sorry, I could not process that.';
      
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Something went wrong. Please try again.' }]);
    } finally {
      setIsBusy(false);
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  };

  // --- Formatting Helpers ---
  const formatText = (text, isHtml) => {
    if (isHtml) return text;
    // Escape HTML first
    let escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    // Apply basic markdown parsing
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin:0.2rem 0"><strong>$1.</strong> $2</div>')
      .replace(/\n/g, '<br>');
  };

  return (
    <>
      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{ __html: `/* ── FAB ── */
#ek-fab {
    position:fixed; bottom:2rem; right:2rem; z-index:9500;
    width:58px; height:58px; border-radius:50%;
    background:linear-gradient(135deg,#f5a800,#d48f00);
    border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:1.35rem; color:#1a1000;
    box-shadow:0 6px 28px rgba(245,168,0,0.5);
    transition:transform 0.3s,box-shadow 0.3s;
    animation:ekFabPop 0.45s cubic-bezier(0.23,1,0.32,1) both;
}
#ek-fab:hover { transform:scale(1.12); box-shadow:0 10px 36px rgba(245,168,0,0.7); }
.ek-fab-pulse {
    position:absolute; inset:-4px; border-radius:50%;
    border:2px solid rgba(245,168,0,0.35);
    animation:ekPulseRing 2.5s ease-out infinite;
}
.ek-fab-badge {
    position:absolute; top:-2px; right:-2px;
    width:14px; height:14px; border-radius:50%;
    background:#22c55e; border:2px solid rgba(8,10,24,1);
    animation:ekDotBlink 2s ease-in-out infinite;
}

/* ── Window ── */
#ek-win {
    position:fixed; bottom:5.5rem; right:2rem; z-index:9499;
    width:370px; max-height:560px;
    background:rgba(7,9,22,0.97);
    backdrop-filter:blur(24px);
    border:1px solid rgba(245,168,0,0.3);
    border-radius:20px;
    display:flex; flex-direction:column;
    box-shadow:0 28px 80px rgba(0,0,0,0.7);
    transform:scale(0.85) translateY(24px);
    opacity:0; pointer-events:none;
    transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    overflow:hidden;
}
#ek-win.ek-open {
    transform:scale(1) translateY(0);
    opacity:1; pointer-events:all;
}

/* ── Header ── */
.ek-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:0.9rem 1.1rem;
    background:linear-gradient(135deg,rgba(245,168,0,0.18),rgba(245,100,0,0.08));
    border-bottom:1px solid rgba(245,168,0,0.18);
    flex-shrink:0;
}
.ek-header-left { display:flex; align-items:center; gap:0.65rem; }
.ek-av {
    width:38px; height:38px; border-radius:50%;
    background:rgba(245,168,0,0.15); border:2px solid rgba(245,168,0,0.45);
    display:flex; align-items:center; justify-content:center;
    font-size:1.05rem; color:#f5a800;
}
.ek-hname { font-size:0.85rem; font-weight:700; color:white; line-height:1.2; }
.ek-hstatus {
    font-size:0.65rem; color:rgba(255,255,255,0.45);
    display:flex; align-items:center; gap:0.3rem; margin-top:0.1rem;
}
.ek-dot-green { width:7px; height:7px; border-radius:50%; background:#22c55e; display:inline-block; animation:ekDotBlink 2s infinite; }
.ek-hbtns { display:flex; gap:0.25rem; }
.ek-hbtn {
    width:28px; height:28px; border-radius:50%;
    background:rgba(255,255,255,0.07); border:none; cursor:pointer;
    color:rgba(255,255,255,0.45); font-size:0.68rem;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.2s;
}
.ek-hbtn:hover { background:rgba(255,255,255,0.15); color:white; }

/* Role pill */
.ek-role-pill {
    display:inline-flex; align-items:center; gap:0.25rem;
    padding:0.15rem 0.55rem; border-radius:50px;
    font-size:0.6rem; font-weight:700; letter-spacing:0.06em;
    border:1px solid;
}
.ek-role-customer { background:rgba(96,165,250,0.12); border-color:rgba(96,165,250,0.35); color:#60a5fa; }
.ek-role-vendor   { background:rgba(52,211,153,0.12); border-color:rgba(52,211,153,0.35); color:#34d399; }
.ek-role-admin    { background:rgba(167,139,250,0.12); border-color:rgba(167,139,250,0.35); color:#a78bfa; }
.ek-role-guest    { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.2);  color:rgba(255,255,255,0.5); }

/* ── Quick chips ── */
.ek-chips {
    padding:0.6rem 1rem 0.4rem;
    border-bottom:1px solid rgba(255,255,255,0.06);
    flex-shrink:0;
}
.ek-chips-label {
    font-size:0.6rem; font-weight:700; letter-spacing:0.1em;
    text-transform:uppercase; color:rgba(255,255,255,0.25);
    margin-bottom:0.4rem;
}
.ek-chips-row { display:flex; flex-wrap:wrap; gap:0.3rem; }
.ek-chip {
    font-size:0.68rem; font-weight:500;
    padding:0.28rem 0.6rem; border-radius:50px;
    background:rgba(245,168,0,0.08);
    border:1px solid rgba(245,168,0,0.22);
    color:rgba(255,255,255,0.65); cursor:pointer;
    transition:all 0.2s; font-family:inherit;
    white-space:nowrap;
}
.ek-chip:hover { background:rgba(245,168,0,0.2); color:white; border-color:rgba(245,168,0,0.5); }

/* ── Messages ── */
.ek-msgs {
    flex:1; overflow-y:auto; padding:0.875rem 1rem;
    display:flex; flex-direction:column; gap:0.7rem;
    scroll-behavior:smooth;
}
.ek-msgs::-webkit-scrollbar { width:3px; }
.ek-msgs::-webkit-scrollbar-thumb { background:rgba(245,168,0,0.25); border-radius:2px; }

.ek-msg { display:flex; align-items:flex-end; gap:0.45rem; animation:ekMsgIn 0.28s ease both; }
.ek-msg.ek-user { flex-direction:row-reverse; }
.ek-mav {
    width:26px; height:26px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:0.65rem;
}
.ek-msg.ek-bot  .ek-mav { background:rgba(245,168,0,0.12); border:1px solid rgba(245,168,0,0.25); color:#f5a800; }
.ek-msg.ek-user .ek-mav { background:rgba(245,168,0,0.2); border:1px solid rgba(245,168,0,0.4); color:#1a1000; }
.ek-bubble {
    max-width:84%; padding:0.6rem 0.875rem;
    border-radius:14px; font-size:0.8rem; line-height:1.55;
    font-family:inherit;
}
.ek-msg.ek-bot  .ek-bubble {
    background:rgba(255,255,255,0.09); border:1px solid rgba(255,255,255,0.1);
    color:rgba(255,255,255,0.88); border-bottom-left-radius:3px;
}
.ek-msg.ek-user .ek-bubble {
    background:linear-gradient(135deg,#f5a800,#d48f00);
    color:#1a1000; font-weight:600; border-bottom-right-radius:3px;
}

/* Typing */
.ek-typing { display:flex; align-items:center; gap:0.45rem; padding:0 0 0.25rem 1rem; flex-shrink:0; }
.ek-typing-dots {
    display:flex; gap:4px; padding:0.55rem 0.75rem;
    background:rgba(255,255,255,0.09); border:1px solid rgba(255,255,255,0.1);
    border-radius:14px; border-bottom-left-radius:3px;
}
.ek-typing-dots span {
    width:7px; height:7px; border-radius:50%;
    background:rgba(245,168,0,0.65);
    animation:ekTypingBounce 1.2s ease infinite;
}
.ek-typing-dots span:nth-child(2) { animation-delay:0.2s; }
.ek-typing-dots span:nth-child(3) { animation-delay:0.4s; }

/* ── Input ── */
.ek-input-row {
    display:flex; align-items:flex-end; gap:0.45rem;
    padding:0.7rem 1rem;
    border-top:1px solid rgba(255,255,255,0.07);
    flex-shrink:0;
}
#ek-input {
    flex:1; background:rgba(255,255,255,0.07);
    border:1px solid rgba(255,255,255,0.13); border-radius:10px;
    padding:0.6rem 0.8rem; color:white;
    font-family:inherit; font-size:0.8rem; outline:none;
    resize:none; max-height:90px; line-height:1.4;
    transition:border-color 0.2s;
}
#ek-input::placeholder { color:rgba(255,255,255,0.28); }
#ek-input:focus { border-color:rgba(245,168,0,0.5); }
#ek-send {
    width:36px; height:36px; border-radius:50%; flex-shrink:0;
    background:linear-gradient(135deg,#f5a800,#d48f00);
    border:none; cursor:pointer; color:#1a1000; font-size:0.85rem;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.2s;
}
#ek-send:hover { transform:scale(1.1); }
#ek-send:disabled { opacity:0.38; cursor:not-allowed; transform:none; }

/* ── Animations ── */
@keyframes ekFabPop        { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
@keyframes ekPulseRing     { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(1.5);opacity:0} }
@keyframes ekDotBlink      { 0%,100%{opacity:1} 50%{opacity:0.35} }
@keyframes ekMsgIn         { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
@keyframes ekTypingBounce  { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

@media(max-width:440px) {
    #ek-win  { width:calc(100vw - 2rem); right:1rem; bottom:5rem; }
    #ek-fab  { bottom:1.25rem; right:1.25rem; }
}`}} />

      {/* FAB */}
      <button id="ek-fab" onClick={handleToggle} title="Ekart Assistant">
        <span className="ek-fab-pulse"></span>
        {!hasOpenedOnce && <span className="ek-fab-badge"></span>}
        <i className="fas fa-robot"></i>
      </button>

      {/* Chat Window */}
      <div id="ek-win" className={isOpen ? 'ek-open' : ''}>
        
        {/* Header */}
        <div className="ek-header">
          <div className="ek-header-left">
            <div className="ek-av"><i className="fas fa-robot"></i></div>
            <div>
              <div className="ek-hname">{currentConfig.headerName}</div>
              <div className="ek-hstatus">
                <span className="ek-dot-green"></span>
                <span>{currentConfig.statusText}</span>
                &nbsp;·&nbsp;
                <span className={`ek-role-pill ${currentConfig.pillClass}`}>
                  {currentConfig.pillLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="ek-hbtns">
            <button className="ek-hbtn" onClick={handleClear} title="Clear chat">
              <i className="fas fa-trash-alt"></i>
            </button>
            <button className="ek-hbtn" onClick={handleToggle} title="Close">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Quick chips */}
        {showChips && (
          <div className="ek-chips">
            <div className="ek-chips-label">Quick questions</div>
            <div className="ek-chips-row">
              {currentConfig.chips.map((chip, idx) => (
                <button 
                  key={idx} 
                  className="ek-chip" 
                  onClick={() => handleChipClick(chip.msg)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="ek-msgs">
          {messages.map((msg, idx) => (
            <div key={idx} className={`ek-msg ${msg.role === 'user' ? 'ek-user' : 'ek-bot'}`}>
              <div className="ek-mav">
                <i className={`fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
              </div>
              <div 
                className="ek-bubble"
                dangerouslySetInnerHTML={{ __html: formatText(msg.text, msg.isHtml) }}
              />
            </div>
          ))}
          
          {/* Typing indicator */}
          {isBusy && (
            <div className="ek-typing">
              <div className="ek-mav" style={{ background: 'rgba(245,168,0,0.12)', border: '1px solid rgba(245,168,0,0.25)', color: '#f5a800' }}>
                <i className="fas fa-robot"></i>
              </div>
              <div className="ek-typing-dots"><span></span><span></span><span></span></div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="ek-input-row">
          <textarea 
            id="ek-input" 
            ref={textareaRef}
            rows="1"
            placeholder="Ask me anything…"
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          <button id="ek-send" onClick={() => sendMessage()} disabled={isBusy || !inputValue.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatWidget;