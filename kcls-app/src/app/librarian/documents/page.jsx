import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Snackbar, Alert, Pagination, Button, useTheme,
  Card, CardContent, CardActions, CardMedia, IconButton, Tooltip, Grid, Dialog, DialogTitle, DialogContent, MenuItem
} from '@mui/material';
import { Article, Visibility, Edit, Close } from '@mui/icons-material';
import DocumentFormModal from '../../../components/documents/DocumentFormModal';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

const DocumentManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
  const [documents, setDocuments] = useState([]), [filteredDocs, setFilteredDocs] = useState([]), [search, setSearch] = useState(''),
    [currentPage, setCurrentPage] = useState(1), rowsPerPage = 2, [toast, setToast] = useState({ open: false, message: '', severity: 'success' }),
    [modalOpen, setModalOpen] = useState(false), [isEdit, setIsEdit] = useState(false), [editDoc, setEditDoc] = useState(null),
    [pdfDialogOpen, setPdfDialogOpen] = useState(false), [pdfUrl, setPdfUrl] = useState(''), [loading, setLoading] = useState(false),
    [locations, setLocations] = useState([]);

  useEffect(() => { fetchDocuments(); fetchLocations(); }, []);
  useEffect(() => { handleSearch(); }, [search, documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/documents`);
      const docsWithInventory = await Promise.all(
        res.data.map(async (doc) => {
          try {
            const invRes = await axios.get(`${API_BASE}/documents/inventory/${doc.Document_ID}`);
            const normalizedInventory = (invRes.data || []).map(inv => ({
              availability: inv.availability || inv.Availability || "",
              condition: inv.condition || inv.Condition || "",
              location: inv.location || inv.Location || inv.LocationName || "",
              Storage_ID: inv.Storage_ID
            }));
            return { ...doc, inventory: normalizedInventory };
          } catch { return { ...doc, inventory: [] }; }
        })
      );
      setDocuments(docsWithInventory);
    } catch { setToast({ open: true, message: 'Failed to load documents', severity: 'error' }); }
    setLoading(false);
  };

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/storages`);
      setLocations(res.data || []);
    } catch { setLocations([]); }
  };

  const handleSearch = () => {
    const lower = search.toLowerCase();
    setFilteredDocs(
      documents.filter(
        (doc) =>
          doc.Title?.toLowerCase().includes(lower) ||
          doc.Author?.toLowerCase().includes(lower) ||
          doc.Category?.toLowerCase().includes(lower)
      )
    );
    setCurrentPage(1);
  };

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
  const handleOpenAdd = () => { setIsEdit(false); setEditDoc(null); setModalOpen(true); };
  const handleOpenEdit = (doc) => { setIsEdit(true); setEditDoc(doc); setModalOpen(true); };

  const handleSaveDocument = async (formData, inventoryList = [], deletedInventory = []) => {
    try {
      let docId = null;
      if (isEdit) {
        const payload = {}; formData.forEach((v, k) => { payload[k] = v; });
        await axios.put(`${API_BASE}/documents/${editDoc.Document_ID}`, payload);
        docId = editDoc.Document_ID; showToast('Document updated');
      } else {
        const res = await axios.post(`${API_BASE}/documents/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        docId = res.data.documentId || res.data.id || res.data.Document_ID; showToast('Document uploaded');
      }
      if (docId && Array.isArray(inventoryList)) {
        for (const inv of inventoryList) {
          // Only send if location is a valid integer
          const locId = parseInt(inv.location, 10);
          if (!locId || isNaN(locId)) continue;
          const payload = {
            availability: inv.availability,
            condition: inv.condition,
            location: locId
          };
          if (inv.Storage_ID) await axios.put(`${API_BASE}/documents/inventory/${docId}/${inv.Storage_ID}`, payload);
          else await axios.post(`${API_BASE}/documents/inventory/${docId}`, payload);
        }
      }
      if (docId && Array.isArray(deletedInventory)) {
        for (const inv of deletedInventory) {
          if (inv.Storage_ID) await axios.delete(`${API_BASE}/documents/inventory/${docId}/${inv.Storage_ID}`);
        }
      }
      fetchDocuments(); setModalOpen(false);
    } catch { showToast('Failed to save document', 'error'); }
  };

  const handleViewPdf = (filePath) => { setPdfUrl(`${API_BASE}${filePath}`); setPdfDialogOpen(true); };

  const indexOfLast = currentPage * rowsPerPage, indexOfFirst = indexOfLast - rowsPerPage, currentDocs = filteredDocs.slice(indexOfFirst, indexOfLast);
  const placeholderImg = 'https://placehold.co/400x180?text=PDF+Document';

  return (
    <Box p={3} sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={1}>
          <Article fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>Document Management</Typography>
        </Box>
        <TextField
          label="Search by title, author, category..."
          variant="outlined"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 350, background: theme.palette.background.paper, borderRadius: 1 }}
        />
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={3}>
        {currentDocs.map((doc) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={doc.Document_ID}>
            <Card sx={{
              borderRadius: 3, boxShadow: 3, height: '100%', display: 'flex',
              flexDirection: 'column', background: theme.palette.background.paper,
            }}>
              <CardMedia
                component="img"
                src={placeholderImg}
                alt="PDF Placeholder"
                sx={{
                  width: '100%', height: 180, objectFit: 'cover',
                  borderTopLeftRadius: 12, borderTopRightRadius: 12,
                }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom noWrap>{doc.Title}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{doc.Author}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {doc.Category} &bull; {doc.Year}
                </Typography>
                <Typography variant="caption" color="text.secondary">Dept: {doc.Department}</Typography>
                <br />
                <Typography variant="caption" color="text.secondary">Classification: {doc.Classification}</Typography>
                <br />
                <Typography variant="caption" color="text.secondary">Sensitivity: {doc.Sensitivity}</Typography>
                {/* Inventory Section */}
                {Array.isArray(doc.inventory) && doc.inventory.length > 0 && (
                  <Box mt={2} sx={{ background: theme.palette.background.default, borderRadius: 1, p: 1 }}>
                    <Box sx={{
                      display: 'inline-block',
                      px: 2,
                      py: 0.5,
                      mb: 1,
                      borderRadius: 4,
                      background: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      fontWeight: 600,
                      fontSize: 15,
                      letterSpacing: 0.5,
                    }}>
                      Copies: {doc.inventory.length}
                    </Box>
                    {doc.inventory.map((inv, idx) => (
                      <Box key={idx} sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5, pl: 1 }}>
                        <span>
                          <b>Availability:</b> {inv.availability || "-"} &nbsp;
                          <b>Condition:</b> {inv.condition || "-"} &nbsp;
                          <b>Location:</b> {inv.location || "-"}
                        </span>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pb: 2 }}>
                <Tooltip title="View File">
                  <IconButton color="primary" onClick={() => handleViewPdf(doc.File_Path)}>
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
              <Typography variant="body2" color="text.secondary">No documents found.</Typography>
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
          position: 'fixed', bottom: 32, right: 32, borderRadius: '50%',
          minWidth: 0, width: 64, height: 64, boxShadow: 6, zIndex: 1201,
          fontWeight: 700, fontSize: 40, p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</Button>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: { xs: '90vh', md: 700 },
            bgcolor: theme.palette.background.paper,
            borderRadius: 3,
            boxShadow: 8,
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1,
            background: theme.palette.background.default, borderBottom: `1px solid ${theme.palette.divider}`, minHeight: 56,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Visibility color="primary" sx={{ fontSize: 28, mr: 1 }} />
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: 18 }}>
              Viewing PDF Document
            </Typography>
          </Box>
          <IconButton
            onClick={() => setPdfDialogOpen(false)}
            size="small"
            sx={{
              color: theme.palette.grey[600],
              '&:hover': { color: theme.palette.error.main, bgcolor: theme.palette.action.hover }
            }}
            aria-label="Close PDF"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0, height: { xs: 'calc(90vh - 56px)', md: 644 },
            background: theme.palette.background.paper,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {pdfUrl ? (
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <Box
                sx={{
                  width: '100%', height: '100%', maxHeight: 644, maxWidth: '100%',
                  overflow: 'auto', background: theme.palette.background.paper,
                  borderRadius: 2, boxShadow: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Viewer
                  fileUrl={pdfUrl}
                  defaultScale={1.2}
                  plugins={[]}
                  renderToolbar={() => null}
                  renderLoader={() => (
                    <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
                      <Typography color="text.secondary" fontSize={16}>Loading PDF...</Typography>
                    </Box>
                  )}
                  style={{ height: '100%', width: '100%' }}
                />
              </Box>
            </Worker>
          ) : (
            <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
              <Typography color="text.secondary" fontSize={16}>PDF not available.</Typography>
            </Box>
          )}
          <Box
            sx={{
              width: '100%', textAlign: 'center', py: 1,
              background: theme.palette.background.default,
              borderTop: `1px solid ${theme.palette.divider}`,
              fontSize: 13, color: theme.palette.text.secondary, letterSpacing: 0.2,
            }}
          >
            <b>Note:</b> Downloading and printing are disabled for this preview.
          </Box>
        </DialogContent>
      </Dialog>

      <DocumentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveDocument}
        isEdit={isEdit}
        documentData={editDoc}
        locations={locations}
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