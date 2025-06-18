import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import LibrarianLayout from './layouts/LibrarianpageLayout.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibrarianLayout />}>
          
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
