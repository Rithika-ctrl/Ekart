/**
 * OtpEmail Component
 * Simple OTP display email for customer verification
 * Props: { name: string, otp: string }
 */

export const OtpEmail = ({ name = 'Customer', otp = '123456' }) => {
  const styles = {
    root: {
      fontFamily: "'Roboto', Arial, sans-serif",
      backgroundColor: '#f1f3f6',
      color: '#212121',
      margin: 0,
      padding: '20px',
      lineHeight: 1.6,
    },
    container: {
      maxWidth: '600px',
      margin: '20px auto',
      padding: '30px',
      background: '#ffffff',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
      textAlign: 'center',
    },
    heading1: {
      color: '#2874f0',
      fontSize: '28px',
      marginBottom: '15px',
      fontWeight: 500,
    },
    heading3: {
      color: '#212121',
      fontSize: '24px',
      margin: '15px 0',
      fontWeight: 500,
    },
    heading2: {
      color: '#fb641b',
      fontSize: '32px',
      margin: '20px 0',
      letterSpacing: '2px',
      fontWeight: 700,
    },
    heading4: {
      color: '#212121',
      fontSize: '20px',
      margin: '15px 0',
      fontWeight: 400,
    },
    heading5: {
      color: '#212121',
      fontSize: '18px',
      margin: '15px 0',
      fontWeight: 500,
    },
    span: {
      color: '#878787',
      fontSize: '14px',
      display: 'block',
      marginTop: '20px',
    },
  };

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        <h1 style={styles.heading1}>Hello,</h1>
        <h3 style={styles.heading3}>{name}</h3>
        <h4 style={styles.heading4}>Your OTP is:</h4>
        <h2 style={styles.heading2}>{otp}</h2>
        <h5 style={styles.heading5}>Thanks and Regards</h5>
        <span style={styles.span}>Ekart All rights reserved</span>
      </div>
    </div>
  );
};

export default OtpEmail;
