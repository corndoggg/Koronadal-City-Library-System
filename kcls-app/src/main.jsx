import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LibrarianLayout from './layouts/LibrarianpageLayout.jsx';
import ThemeContextProvider from './contexts/ThemeContext.jsx';
import DashboardPage from './app/librarian/pages/DashboardPage.jsx';
import './global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeContextProvider>
        <Routes>
        <Route path="/dashboard" element={<LibrarianLayout />}>
          <Route index element={<DashboardPage />} />
        </Route>
        </Routes>
      </ThemeContextProvider>
    </BrowserRouter>
  </StrictMode>
);
