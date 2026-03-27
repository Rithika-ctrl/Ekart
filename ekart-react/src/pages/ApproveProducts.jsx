import { useEffect } from 'react';
export default function ApproveProducts() {
  useEffect(() => {
    // Redirect to server-rendered admin approvals page to preserve full admin UI
    window.location.replace('/approve-products');
  }, []);
  return (
    <div style={{padding:20}}>Redirecting to admin approvals...</div>
  );
}
