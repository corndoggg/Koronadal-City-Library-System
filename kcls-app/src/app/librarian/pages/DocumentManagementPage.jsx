import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Snackbar, Alert, Pagination,
  Tooltip, Stack, Button, useTheme
} from '@mui/material';
import { Article, Visibility, Edit, Add } from '@mui/icons-material';
import DocumentFormModal from '../../../components/librarian/documents/DocumentFormModal';

const DocumentManagementPage = () => {
  const theme = useTheme();
  const API_BASE = import.meta.env.VITE_API_BASE;
  const isDark = theme.palette.mode === 'dark';

  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editDoc, setEditDoc] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [search, documents]);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/documents`);
      setDocuments(res.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast('Failed to load documents', 'error');
    }
  };

  const handleSearch = () => {
    const lower = search.toLowerCase();
    const filtered = documents.filter(
      (doc) =>
        doc.Title?.toLowerCase().includes(lower) ||
        doc.Author?.toLowerCase().includes(lower) ||
        doc.Category?.toLowerCase().includes(lower)
    );
    setFilteredDocs(filtered);
    setCurrentPage(1);
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleOpenAdd = () => {
    setIsEdit(false);
    setEditDoc(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setIsEdit(true);
    setEditDoc(doc);
    setModalOpen(true);
  };

  const handleSaveDocument = async (formData) => {
    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/documents/${editDoc.Document_ID}`, Object.fromEntries(formData));
        showToast('Document updated');
      } else {
        await axios.post(`${API_BASE}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Document uploaded');
      }
      fetchDocuments();
      setModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to save document', 'error');
    }
  };

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentDocs = filteredDocs.slice(indexOfFirst, indexOfLast);

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={1}>
          <Article fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>
            Document Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAdd}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Add Document
        </Button>
      </Box>

      {/* Search */}
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          label="Search by title, author, category..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 350 }}
        />
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: theme.palette.primary.light }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Author</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentDocs.map((doc) => (
              <TableRow key={doc.Document_ID} hover>
                <TableCell>{doc.Title}</TableCell>
                <TableCell>{doc.Author}</TableCell>
                <TableCell>{doc.Category}</TableCell>
                <TableCell>{doc.Year}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View File">
                    <IconButton
                      color="primary"
                      onClick={() => window.open(`${API_BASE}${doc.File_Path}`, '_blank')}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Document">
                    <IconButton color="secondary" onClick={() => handleOpenEdit(doc)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}

            {currentDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No documents found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={Math.ceil(filteredDocs.length / rowsPerPage)}
          page={currentPage}
          onChange={(e, page) => setCurrentPage(page)}
          color="primary"
        />
      </Box>

      {/* Modal */}
      <DocumentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDocument}
        isEdit={isEdit}
        documentData={editDoc}
      />

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentManagementPage;