import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LibrarianLayout from './layouts/LibrarianpageLayout.jsx';
import ThemeContextProvider from './contexts/ThemeContext.jsx';
import './global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeContextProvider>
        <Routes>
          <Route path="/" element={<LibrarianLayout />} />
        </Routes>
      </ThemeContextProvider>
    </BrowserRouter>
  </StrictMode>
);
