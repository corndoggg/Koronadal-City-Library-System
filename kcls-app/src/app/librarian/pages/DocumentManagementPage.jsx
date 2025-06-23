import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Snackbar,
  Alert,
  Pagination,
  Stack,
  Button,
  useTheme,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import { Article, Visibility, Edit, Add } from '@mui/icons-material';
import DocumentFormModal from '../../../components/librarian/documents/DocumentFormModal';

const DocumentManagementPage = () => {
  const theme = useTheme();
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 2;

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
      setToast({ open: true, message: 'Failed to load documents', severity: 'error' });
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
        const payload = {};
        formData.forEach((value, key) => {
          payload[key] = value;
        });
        await axios.put(`${API_BASE}/documents/${editDoc.Document_ID}`, payload);
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
      showToast('Failed to save document', 'error');
    }
  };

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentDocs = filteredDocs.slice(indexOfFirst, indexOfLast);

  // Placeholder image for PDF
  const placeholderImg = 'https://placehold.co/400x180?text=PDF+Document';

  return (
    <Box p={3} sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={1}>
          <Article fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>
            Document Management
          </Typography>
        </Box>
        {/* Searchbar at top right */}
        <TextField
          label="Search by title, author, category..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 350 }}
        />
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={3}>
        {currentDocs.map((doc) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={doc.Document_ID}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: theme.palette.background.paper,
              }}
            >
              {/* Placeholder image */}
              <CardMedia
                component="img"
                src={placeholderImg}
                alt="PDF Placeholder"
                sx={{
                  width: '100%',
                  height: 180,
                  objectFit: 'cover',
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
              />

              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom noWrap>
                  {doc.Title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {doc.Author}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {doc.Category} &bull; {doc.Year}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dept: {doc.Department}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Classification: {doc.Classification}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Sensitivity: {doc.Sensitivity}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pb: 2 }}>
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
              </CardActions>
            </Card>
          </Grid>
        ))}
        {currentDocs.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.secondary">
                No documents found.
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={Math.ceil(filteredDocs.length / rowsPerPage)}
          page={currentPage}
          onChange={(e, page) => setCurrentPage(page)}
          color="primary"
        />
      </Box>

      {/* Floating Add Document Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpenAdd}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          borderRadius: '50%',
          minWidth: 0,
          width: 64,
          height: 64,
          boxShadow: 6,
          zIndex: 1201,
          fontWeight: 700,
          fontSize: 40,
          p: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        +
      </Button>

      <DocumentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDocument}
        isEdit={isEdit}
        documentData={editDoc}
      />

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