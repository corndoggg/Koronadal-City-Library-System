import React from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { Menu, User, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Topbar = ({ toggleMobileSidebar, isSidebarCollapsed, toggleCollapse }) => {
  return (
    <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-white shadow-sm sticky-top" style={{ zIndex: 1050 }}>
      <div className="d-flex align-items-center gap-2">
        {/* Mobile Toggle */}
        <Button variant="outline-primary" className="d-md-none" onClick={toggleMobileSidebar}>
          <Menu size={20} />
        </Button>

        {/* Desktop Collapse Toggle */}
        <Button variant="outline-secondary" className="d-none d-md-inline" onClick={toggleCollapse}>
          {isSidebarCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
        </Button>

        <h5 className="mb-0 ms-2 d-none d-md-block">📚 Librarian Panel</h5>
      </div>

      {/* User Dropdown */}
      <Dropdown align="end">
        <Dropdown.Toggle variant="light" id="dropdown-user" className="d-flex align-items-center gap-2 border-0">
          <User size={20} />
          <span className="d-none d-sm-inline">Librarian</span>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item href="#/profile">Profile</Dropdown.Item>
          <Dropdown.Item href="#/settings">Settings</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item href="#/logout">Logout</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default Topbar;
