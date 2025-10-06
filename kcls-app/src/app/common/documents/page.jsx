import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Snackbar, Alert, Pagination, Button, useTheme,
  IconButton, Tooltip, Grid, Stack, CircularProgress, Chip, Paper, Divider, InputAdornment, LinearProgress
} from '@mui/material';
import { Article, Visibility, Edit, Add, Search, PictureAsPdf, Lock, Inventory2, Refresh } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import DocumentFormModal from '../../../components/DocumentFormModal.jsx';
import DocumentPDFViewer from '../../../components/DocumentPDFViewer.jsx';
import { logAudit } from '../../../utils/auditLogger.js'; // NEW

const DocumentManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/documents`);
      const docsWithInventory = await Promise.all(
        (res.data || []).map(async doc => {
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
          } catch {
            return { ...doc, inventory: [] };
          }
        })
      );
      setDocuments(docsWithInventory);
    } catch {
      setToast({ open: true, message: 'Failed to load documents', severity: 'error' });
    }
    setLoading(false);
  }, [API_BASE]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/storages`);
      setLocations(res.data || []);
    } catch {
      setLocations([]);
    }
  }, [API_BASE]);

  const handleSearch = useCallback(() => {
    const q = search.toLowerCase();
    setFilteredDocs(
      documents.filter(d =>
        d.Title?.toLowerCase().includes(q) ||
        d.Author?.toLowerCase().includes(q) ||
        d.Category?.toLowerCase().includes(q)
      )
    );
    setCurrentPage(1);
  }, [documents, search]);

  useEffect(() => { fetchDocuments(); fetchLocations(); }, [fetchDocuments, fetchLocations]);
  useEffect(() => { handleSearch(); }, [handleSearch]);

  const handleOpenAdd = () => { setIsEdit(false); setEditDoc(null); setModalOpen(true); };

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
  const handleOpenEdit = doc => { setIsEdit(true); setEditDoc(doc); setModalOpen(true); };

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
        logAudit('DOC_UPDATE', 'Document', docId, { title: payload.Title || editDoc.Title });
      } else {
        const res = await axios.post(`${API_BASE}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        docId = res.data.documentId || res.data.id || res.data.Document_ID;
        showToast('Document uploaded');
        logAudit('DOC_UPLOAD', 'Document', docId, { title: titleField || 'Untitled' });
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
          if (inv.Storage_ID) {
            await axios.put(`${API_BASE}/documents/inventory/${docId}/${inv.Storage_ID}`, payload);
          } else {
            await axios.post(`${API_BASE}/documents/inventory/${docId}`, payload);
          }
        }
      }

      if (docId && Array.isArray(deletedInventory)) {
        for (const inv of deletedInventory) {
          if (inv.Storage_ID) {
            await axios.delete(`${API_BASE}/documents/inventory/${docId}/${inv.Storage_ID}`);
          }
        }
      }

      fetchDocuments();
      setModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to save document', 'error');
    }
  };

  const handleViewPdf = filePath => {
    if (!filePath) return showToast('No file path', 'error');
    setPdfUrl(`${API_BASE}${filePath}`);
    setPdfDialogOpen(true);
  };

  // New: close viewer and cleanup
  const handleClosePdf = () => {
    try {
      if (pdfUrl && pdfUrl.startsWith('blob:')) URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      console.warn('Failed to revoke PDF preview URL', err);
    }
    setPdfUrl('');
    setPdfDialogOpen(false);
  };

  const indexLast = currentPage * rowsPerPage;
  const indexFirst = indexLast - rowsPerPage;
  const currentDocs = filteredDocs.slice(indexFirst, indexLast);

  const docStats = useMemo(() => {
    let publicCount = 0;
    let restrictedCount = 0;
    let confidentialCount = 0;
    let totalCopies = 0;
    let availableCopies = 0;
    let borrowedCopies = 0;
    let reservedCopies = 0;
    let lostCopies = 0;
    const categorySet = new Set();

    for (const doc of documents) {
      const sensitivity = (doc.Sensitivity || '').toLowerCase();
      if (sensitivity === 'public') publicCount += 1;
      else if (sensitivity === 'restricted') restrictedCount += 1;
      else if (sensitivity === 'confidential') confidentialCount += 1;

      if (doc.Category) categorySet.add(doc.Category);

      const inventory = doc.inventory || [];
      totalCopies += inventory.length;
      for (const inv of inventory) {
        const availability = (inv.availability || '').toLowerCase();
        if (availability === 'available') availableCopies += 1;
        else if (availability === 'borrowed') borrowedCopies += 1;
        else if (availability === 'reserved') reservedCopies += 1;
        else if (availability === 'lost') lostCopies += 1;
      }
    }

    return {
      totalDocuments: documents.length,
      categoryCount: categorySet.size,
      publicCount,
      restrictedCount,
      confidentialCount,
      totalCopies,
      availableCopies,
      borrowedCopies,
      reservedCopies,
      lostCopies
    };
  }, [documents]);

  const {
    totalDocuments,
    categoryCount,
    publicCount,
    restrictedCount,
    confidentialCount,
    totalCopies,
    availableCopies,
    borrowedCopies,
    reservedCopies,
    lostCopies
  } = docStats;

  const summaryCards = [
    {
      title: 'Catalogued documents',
      value: totalDocuments,
      caption: `${categoryCount} categories organized`,
      icon: <Article fontSize="small" />,
      color: 'primary'
    },
    {
      title: 'Total copies tracked',
      value: totalCopies,
      caption: `${availableCopies} currently on shelves`,
      icon: <Inventory2 fontSize="small" />,
      color: 'secondary'
    },
    {
      title: 'Restricted holdings',
      value: restrictedCount + confidentialCount,
      caption: `${restrictedCount} restricted • ${confidentialCount} confidential`,
      icon: <Lock fontSize="small" />,
      color: 'warning'
    },
    {
      title: 'Loans in circulation',
      value: borrowedCopies,
      caption: `${reservedCopies} reserved • ${lostCopies} lost`,
      icon: <PictureAsPdf fontSize="small" />,
      color: 'error'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2.5,
            p: { xs: 2.5, md: 3 },
            backgroundImage: t => `linear-gradient(135deg, ${t.palette.mode === 'dark' ? t.palette.primary.dark : alpha(t.palette.primary.light, 0.95)} 0%, ${t.palette.mode === 'dark' ? t.palette.primary.main : t.palette.primary.dark} 100%)`,
            color: t => t.palette.common.white,
            border: t => `1px solid ${alpha(t.palette.primary.main, 0.4)}`,
            boxShadow: t => `0 24px 48px ${alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.45 : 0.25)}`
          }}
        >
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems={{ lg: 'center' }}>
            <Stack spacing={2} flex={1}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Article sx={{ opacity: 0.9 }} />
                <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>
                  Knowledge repository
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800} letterSpacing={0.45}>
                Document research workspace
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: 560, opacity: 0.9 }}>
                Search, curate, and audit academic works with a Devias-inspired console that surfaces sensitivities, circulation, and storage availability at a glance.
              </Typography>
            </Stack>
            <Stack spacing={1.5} minWidth={{ lg: 320 }} alignItems={{ xs: 'stretch', lg: 'flex-end' }}>
              <TextField
                size="small"
                placeholder="Search title, author, or category"
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 1.25,
                    bgcolor: alpha(theme.palette.common.white, 0.12),
                    color: 'inherit',
                    '& fieldset': { borderColor: alpha(theme.palette.common.white, 0.2) },
                    '&:hover fieldset': { borderColor: alpha(theme.palette.common.white, 0.4) }
                  }
                }}
                sx={{
                  width: '100%',
                  '& .MuiInputBase-input': { color: 'inherit' }
                }}
              />
              <Stack direction="row" gap={1} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }} flexWrap="wrap">
                <Tooltip title="Refresh documents">
                  <IconButton
                    onClick={() => { fetchDocuments(); fetchLocations(); }}
                    size="small"
                    sx={{
                      borderRadius: 1,
                      border: `1px solid ${alpha(theme.palette.common.white, 0.4)}`,
                      color: 'inherit',
                      '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.16) }
                    }}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleOpenAdd}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 1,
                    px: 2.25,
                    boxShadow: 'none'
                  }}
                >
                  Add document
                </Button>
              </Stack>
              {loading && (
                <LinearProgress
                  color="inherit"
                  sx={{ width: '100%', borderRadius: 1, backgroundColor: alpha(theme.palette.common.white, 0.2) }}
                />
              )}
            </Stack>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            border: t => `1.5px solid ${t.palette.divider}`,
            bgcolor: 'background.paper',
            p: { xs: 2, md: 2.75 }
          }}
        >
          <Grid container spacing={2.5}>
            {summaryCards.map(card => (
              <Grid item xs={12} sm={6} xl={3} key={card.title}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 1.75,
                    p: 2,
                    height: '100%',
                    border: theme => `1px solid ${alpha(theme.palette[card.color]?.main || theme.palette.primary.main, 0.25)}`,
                    bgcolor: theme => alpha(theme.palette[card.color]?.main || theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: theme => alpha(theme.palette.background.paper, 0.35)
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Box>
                        <Typography variant="overline" sx={{ letterSpacing: 0.6, opacity: 0.75 }}>
                          {card.title}
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {card.value}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {card.caption}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {loading ? (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              borderColor: theme.palette.divider,
              bgcolor: 'background.paper'
            }}
          >
            <CircularProgress size={46} />
            <Typography mt={2} variant="caption" color="text.secondary" display="block" fontWeight={600}>
              Loading documents…
            </Typography>
          </Paper>
        ) : (
          <>
            {currentDocs.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  textAlign: 'center',
                  py: 6,
                  borderRadius: 2,
                  borderStyle: 'dashed'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No documents found.
                </Typography>
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: 'repeat(1, minmax(0, 1fr))',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                    lg: 'repeat(4, minmax(0, 1fr))'
                  },
                  alignItems: 'stretch'
                }}
              >
                {currentDocs.map(doc => {
                  const copies = doc.inventory || [];
                  return (
                    <Paper
                      key={doc.Document_ID}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        width: '100%',
                        minHeight: 320,
                        maxHeight: 320,
                        height: 320,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'border-color .18s ease, box-shadow .18s ease',
                        '&:hover': {
                          borderColor: theme => theme.palette.primary.main,
                          boxShadow: theme => `0 10px 32px ${alpha(theme.palette.primary.main, 0.18)}`
                        }
                      }}
                    >
                      <Box
                        sx={{
                          px: 1.75,
                          py: 1.5,
                          borderBottom: theme => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                          backgroundImage: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.light, theme.palette.mode === 'dark' ? 0.35 : 0.18)} 0%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.24)} 100%)`
                        }}
                      >
                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              bgcolor: theme => theme.palette.background.paper,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: theme => `0 6px 12px ${alpha(theme.palette.primary.main, 0.25)}`
                            }}
                          >
                            <PictureAsPdf fontSize="small" color="primary" />
                          </Box>
                          <Box flex={1} minWidth={0}>
                            <Typography
                              variant="subtitle1"
                              fontWeight={800}
                              title={doc.Title}
                              sx={{
                                lineHeight: 1.1,
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                overflow: 'hidden'
                              }}
                            >
                              {doc.Title || 'Untitled Document'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {doc.Department || 'No department assigned'}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={doc.Sensitivity || 'Unknown'}
                            color={doc.Sensitivity === 'Public' ? 'success' : doc.Sensitivity === 'Confidential' ? 'error' : 'warning'}
                            sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                          />
                        </Stack>
                      </Box>

                      <Stack spacing={1} sx={{ p: 1.5, flexGrow: 1 }}>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          sx={{
                            fontSize: 11,
                            gap: 0.5,
                            minHeight: 44,
                            alignContent: 'flex-start'
                          }}
                        >
                          <Chip size="small" variant="outlined" label={`Author: ${doc.Author || '—'}`} sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }} />
                          <Chip size="small" variant="outlined" label={`Category: ${doc.Category || '—'}`} sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }} />
                          <Chip size="small" variant="outlined" label={`Year: ${doc.Year || '—'}`} sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }} />
                          <Chip size="small" variant="outlined" label={`Class: ${doc.Classification || '—'}`} sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }} />
                        </Stack>

                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          {copies.length > 0 ? (
                            <Stack
                              spacing={0.5}
                              sx={{
                                flexGrow: 1,
                                minHeight: 96,
                                maxHeight: 96,
                                overflowY: 'auto',
                                pr: 0.25
                              }}
                            >
                              {copies.slice(0, 4).map((inv, i) => {
                                const availability = (inv.availability || '').toLowerCase();
                                const availabilityColor = availability === 'available'
                                  ? 'success'
                                  : availability === 'borrowed'
                                  ? 'warning'
                                  : availability === 'reserved'
                                  ? 'info'
                                  : availability === 'lost'
                                  ? 'error'
                                  : 'default';
                                return (
                                  <Stack key={i} direction="row" spacing={0.5} alignItems="center">
                                    <Chip size="small" label={inv.availability || 'Unknown'} color={availabilityColor} sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: 0.75 }} />
                                    <Chip size="small" variant="outlined" label={inv.condition || '—'} sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: 0.75 }} />
                                    <Chip size="small" variant="outlined" label={inv.locationName || inv.location || 'Location?'} sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: 0.75 }} />
                                  </Stack>
                                );
                              })}
                              {copies.length > 4 && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                  +{copies.length - 4} additional copies…
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Box
                              sx={{
                                flexGrow: 1,
                                minHeight: 96,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                No physical copies recorded yet.
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Stack>

                      <Divider />
                      <Stack direction="row" justifyContent="flex-end" gap={0.5} sx={{ p: 1.25 }}>
                        <Tooltip title="View PDF">
                          <IconButton
                            size="small"
                            onClick={() => handleViewPdf(doc.File_Path)}
                            sx={{
                              borderRadius: 0.75,
                              border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) }
                            }}
                            color="primary"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit document">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(doc)}
                            sx={{
                              borderRadius: 0.75,
                              border: theme => `1px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
                              '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.12) }
                            }}
                            color="secondary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>
            )}

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.max(1, Math.ceil(filteredDocs.length / rowsPerPage))}
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: 1,
                    fontWeight: 700,
                    minWidth: 34,
                    minHeight: 34
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
      </Stack>
    </Box>
  );
};

export default DocumentManagementPage;