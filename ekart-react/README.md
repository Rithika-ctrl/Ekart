
## 🚀 How to Run

### Prerequisites
- Node.js 18+
- Spring Boot backend running on `http://localhost:8080`

### Development
```bash
cd ekart-react
npm install
npm run dev
```
Then open http://localhost:5173

### Production Build
```bash
npm run build
# Output is in dist/ folder
# Deploy dist/ to any static host (Netlify, Vercel, Nginx, etc.)
```

### Deployment Notes
- **Netlify / Vercel**: `public/_redirects` file handles SPA routing automatically
- **Nginx**: Add `try_files $uri $uri/ /index.html;` inside your `location /` block
- **Apache**: Add `FallbackResource /index.html` to your `.htaccess`

### Environment Variables
Create a `.env` file in the project root (only if needed):
```
VITE_API_BASE_URL=http://localhost:8080
```
For local development, you can leave `VITE_API_BASE_URL` unset; Vite will proxy `/api/...` to your Spring Boot backend.

For production (or if you run the frontend from a different origin), set this to your deployed backend URL.

---
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
