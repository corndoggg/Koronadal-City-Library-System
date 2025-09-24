import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LibrarianpageLayout from './layouts/LibrarianpageLayout.jsx';
import AdminpageLayout from './layouts/AdminpageLayout.jsx';
import BorrowerLayout from './layouts/BorrowerpageLayout.jsx';
import { ThemeContextProvider } from './contexts/ThemeContext.jsx';
import { SidebarProvider } from './contexts/SidebarContext';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext.jsx';
import './global.css';

import DashboardPage from './app/dashboard/page.jsx';
import BookManagementPage from './app/librarian/books/page.jsx';
import AdminBookManagementPage from './app/admin/books/page.jsx';
import DocumentManagementPage from './app/librarian/documents/page.jsx';
import AdminDocumentManagementPage from './app/admin/documents/page.jsx';
import StorageManagementPage from './app/librarian/storages/page.jsx';
import UserManagementPage from './app/admin/users/page.jsx';
import LoginPage from './app/login/page.jsx';
import BrowseLibraryPage from './app/borrower/browse/page.jsx';
import BorrowerBorrowPage from './app/borrower/borrow/page.jsx';
import LibrarianBorrowPage from './app/librarian/borrow/page.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RegisterBorrowerPage from './app/register/page.jsx';
import ReportsPage from './app/admin/reports/page.jsx';
import DocumentApprovalPage from './app/admin/borrow/page.jsx';
import SettingsPage from './app/admin/settings/page.jsx';
import AuditLogsPage from './app/admin/audit/page.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SystemSettingsProvider>
      <SidebarProvider>
        <BrowserRouter>
          <ThemeContextProvider>
            <Routes>
              {/* Redirect root to login page */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              {/* Login & Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register-borrower" element={<RegisterBorrowerPage />} />
              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={["Staff"]} allowedPositions={["Admin"]} />}>
                <Route path="/admin" element={<AdminpageLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="books" element={<AdminBookManagementPage />} />
                  <Route path="documents" element={<AdminDocumentManagementPage />} />
                  <Route path="borrows" element={<DocumentApprovalPage />} />
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                  <Route path="system" element={<SettingsPage />} />
                </Route>
              </Route>
              {/* Librarian routes */}
              <Route element={<ProtectedRoute allowedRoles={["Staff"]} allowedPositions={["Librarian"]} />}>
                <Route path="/librarian" element={<LibrarianpageLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="books" element={<BookManagementPage />} />
                  <Route path="documents" element={<DocumentManagementPage />} />
                  <Route path="storage" element={<StorageManagementPage />} />
                  <Route path="borrows" element={<LibrarianBorrowPage />} />
                </Route>
              </Route>
              {/* Borrower routes */}
              <Route element={<ProtectedRoute allowedRoles={["Borrower"]} />}>
                <Route path="/borrower" element={<BorrowerLayout />}>
                  <Route index element={<Navigate to="browse" replace />} />
                  <Route path="browse" element={<BrowseLibraryPage />} />
                  <Route path="borrow" element={<BorrowerBorrowPage />} />
                </Route>
              </Route>
            </Routes>
          </ThemeContextProvider>
        </BrowserRouter>
      </SidebarProvider>
    </SystemSettingsProvider>
  </React.StrictMode>
);