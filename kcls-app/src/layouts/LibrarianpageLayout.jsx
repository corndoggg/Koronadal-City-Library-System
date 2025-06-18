import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/librarian/Sidebar';
import Topbar from '../components/librarian/Topbar';
import { motion, AnimatePresence } from 'framer-motion';

const LibrarianpageLayout = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleMobileSidebar = () => setShowMobileSidebar(!showMobileSidebar);
  const toggleCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      {/* Sidebar on Desktop */}
      <motion.div
        className="d-none d-md-block"
        animate={{ width: isSidebarCollapsed ? 80 : 260 }}
        transition={{ duration: 0.3 }}
        style={{
          overflow: 'hidden',
          backgroundColor: '#fff',
          boxShadow: '2px 0 10px rgba(0, 0, 0, 0.05)',
          zIndex: 1000
        }}
      >
        <Sidebar collapsed={isSidebarCollapsed} />
      </motion.div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            className="position-fixed top-0 start-0 bg-white shadow-lg"
            style={{ width: '240px', height: '100vh', zIndex: 1100 }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="flex-grow-1 d-flex flex-column w-100">
        <Topbar
          toggleMobileSidebar={toggleMobileSidebar}
          toggleCollapse={toggleCollapse}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="p-4 pt-3" style={{ flexGrow: 1 }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            minHeight: 'calc(100vh - 72px)',
            transition: 'all 0.3s ease'
          }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LibrarianpageLayout;
