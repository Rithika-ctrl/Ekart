import React from 'react';

/**
 * OtpEmail Component
 * * @param {Object} props
 * @param {string|number} props.otp - The 6-digit one-time password to display.
 */
export default function OtpEmail({
    otp = "000000"
}) {
    const CSS = `
        :root {
            --primary-color: #2874f0;
            --secondary-color: #fb641b;
            --text-color: #212121;
            --light-text: #878787;
            --white: #ffffff;
        }
        
        .email-body {
            font-family: 'Roboto', Arial, sans-serif;
            background-color: #f1f3f6;
            color: #212121;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 30px;
            background: #ffffff;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }
        
        h1 {
            color: #2874f0;
            font-size: 28px;
            margin-bottom: 15px;
            font-weight: 500;
        }
        
        h2 {
            color: #fb641b;
            font-size: 36px;
            margin: 20px 0;
            letter-spacing: 5px;
            font-weight: bold;
        }
        
        h3 {
            color: #212121;
            font-size: 24px;
            margin: 15px 0;
            font-weight: 500;
        }
        
        h4 {
            color: #212121;
            font-size: 20px;
            margin: 15px 0;
            font-weight: 400;
        }
        
        h5 {
            color: #212121;
            font-size: 18px;
            margin: 15px 0;
            font-weight: 500;
        }
        
        .footer-span {
            color: #878787;
            font-size: 14px;
            display: block;
            margin-top: 20px;
        }
        
        @media (max-width: 768px) {
            .email-body {
                padding: 10px;
            }
            
            .container {
                padding: 20px;
                margin: 10px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            h2 {
                font-size: 28px;
            }
            
            h3 {
                font-size: 20px;
            }
            
            h4 {
                font-size: 18px;
            }
            
            h5 {
                font-size: 16px;
            }
        }
    `;

    return (
        <div className="email-body">
            <style>{CSS}</style>
            <div className="container" style={{ textAlign: 'center' }}>
                <h1>Verify Your Account</h1>
                <h4>Hello,</h4>
                <h5>Thank you for choosing Ekart. Use the following OTP to complete your sign up process.</h5>
                <h3>Your One Time Password is:</h3>
                <h2>{otp}</h2>
                <h5>This OTP is valid for 5 minutes only. Please do not share this OTP with anyone.</h5>
                <span className="footer-span">Regards,<br />Team Ekart</span>
            </div>
        </div>
    );
}