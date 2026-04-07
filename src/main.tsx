import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import U6uApp from './U6uApp';

// SPA 路由：/u6u 走獨立流程，其他走 Admin
const isU6u = window.location.pathname.startsWith('/u6u');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isU6u ? <U6uApp /> : <App />}
  </StrictMode>,
);
