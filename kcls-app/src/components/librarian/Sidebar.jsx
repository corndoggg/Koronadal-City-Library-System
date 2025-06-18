import React from 'react';
import { Nav, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Handshake,
  Package
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import 'bootstrap/dist/css/bootstrap.min.css';

const navLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/books', icon: BookOpen, label: 'Books' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/borrow', icon: Handshake, label: 'Borrow' },
  { href: '/storage', icon: Package, label: 'Storage' },
];

const Sidebar = ({ collapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="bg-white d-flex flex-column align-items-start pt-4 h-100 shadow-sm"
      style={{
        minHeight: '100vh',
        paddingLeft: collapsed ? '0.5rem' : '1rem',
        paddingRight: collapsed ? '0.5rem' : '1rem',
      }}
    >
      {/* Sidebar Title */}
      {!collapsed && (
        <div className="w-100 mb-4 ps-2">
          <h5 className="text-primary fw-bold">📚 Librarian</h5>
        </div>
      )}

      <Nav className="flex-column w-100">
        {navLinks.map(({ href, icon: Icon, label }) => {
          const isActive = location.pathname === href;

          const navItem = (
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              key={href}
              className={`w-100 mb-2`}
              onClick={() => navigate(href)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className={`d-flex align-items-center gap-2 py-3 px-3 rounded ${
                  isActive ? 'bg-primary text-white' : 'text-dark'
                }`}
              >
                <Icon size={20} />
                {!collapsed && <span className="fw-medium">{label}</span>}
              </div>
            </motion.div>
          );

          return collapsed ? (
            <OverlayTrigger
              key={href}
              placement="right"
              overlay={<Tooltip>{label}</Tooltip>}
            >
              {navItem}
            </OverlayTrigger>
          ) : (
            navItem
          );
        })}
      </Nav>
    </div>
  );
};

export default Sidebar;
