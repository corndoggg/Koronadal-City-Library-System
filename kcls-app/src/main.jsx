import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import LibrarianpageLayout from './layouts/LibrarianpageLayout.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LibrarianpageLayout />
    </BrowserRouter>
  </StrictMode>
);
