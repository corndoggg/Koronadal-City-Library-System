import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Snackbar, Alert, Pagination, Button, useTheme,
  IconButton, Tooltip, Grid, Stack, CircularProgress, Chip, Paper, Divider, InputAdornment, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse, TableSortLabel
} from '@mui/material';
import { Article, Visibility, Edit, Add, Search, Refresh, PictureAsPdf } from '@mui/icons-material';
import { formatDate } from '../../../utils/date';
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
  const rowsPerPage = 24;
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [sortBy, setSortBy] = useState('Title');
  const [sortDir, setSortDir] = useState('asc');

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
                Storage_ID: storageId ?? null,
                updatedOn: inv.UpdatedOn || inv.updatedOn || inv.updated_on || inv.Updated_On || inv.Updated || null,
                lostOn: inv.LostOn || inv.lostOn || inv.Lost_On || inv.lost_on || null
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
  const sortedDocs = useMemo(() => {
    const s = [...(filteredDocs || [])];
    const dir = sortDir === 'asc' ? 1 : -1;
    s.sort((a, b) => {
      const va = (a[sortBy] || '').toString().toLowerCase();
      const vb = (b[sortBy] || '').toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return s;
  }, [filteredDocs, sortBy, sortDir]);

  const currentDocs = sortedDocs.slice(indexFirst, indexLast);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

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

  const { totalDocuments, totalCopies, borrowedCopies, lostCopies } = docStats;

  // summary cards intentionally removed per design guidelines (use inline chips instead)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Article />
                <Typography variant="subtitle1" fontWeight={700}>Document workspace</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Search and manage document holdings; sensitivity and copy counts shown below.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
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
                  )
                }}
                sx={{ minWidth: { sm: 220, md: 320 }, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`Docs: ${totalDocuments}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip label={`Copies: ${totalCopies}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip label={`Borrowed: ${borrowedCopies}`} size="small" color={borrowedCopies ? 'warning' : 'default'} variant={borrowedCopies ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
                <Chip label={`Lost: ${lostCopies}`} size="small" color={lostCopies ? 'error' : 'default'} variant={lostCopies ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
                <Tooltip title="Refresh documents"><IconButton size="small" onClick={() => { fetchDocuments(); fetchLocations(); }} sx={{ borderRadius: 1, border: `1px solid ${alpha(theme.palette.divider, 0.75)}` }}><Refresh fontSize="small" /></IconButton></Tooltip>
                <Button variant="contained" size="small" startIcon={<Add />} onClick={handleOpenAdd} sx={{ borderRadius: 1, fontWeight: 700 }}>Add</Button>
              </Stack>
            </Stack>
          </Stack>
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
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'Title'} direction={sortDir} onClick={() => handleSort('Title')}>Title</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'Author'} direction={sortDir} onClick={() => handleSort('Author')}>Author</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'Category'} direction={sortDir} onClick={() => handleSort('Category')}>Category</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'Department'} direction={sortDir} onClick={() => handleSort('Department')}>Department</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'Copies'} direction={sortDir} onClick={() => handleSort('Copies')}>Copies</TableSortLabel>
                      </TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentDocs.map(doc => {
                      const copies = doc.inventory || [];
                      const isOpen = !!expandedRows[doc.Document_ID];
                      return (
                        <React.Fragment key={doc.Document_ID}>
                          <TableRow hover>
                            <TableCell sx={{ maxWidth: 320 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{doc.Title || 'Untitled Document'}</Typography>
                              <Typography variant="caption" color="text.secondary">{doc.Classification || ''}</Typography>
                            </TableCell>
                            <TableCell>{doc.Author || '—'}</TableCell>
                            <TableCell>{doc.Category || '—'}</TableCell>
                            <TableCell>{doc.Department || '—'}</TableCell>
                            <TableCell>{copies.length}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="View PDF"><IconButton size="small" onClick={() => handleViewPdf(doc.File_Path)}><Visibility fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenEdit(doc)}><Edit fontSize="small" /></IconButton></Tooltip>
                                {copies.length > 0 && (
                                  <Button size="small" onClick={() => toggleRow(doc.Document_ID)}>{isOpen ? 'Hide copies' : `Show copies (${copies.length})`}</Button>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                          {copies.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ p: 0 }}>
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2 }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Availability</TableCell>
                                          <TableCell>Condition</TableCell>
                                          <TableCell>Location</TableCell>
                                          <TableCell>Accession</TableCell>
                                          <TableCell>Updated</TableCell>
                                          <TableCell>Lost On</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {copies.map((inv, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell>{inv.availability || 'Unknown'}</TableCell>
                                            <TableCell>{inv.condition || '—'}</TableCell>
                                            <TableCell>{inv.locationName || inv.location || '—'}</TableCell>
                                            <TableCell>{
                                              inv.accessionNumber || inv.AccessionNumber || inv.Accession_No || inv.Accession || inv.Copy_Number || inv.CopyNo || inv.Storage_ID || '—'
                                            }</TableCell>
                                            <TableCell>{inv.updatedOn ? formatDate(inv.updatedOn) : '—'}</TableCell>
                                            <TableCell>{inv.lostOn ? formatDate(inv.lostOn) : '—'}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
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