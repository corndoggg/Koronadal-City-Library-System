import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Snackbar, Alert, Pagination, Button, useTheme,
  IconButton, Tooltip, Grid, Stack,
  CircularProgress, Chip, Paper
} from '@mui/material';
import { Article, Visibility, Edit, Close, Add } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import DocumentFormModal from '../../../components/DocumentFormModal';
import DocumentPDFViewer from '../../../components/DocumentPDFViewer';
import { logAudit } from '../../../utils/auditLogger.js'; // NEW

const AdminDocumentManagementPage = () => {
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
            const normalizedInventory = (invRes.data || []).map(inv => {
              const storageId =
                inv.Storage_ID ?? inv.storage_id ?? inv.Location_ID ?? inv.location_id ??
                inv.LocationID ?? inv.storageId ?? inv.StorageId ?? null;
              const storageLocation =
                inv.StorageLocation ?? inv.storageLocation ?? inv.storage_location ?? storageId;
              return {
                availability: inv.availability || inv.Availability || "",
                condition: inv.condition || inv.Condition || "",
                location: storageLocation != null && storageLocation !== "" ? String(storageLocation) : "",
                locationName: inv.Location ?? inv.location ?? "",
                Storage_ID: storageId ?? null
              };
            });
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
  const handleOpenEdit = (doc) => { setIsEdit(true); setEditDoc(doc); setModalOpen(true); };

  const handleSaveDocument = async (formData, inventoryList = [], deletedInventory = []) => {
    try {
      let docId = null;
      const titleField = formData.get ? (formData.get('Title') || formData.get('title')) : null;
      if (isEdit) {
        const payload = {};
        formData.forEach((v, k) => { payload[k] = v; });
        await axios.put(`${API_BASE}/documents/${editDoc.Document_ID}`, payload);
        docId = editDoc.Document_ID;
        showToast('Document updated');
        logAudit('DOC_UPDATE', 'Document', docId, { title: payload.Title || editDoc.Title }); // AUDIT
      } else {
        const res = await axios.post(`${API_BASE}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        docId = res.data.documentId || res.data.id || res.data.Document_ID;
        showToast('Document uploaded');
        logAudit('DOC_UPLOAD', 'Document', docId, { title: titleField || 'Untitled' }); // AUDIT
      }

      if (docId && Array.isArray(inventoryList)) {
        for (const inv of inventoryList) {
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

  // New: close viewer and cleanup blob URL
  const handleClosePdf = () => {
    try {
      if (pdfUrl && pdfUrl.startsWith('blob:')) URL.revokeObjectURL(pdfUrl);
    } catch {}
    setPdfUrl('');
    setPdfDialogOpen(false);
  };

  const indexOfLast = currentPage * rowsPerPage, indexOfFirst = indexOfLast - rowsPerPage, currentDocs = filteredDocs.slice(indexOfFirst, indexOfLast);
  const placeholderImg = 'https://placehold.co/400x180?text=PDF+Document';

  return (
    <Box p={3} sx={{ position: 'relative', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
            p: 2,
            mb: 4,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            width: '100%',
            border: theme => `2px solid ${theme.palette.divider}`,
            borderRadius: 1,
            bgcolor: 'background.paper'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Article color="primary" />
          <Typography variant="h6" fontWeight={800} letterSpacing={0.5}>
            Document Management
          </Typography>
        </Box>
        <TextField
          label="Search title / author / category"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 320 }, ml: 'auto' }}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={() => { setIsEdit(false); setEditDoc(null); setModalOpen(true); }}
          sx={{ fontWeight: 700, borderRadius: 1 }}
        >
          Add Document
        </Button>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress color="primary" size={48} />
        </Box>
      ) : (
        <>
          <Grid container spacing={2.5}>
            {currentDocs.map(doc => {
              const copies = doc.inventory || [];
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={doc.Document_ID}>
                  <Paper
                    elevation={0}
                    sx={{
                      border: theme => `2px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color .18s, box-shadow .18s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: theme => `0 4px 16px ${alpha(theme.palette.primary.main, 0.12)}`
                      }
                    }}
                  >
                    {/* Thumbnail / placeholder */}
                    <Box
                      component="img"
                      src={`https://placehold.co/600x160/EEE/555?text=${encodeURIComponent((doc.Title || 'Document').slice(0,50))}`}
                      alt={doc.Title ? `Placeholder for ${doc.Title}` : 'PDF document placeholder'}
                      sx={{
                        height: 120,
                        width: '100%',
                        objectFit: 'cover',
                        borderBottom: theme => `1.5px solid ${theme.palette.divider}`
                      }}
                    />

                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75, flexGrow: 1 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={800}
                        title={doc.Title}
                        sx={{ lineHeight: 1.1, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
                      >
                        {doc.Title || 'Untitled Document'}
                      </Typography>
                      <Stack spacing={0.25} sx={{ fontSize: 12 }}>
                        <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary">
                          <strong>Author:</strong> {doc.Author || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary">
                          <strong>Category:</strong> {doc.Category || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary">
                          <strong>Year:</strong> {doc.Year || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary">
                          <strong>Department:</strong> {doc.Department || '—'}
                        </Typography>
                      </Stack>

                      {/* Tags */}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5}>
                        <Chip size="small" variant="outlined" label={`Class: ${doc.Classification || '—'}`} sx={{ fontSize: 10, fontWeight: 600, borderRadius: 0.5 }} />
                        <Chip size="small" color={doc.Sensitivity === 'Public' ? 'success' : 'warning'} label={doc.Sensitivity || 'Sensitivity'} sx={{ fontSize: 10, fontWeight: 600, borderRadius: 0.5 }} />
                        <Chip size="small" color="primary" label={`Copies ${copies.length}`} sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.5 }} />
                      </Stack>

                      {/* Section label */}
                      {copies.length > 0 && (
                        <Typography variant="overline" sx={{ mt: 1, fontSize: 10, letterSpacing: 0.5, opacity: 0.75 }}>
                          Inventory (first 4)
                        </Typography>
                      )}

                      {copies.length > 0 && (
                        <Stack mt={0.5} spacing={0.5} sx={{ maxHeight: 120, overflowY: 'auto', pr: 0.5 }}>
                          {copies.slice(0,4).map((inv,i)=>(
                            <Stack key={i} direction="row" spacing={0.5} sx={{ alignItems:'center' }}>
                              <Chip size="small" label={inv.availability || '—'} color={inv.availability === 'Available' ? 'success' : 'warning'} sx={{ height:20, fontSize:10, fontWeight:600 }} />
                              <Chip size="small" variant="outlined" label={inv.condition || 'Cond?'} sx={{ height:20, fontSize:10, fontWeight:600 }} />
                              <Chip size="small" variant="outlined" label={inv.locationName || inv.location || 'Loc?'} sx={{ height:20, fontSize:10, fontWeight:600 }} />
                            </Stack>
                          ))}
                          {copies.length > 4 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize:10 }}>
                              +{copies.length - 4} more…
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </Box>

                    <Box
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderTop: theme => `1.5px solid ${theme.palette.divider}`,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 0.5
                      }}
                    >
                      <Tooltip title="View PDF">
                        <IconButton
                          size="small"
                          onClick={() => handleViewPdf(doc.File_Path)}
                          sx={{
                            borderRadius: 0.75,
                            border: theme => `1px solid ${alpha(theme.palette.primary.main,0.4)}`,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) }
                          }}
                          color="primary"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(doc)}
                          sx={{
                            borderRadius: 0.75,
                            border: theme => `1px solid ${alpha(theme.palette.secondary.main,0.4)}`,
                            '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.12) }
                          }}
                          color="secondary"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
            {currentDocs.length === 0 && (
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    border: theme => `2px dashed ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No documents found.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={Math.ceil(filteredDocs.length / rowsPerPage)}
              page={currentPage}
              onChange={(e, page) => setCurrentPage(page)}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 1,
                  fontWeight: 700,
                  minWidth: 36,
                  minHeight: 36
                }
              }}
            />
          </Box>
        </>
      )}

      <DocumentPDFViewer
        open={pdfDialogOpen}
        onClose={handleClosePdf}
        fileUrl={pdfUrl}
        title="Viewing PDF Document"
      />
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
          sx={{ borderRadius: 1, fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDocumentManagementPage;