import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * DeliveryPending Component
 * * This component displays the account approval status for delivery partners after email verification.
 */
export default function DeliveryPending() {
    const CSS = `:root{--yellow:#f5a800;--yellow-d:#d48f00;--glass-border:rgba(255,255,255,0.22);--glass-card:rgba(255,255,255,0.13);--glass-nav:rgba(0,0,0,0.25);--text-white:#ffffff;--text-light:rgba(255,255,255,0.80);--text-dim:rgba(255,255,255,0.50);}
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        #root {font-family:'Poppins',sans-serif;min-height:100vh;color:var(--text-white);display:flex;flex-direction:column;}
        .bg-layer{position:fixed;inset:0;z-index:-1;overflow:hidden;}
        .bg-layer::before{content:'';position:absolute;inset:-20px;background:url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80') center/cover no-repeat;filter:blur(6px);transform:scale(1.08);}
        .bg-layer::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,20,0.82) 0%,rgba(8,12,28,0.78) 40%,rgba(5,8,20,0.88) 100%);}
        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:1rem 3rem;display:flex;align-items:center;justify-content:space-between;background:var(--glass-nav);backdrop-filter:blur(14px);border-bottom:1px solid var(--glass-border);}
        .nav-brand{font-size:1.6rem;font-weight:700;color:var(--text-white);text-decoration:none;display:flex;align-items:center;gap:0.5rem;}
        .nav-brand span{color:var(--yellow);}
        .page{flex:1;display:flex;align-items:center;justify-content:center;padding:6rem 1.5rem 3rem;}
        .card{background:var(--glass-card);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:20px;padding:3rem 2.5rem;width:100%;max-width:500px;text-align:center;box-shadow:0 40px 100px rgba(0,0,0,0.4);animation:fadeUp 0.5s ease both;}

        /* Animated clock icon */
        .pending-icon{width:88px;height:88px;background:rgba(245,168,0,0.12);border:2px solid rgba(245,168,0,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 1.5rem;animation:pulse 2.5s ease-in-out infinite;}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,168,0,0.25);}50%{box-shadow:0 0 0 16px rgba(245,168,0,0);}}

        h1{font-size:1.6rem;font-weight:700;margin-bottom:0.5rem;}
        h1 span{color:var(--yellow);}
        .subtitle{font-size:0.88rem;color:var(--text-dim);margin-bottom:2rem;line-height:1.6;}

        /* Step timeline */
        .steps{display:flex;flex-direction:column;gap:0;margin-bottom:2rem;text-align:left;}
        .step{display:flex;align-items:flex-start;gap:1rem;padding:0.875rem 0;position:relative;}
        .step:not(:last-child)::after{content:'';position:absolute;left:18px;top:42px;bottom:-8px;width:2px;background:rgba(255,255,255,0.1);}
        .step-dot{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;border:2px solid;}
        .step-dot.done{background:rgba(34,197,94,0.2);border-color:#22c55e;color:#22c55e;}
        .step-dot.active{background:rgba(245,168,0,0.2);border-color:var(--yellow);color:var(--yellow);}
        .step-dot.pending{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.15);color:var(--text-dim);}
        .step-content{padding-top:0.2rem;}
        .step-title{font-size:0.88rem;font-weight:600;margin-bottom:0.15rem;}
        .step-title.done{color:#22c55e;}
        .step-title.active{color:var(--yellow);}
        .step-title.pending{color:var(--text-dim);}
        .step-desc{font-size:0.75rem;color:var(--text-dim);}

        .btn-check{display:inline-flex;align-items:center;gap:0.5rem;background:rgba(245,168,0,0.15);border:1px solid rgba(245,168,0,0.35);color:var(--yellow);text-decoration:none;font-size:0.85rem;font-weight:600;padding:0.75rem 1.5rem;border-radius:10px;transition:all 0.2s;cursor:pointer;font-family:'Poppins',sans-serif;}
        .btn-check:hover{background:rgba(245,168,0,0.25);}

        footer{background:rgba(0,0,0,0.5);backdrop-filter:blur(16px);border-top:1px solid var(--glass-border);padding:1.25rem 3rem;display:flex;align-items:center;justify-content:space-between;}
        .footer-brand{font-size:1.1rem;font-weight:700;color:white;}
        .footer-brand span{color:var(--yellow);}
        .footer-copy{font-size:0.72rem;color:var(--text-dim);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}`;

    return (
        <div className="delivery-pending-container">
            <style>{CSS}</style>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

            <div className="bg-layer"></div>
            
            <nav>
                <Link to="/" className="nav-brand">
                    <i className="fas fa-shopping-cart" style={{ fontSize: '1.1rem' }}></i>
                    <span>Ekart</span>
                </Link>
            </nav>

            <main className="page">
                <div className="card">
                    <div className="pending-icon">
                        <i className="fas fa-clock" style={{ color: 'var(--yellow)' }}></i>
                    </div>

                    <h1>Application <span>Submitted!</span></h1>
                    <p className="subtitle">
                        Your email has been verified. Your delivery account is now pending admin review.
                        You will receive an email at your registered address once approved.
                    </p>

                    {/* Step indicator */}
                    <div className="steps">
                        <div className="step">
                            <div className="step-dot done"><i className="fas fa-check"></i></div>
                            <div className="step-content">
                                <div className="step-title done">Registration Complete</div>
                                <div className="step-desc">Account created successfully</div>
                            </div>
                        </div>
                        <div className="step">
                            <div className="step-dot done"><i className="fas fa-check"></i></div>
                            <div className="step-content">
                                <div className="step-title done">Email Verified</div>
                                <div className="step-desc">OTP confirmed</div>
                            </div>
                        </div>
                        <div className="step">
                            <div className="step-dot active"><i className="fas fa-clock"></i></div>
                            <div className="step-content">
                                <div className="step-title active">Pending Admin Approval</div>
                                <div className="step-desc">Admin is reviewing your application — usually within 24 hours</div>
                            </div>
                        </div>
                        <div className="step">
                            <div className="step-dot pending"><i className="fas fa-unlock"></i></div>
                            <div className="step-content">
                                <div className="step-title pending">Account Active</div>
                                <div className="step-desc">You will be notified by email and can login</div>
                            </div>
                        </div>
                    </div>

                    <Link to="/delivery/login" className="btn-check">
                        <i className="fas fa-sign-in-alt"></i> Check Login Status
                    </Link>
                </div>
            </main>

            <footer>
                <div className="footer-brand"><span>Ekart</span></div>
                <div className="footer-copy">&#169; 2026 Ekart. All rights reserved.</div>
            </footer>
        </div>
    );
}