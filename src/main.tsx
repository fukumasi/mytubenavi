// src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
 <React.StrictMode>
   <BrowserRouter>
     <AuthProvider>
       <NotificationProvider>
         <App />
       </NotificationProvider>
     </AuthProvider>
   </BrowserRouter>
 </React.StrictMode>
);