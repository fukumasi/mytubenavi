import React from "react";
import { createRoot } from "react-dom/client";
import App from "./client/App";
import "./client/styles/index.css";
import './client/i18n';
import { FirebaseProvider } from './client/contexts/FirebaseContext';
import { AuthProvider } from './client/contexts/AuthContext';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fab } from '@fortawesome/free-brands-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';

library.add(fab, fas);

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <FirebaseProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </FirebaseProvider>
  </React.StrictMode>
);