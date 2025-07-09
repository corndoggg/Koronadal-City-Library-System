import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LibrarianLayout from './layouts/LibrarianpageLayout.jsx';
import { ThemeContextProvider } from './contexts/ThemeContext.jsx';
import './global.css';

import DashboardPage from './app/librarian/pages/DashboardPage.jsx';
import BookManagementPage from './app/librarian/books/page.jsx';
import DocumentsManagementPage from './app/librarian/documents/page.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeContextProvider>
        <Routes>
        <Route path="/" element={<LibrarianLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="books" element={<BookManagementPage />} />
          <Route path="documents" element={<DocumentsManagementPage />} />
          {/* Add more routes as needed */}
        </Route>
        </Routes>
      </ThemeContextProvider>
    </BrowserRouter>
  </StrictMode>
);
