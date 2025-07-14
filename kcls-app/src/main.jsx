import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LibrarianpageLayout from './layouts/LibrarianpageLayout.jsx';
import AdminpageLayout from './layouts/AdminpageLayout.jsx';
import BorrowerLayout from './layouts/BorrowerpageLayout.jsx';
import { ThemeContextProvider } from './contexts/ThemeContext.jsx';
import './global.css';

import DashboardPage from './app/librarian/pages/DashboardPage.jsx';
import BookManagementPage from './app/librarian/books/page.jsx';
import AdminBookManagementPage from './app/admin/books/page.jsx';
import DocumentManagementPage from './app/librarian/documents/page.jsx';
import AdminDocumentManagementPage from './app/admin/documents/page.jsx';
import StorageManagementPage from './app/librarian/storages/page.jsx';
import UserManagementPage from './app/admin/users/page.jsx';
import LoginPage from './app/login/page.jsx';
import BrowseLibraryPage from './app/borrower/browse/page.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeContextProvider>
        <Routes>
          {/* Redirect root to login page */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Public routes */}
          
          {/* Login route */}
          <Route path="/login" element={<LoginPage />} />
          {/* Admin routes */}
          <Route path="/admin" element={<AdminpageLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="books" element={<AdminBookManagementPage />} />
            <Route path="documents" element={<AdminDocumentManagementPage />} />
            <Route path="users" element={<UserManagementPage />} />
          </Route>
          {/* Librarian routes */}
          <Route path="/librarian" element={<LibrarianpageLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="books" element={<BookManagementPage />} />
            <Route path="documents" element={<DocumentManagementPage />} />
            <Route path="storage" element={<StorageManagementPage />} />
          </Route>
          {/* Borrower routes */}
          <Route path="/borrower" element={<BorrowerLayout />}>
            <Route index element={<Navigate to="browse" replace />} />
            <Route path="browse" element={<BrowseLibraryPage />} />
          </Route>
        </Routes>
      </ThemeContextProvider>
    </BrowserRouter>
  </StrictMode>
);