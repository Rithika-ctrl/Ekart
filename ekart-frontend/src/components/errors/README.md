# Error Pages - React Components

This directory contains React component versions of all error pages.

## Components

### 1. **Forbidden403** (`Forbidden403.jsx`)
Access Denied error page (HTTP 403).
```jsx
<Forbidden403 onAdminLogin={handleAdminLogin} onHome={handleHome} />
```
**Props:**
- `onAdminLogin` (function): Optional callback for admin login button
- `onHome` (function): Optional callback for home button

**Features:**
- Clean, professional design
- Admin login redirect option
- Home button for navigation

---

### 2. **NotFound404** (`NotFound404.jsx`)
Page Not Found error (HTTP 404).
```jsx
<NotFound404 requestedPath="/unknown-page" onHome={handleHome} />
```
**Props:**
- `requestedPath` (string): Path that was requested (optional)
- `onHome` (function): Optional callback for home button

**Features:**
- Glassmorphism design
- Animated bouncing icon
- Displays requested path in debug box
- Go Back and Go Home buttons

---

### 3. **ErrorPage** (`ErrorPage.jsx`)
Generic server error page (HTTP 500 and others).
```jsx
<ErrorPage
  errorMessage="Database connection failed"
  errorDetails="PostgreSQL: ECONNREFUSED 127.0.0.1:5432"
  onGoBack={handleGoBack}
  onHome={handleHome}
/>
```
**Props:**
- `errorMessage` (string): User-friendly error message
- `errorDetails` (string): Technical error details (optional, debug only)
- `onGoBack` (function): Optional callback for go back button
- `onHome` (function): Optional callback for home button

**Features:**
- Professional glassmorphism design
- Animated pulsing error icon
- Debug info box (conditionally shown)
- Respects development/production environments

---

### 4. **GeoBlocked** (`GeoBlocked.jsx`)
Geo-blocking page for India-only service.
```jsx
<GeoBlocked onContactSupport={handleContactSupport} />
```
**Props:**
- `onContactSupport` (function): Optional callback for support button

**Features:**
- India flag emoji
- Gradual background
- Info box explaining restriction
- Contact support option

---

## Usage Examples

### React Router Integration

```jsx
import { 
  Forbidden403, 
  NotFound404, 
  ErrorPage, 
  GeoBlocked 
} from '@/components/errors';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* ... other routes ... */}

      {/* 403 - Access Denied */}
      <Route path="/forbidden" element={
        <Forbidden403 onHome={() => navigate('/')} />
      } />

      {/* 404 - Not Found */}
      <Route path="/not-found" element={
        <NotFound404 onHome={() => navigate('/')} />
      } />

      {/* Generic 500 Error */}
      <Route path="/error" element={
        <ErrorPage 
          errorMessage="Something went wrong"
          onHome={() => navigate('/')}
        />
      } />

      {/* Geo-blocking */}
      <Route path="/geo-blocked" element={
        <GeoBlocked onContactSupport={() => navigate('/contact')} />
      } />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
}
```

### Express/Node Backend Integration

```jsx
// In your Express middleware
app.use((req, res, next) => {
  // Handle 404
  res.status(404).json({
    component: 'NotFound404',
    requestedPath: req.path,
    message: 'Not Found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    component: err.status === 403 ? 'Forbidden403' : 'ErrorPage',
    errorMessage: err.message,
    errorDetails: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
```

### Conditional Rendering Based on User Type

```jsx
import { Forbidden403 } from '@/components/errors';
import { useAuth } from '@/hooks/useAuth';

function AdminPage() {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <Forbidden403 />;
  }

  return <div>Admin Content</div>;
}
```

---

## Styling Overview

### Color Palette

**All Components:**
- Primary Gold: `#f5a800`
- Primary Gold Dark: `#d48f00`
- Success Green: `#22c55e`
- Danger Red: `#ff8060` / `#e24b4a`

**Light Theme (403):**
- Background: `#f4f6fb`
- Card: `#ffffff`
- Text: `#1a1a2e`

**Dark Theme (404, 500, GEO_BLOCKED):**
- Background: `#0a0f1e` / `#080c18`
- Glassmorphism: `rgba(255,255,255,0.07)`
- Border: `rgba(255,255,255,0.15)`
- Text: `#ffffff` / `rgba(255,255,255,0.6)`

### Responsive Design

All components are mobile-responsive and adjust layouts for smaller screens:
- Touch-friendly button sizes
- Adjusted padding/margins
- Readable text on all devices
- Flexible button layouts

---

## Features

✅ **Inline Styling** - No external CSS required
✅ **Responsive Design** - Mobile and desktop support
✅ **Accessible** - Semantic HTML, proper contrast
✅ **Animations** - Smooth transitions and effects
✅ **Callbacks** - Flexible button handlers
✅ **Debug Support** - Optional error details display
✅ **Production Safe** - Sensitive info conditionally shown

---

## File Structure

```
src/components/errors/
├── index.js              # Main export & error map
├── README.md             # This file
├── Forbidden403.jsx      # 403 Access Denied
├── NotFound404.jsx       # 404 Not Found
├── ErrorPage.jsx         # Generic error (500+)
└── GeoBlocked.jsx        # Geo-blocking page
```

---

## Integration Checklist

### For Frontend

- [ ] Import error components
- [ ] Set up React Router error routes
- [ ] Add state management for error handling
- [ ] Implement error boundary wrapper
- [ ] Test all error scenarios
- [ ] Verify mobile responsiveness

### For Backend

- [ ] Add error middleware
- [ ] Configure error codes
- [ ] Set up error logging
- [ ] Add stack trace formatting (dev mode)
- [ ] Hide sensitive info (prod mode)
- [ ] Implement geo-blocking logic

---

## Advanced Usage

### Custom Error Boundary

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null, errorInfo: null };

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.errorInfo) {
      return (
        <ErrorPage
          errorMessage="Application encountered an error"
          errorDetails={this.state.error?.toString()}
          onHome={() => window.location.href = '/'}
        />
      );
    }
    return this.props.children;
  }
}

// Use it:
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Context Integration

```jsx
const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <ErrorPage
        errorMessage={error.message}
        errorDetails={error.details}
        onHome={() => setError(null)}
      />
    );
  }

  return (
    <ErrorContext.Provider value={{ setError }}>
      {children}
    </ErrorContext.Provider>
  );
}

// Usage:
const { setError } = useContext(ErrorContext);
setError({ message: 'Failed to load data', details: 'API error' });
```

---

## Testing

Mock different error scenarios:

```jsx
// Test 403
<Forbidden403 />

// Test 404
<NotFound404 requestedPath="/admin/secret" />

// Test 500
<ErrorPage 
  errorMessage="Database failure"
  errorDetails="Connection timeout after 30s"
/>

// Test Geo-blocking
<GeoBlocked />
```

---

## Performance

- Zero external dependencies
- Inline styles (no CSS file download)
- Lightweight animations (CSS, not JS)
- Fast rendering time
- Small bundle impact

---

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE: Not supported (modern only)

---

**Last Updated:** 2025
**Version:** 1.0.0
