import React from 'react';
import { Outlet } from 'react-router-dom';

const containerStyle = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#f8f9fa'
};

const sidebarStyle = {
  width: '250px',
  flexShrink: 0, // sidebar stays fixed width
};

const mainStyle = {
  flexGrow: 1,
  margin: '10px',
  padding: '10px',
  backgroundColor: 'white',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  borderRadius: '4px'
};

const LibrarianpageLayout = () => {
  return (
    <div style={containerStyle}>
      <div style={sidebarStyle}>
      
      </div>
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
};

export default LibrarianpageLayout;