import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Ekart - 404 Error Component
 * * This component renders a simple 404 error page.
 * It includes the common-layout CSS via a link tag to match the original implementation.
 */
export default function Error404() {
    
    // --- EFFECTS ---
    useEffect(() => {
        // Sync the document title to match the original "Insert title here" or a more descriptive one
        document.title = "404 - Page Not Found";
    }, []);

    const CSS = `
        /* Scoped styles to ensure the 404 header is visible and styled simply */
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: 'Poppins', sans-serif;
            background-color: #f8f9fa; /* Default light background if common-layout isn't loaded */
            color: #333;
            text-align: center;
        }

        .error-container h1 {
            font-size: 8rem;
            margin: 0;
            font-weight: 800;
            background: linear-gradient(135deg, #f5a800 0%, #d48f00 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .error-message {
            font-size: 1.5rem;
            margin-top: -1rem;
            color: #666;
        }

        .back-home {
            margin-top: 2rem;
            padding: 0.75rem 1.5rem;
            background-color: #f5a800;
            color: #1a1000;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background-color 0.2s;
        }

        .back-home:hover {
            background-color: #d48f00;
        }
    `;

    return (
        <div className="error-container">
            <style>{CSS}</style>
            {/* Original external stylesheet from HTML */}
            <link rel="stylesheet" href="/css/common-layout.css" />
            
            <h1>404</h1>
            <p className="error-message">Oops! The page you're looking for doesn't exist.</p>
            
            <Link to="/" className="back-home">
                <i className="fas fa-home" style={{ marginRight: '0.5rem' }}></i>
                Back to Dashboard
            </Link>
        </div>
    );
}