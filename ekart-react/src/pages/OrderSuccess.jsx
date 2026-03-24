import React, { useEffect } from 'react';
import { Check, Hash, IndianRupee, Clock, CreditCard, FileText, MapPin, ListChecks, Home, Settings, Truck } from 'lucide-react';

const OrderSuccess = ({ orderId, orderAmount, deliveryTime, paymentMode, subOrderIds, gstAmount }) => {
    
    // Confetti Effect Logic
    useEffect(() => {
        const colours = ['#f5a800', '#22c55e', '#ffffff', '#fbbf24', '#a3e635', '#34d399'];
        const wrap = document.getElementById('confetti');
        if (wrap) {
            for (let i = 0; i < 55; i++) {
                const span = document.createElement('span');
                span.style.position = 'absolute';
                span.style.top = '-10px';
                span.style.left = (Math.random() * 100) + '%';
                span.style.background = colours[Math.floor(Math.random() * colours.length)];
                span.style.width = (5 + Math.random() * 7) + 'px';
                span.style.height = (5 + Math.random() * 7) + 'px';
                span.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                span.style.opacity = '0.9';
                
                // Simplified fall animation via JS for reliability
                const duration = (1.8 + Math.random() * 1.4);
                span.style.transition = `transform ${duration}s linear, opacity ${duration}s linear`;
                wrap.appendChild(span);

                setTimeout(() => {
                    span.style.transform = `translateY(110vh) rotate(${Math.random() * 540}deg)`;
                    span.style.opacity = '0';
                }, 10);
            }
            setTimeout(() => wrap.innerHTML = '', 4000);
        }
    }, []);

    const isCOD = paymentMode?.toLowerCase().includes('cash');

    return (
        <div className="min-h-screen bg-[#05080f] text-white font-['Poppins'] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Layer */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600')] bg-cover bg-center blur-[7px] scale-110 opacity-30"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#050814]/88 via-[#080c1c]/82 to-[#050814]/92"></div>
            </div>

            {/* Confetti Container */}
            <div id="confetti" className="fixed inset-0 pointer-events-none z-0 overflow-hidden"></div>

            <div className="w-full max-w-[520px] bg-white/10 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] z-10 animate-in fade-in zoom-in duration-500">
                
                {/* Header */}
                <div className="p-8 text-center border-b border-white/10 relative overflow-hidden">
                    <div className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em] mb-5">E<span className="text-[#f5a800]">kart</span></div>
                    <div className="inline-flex items-center gap-1.5 bg-[#22c55e]/12 border border-[#22c55e]/30 text-[#22c55e] text-[10px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-widest mb-5">
                        <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse"></div>
                        Order Confirmed
                    </div>
                    <div className="w-20 h-20 rounded-full bg-[#22c55e]/10 border-2 border-[#22c55e]/35 flex items-center justify-center mx-auto mb-5 shadow-[0_0_50px_rgba(34,197,94,0.18)] text-[#22c55e]">
                        <Check size={32} strokeWidth={3} />
                    </div>
                    <h2 className="text-xl font-extrabold mb-1.5">Order Placed Successfully! 🎉</h2>
                    <p className="text-[12.5px] text-white/50 leading-relaxed">
                        Your order is confirmed. A confirmation email<br/>has been sent to your registered address.
                    </p>
                </div>

                {/* Body */}
                <div className="p-7 space-y-5">
                    <div className="grid grid-cols-2 gap-2.5">
                        
                        {/* Order ID Handling */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase mb-1">
                                <Hash size={11} className="text-[#f5a800]" /> Order ID
                            </div>
                            {subOrderIds?.includes(',') ? (
                                subOrderIds.split(',').map(sid => (
                                    <div key={sid} className="text-[11px] font-mono text-[#f5a800] leading-loose">#EK-{sid.trim()}</div>
                                ))
                            ) : (
                                <div className="text-[13px] font-mono text-[#f5a800]">#EK-{orderId || '—'}</div>
                            )}
                            <div className="text-[10px] text-white/50 mt-1">Reference number</div>
                        </div>

                        {/* Amount */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase mb-1">
                                <IndianRupee size={11} className="text-[#f5a800]" /> Amount Paid
                            </div>
                            <div className="text-base font-extrabold">₹{orderAmount || '0'}</div>
                            <div className="text-[10px] text-white/50 mt-1">Incl. taxes & delivery</div>
                        </div>

                        {/* ETA */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase mb-1">
                                <Clock size={11} className="text-[#f5a800]" /> Est. Delivery
                            </div>
                            <div className="text-[13px] font-extrabold">{deliveryTime || 'Standard'}</div>
                            <div className="text-[10px] text-white/50 mt-1">Delivery slot</div>
                        </div>

                        {/* Payment Mode */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase mb-1">
                                <CreditCard size={11} className="text-[#f5a800]" /> Payment
                            </div>
                            <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full mt-1 border ${
                                isCOD ? 'bg-[#fbbf24]/12 border-[#fbbf24]/30 text-[#fbbf24]' : 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'
                            }`}>
                                {isCOD ? <Banknote size={12}/> : <Check size={12}/>}
                                {paymentMode || 'Online'}
                            </div>
                        </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center px-1">
                        <div className="flex flex-col items-center flex-1">
                            <div className="w-7 h-7 bg-[#22c55e] rounded-full flex items-center justify-center text-[10px] shadow-[0_0_16px_rgba(34,197,94,0.4)]"><Check size={14}/></div>
                            <div className="text-[9px] font-semibold text-white/50 mt-1.5 uppercase">Confirmed</div>
                        </div>
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-[#22c55e] to-[#22c55e]/30 mb-4"></div>
                        <div className="flex flex-col items-center flex-1">
                            <div className="w-7 h-7 bg-[#f5a800]/20 border-2 border-[#f5a800] text-[#f5a800] rounded-full flex items-center justify-center text-[10px] animate-pulse"><Settings size={14}/></div>
                            <div className="text-[9px] font-semibold text-[#f5a800] mt-1.5 uppercase">Processing</div>
                        </div>
                        <div className="flex-1 h-[1px] bg-white/10 mb-4"></div>
                        <div className="flex flex-col items-center flex-1">
                            <div className="w-7 h-7 bg-white/5 border border-white/15 text-white/50 rounded-full flex items-center justify-center text-[10px]"><Truck size={14}/></div>
                            <div className="text-[9px] font-semibold text-white/50 mt-1.5 uppercase">Shipped</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <a href={`/track/${orderId}`} className="bg-[#f5a800] text-[#1a1000] py-3 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_20px_rgba(245,168,0,0.3)] hover:-translate-y-0.5 transition">
                            <MapPin size={14}/> Track
                        </a>
                        <a href="/view-orders" className="bg-white/10 border border-white/10 text-white/80 py-3 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 hover:bg-white/15 transition">
                            <ListChecks size={14}/> Orders
                        </a>
                        <a href="/customer/home" className="bg-white/5 border border-white/10 text-white/50 py-3 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 hover:text-white transition">
                            <Home size={14}/> Home
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-black/20 border-t border-white/10 py-3.5 px-7 flex justify-between items-center text-[10px] text-white/30 font-bold uppercase">
                    <div>E<span className="text-[#f5a800]">kart</span></div>
                    <div className="opacity-50">© 2026 Ekart. All rights reserved.</div>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;