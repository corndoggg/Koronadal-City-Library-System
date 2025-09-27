import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, IconButton, useTheme,
  Pagination, Snackbar, Alert, Tooltip, Grid, Chip, CircularProgress, Paper, Stack
} from '@mui/material';
import { Edit, Book } from '@mui/icons-material';
import BookFormModal from '../../../components/BookFormModal.jsx';
import { alpha } from '@mui/material/styles';

const initialBookForm = { title: '', author: '', edition: '', publisher: '', year: '', subject: '', language: '', isbn: '' };
const initialCopyForm = { accessionNumber: '', availability: 'Available', condition: '', location: '' };

const AdminBookManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
  const [search, setSearch] = useState(''), [books, setBooks] = useState([]), [filteredBooks, setFilteredBooks] = useState([]),
    [currentPage, setCurrentPage] = useState(1), rowsPerPage = 8, [modalOpen, setModalOpen] = useState(false),
    [isEdit, setIsEdit] = useState(false), [editId, setEditId] = useState(null), [bookForm, setBookForm] = useState(initialBookForm),
    [copyForm, setCopyForm] = useState(initialCopyForm), [copies, setCopies] = useState([]), [editCopyIndex, setEditCopyIndex] = useState(null),
    [toast, setToast] = useState({ open: false, message: '', severity: 'success' }), [locations, setLocations] = useState([]),
    [loading, setLoading] = useState(false);

  useEffect(() => { fetchBooks(); fetchLocations(); }, []);
  useEffect(() => { handleSearch(); }, [search, books]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/books`);
      const booksWithInventory = await Promise.all(
        res.data.map(async (book) => {
          const invRes = await axios.get(`${API_BASE}/books/inventory/${book.Book_ID}`);
          const inventory = (invRes.data || []).map(copy => ({
            ...copy,
            location: copy.location !== null && copy.location !== undefined ? String(copy.location) : ''
          }));
          return { ...book, inventory };
        })
      );
      setBooks(booksWithInventory);
    } catch { showToast('Failed to load books', 'error'); }
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
    setFilteredBooks(books.filter(book =>
      Object.values(book).some(val => typeof val === 'string' && val.toLowerCase().includes(lower)) ||
      book.inventory?.some(copy => Object.values(copy).some(val => typeof val === 'string' && val.toLowerCase().includes(lower)))
    ));
    setCurrentPage(1);
  };

  const handleBookChange = e => setBookForm({ ...bookForm, [e.target.name]: e.target.name === 'year' ? parseInt(e.target.value) || '' : e.target.value });
  const handleCopyChange = e => setCopyForm({ ...copyForm, [e.target.name]: e.target.value });

  // Only allow editing/updating, not adding
  const handleSaveBook = async () => {
    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/books/${editId}`, bookForm);
        for (const copy of copies) {
          if (!copy.location || isNaN(parseInt(copy.location, 10))) continue;
          const payload = { ...copy, location: parseInt(copy.location, 10) };
          if (copy.Copy_ID) {
            await axios.put(`${API_BASE}/books/inventory/${editId}/${copy.Copy_ID}`, payload);
          }
        }
        showToast('Book updated');
        await fetchBooks();
        handleClose();
      }
    } catch {
      showToast('Failed to update book', 'error');
    }
  };

  const handleClose = () => {
    setModalOpen(false); setIsEdit(false); setBookForm(initialBookForm); setCopyForm(initialCopyForm); setCopies([]); setEditCopyIndex(null);
  };

  const openEditModal = (book) => {
    setIsEdit(true); setEditId(book.Book_ID);
    setBookForm({
      title: book.Title, author: book.Author, edition: book.Edition, publisher: book.Publisher,
      year: book.Year, subject: book.Subject, language: book.Language, isbn: book.ISBN,
    });
    setCopies((book.inventory || []).map(copy => ({
      ...copy,
      location: copy.location !== null && copy.location !== undefined ? String(copy.location) : ''
    })));
    setCopyForm(initialCopyForm); setModalOpen(true);
  };

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
  const indexOfLast = currentPage * rowsPerPage, indexOfFirst = indexOfLast - rowsPerPage, currentBooks = filteredBooks.slice(indexOfFirst, indexOfLast);
  const placeholderImg = "https://placehold.co/400x180?text=Book+Cover";
  const getLocationName = id => { const found = locations.find(loc => String(loc.ID) === String(id)); return found ? found.Name : id || "-"; };

  return (
    <Box p={3} sx={{ position: 'relative', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          p: 2,
          borderRadius: 1,
          border: theme => `2px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.04)}`
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Book fontSize="large" color="primary" />
          <Typography variant="h5" fontWeight={800} letterSpacing={0.5}>
            Book Management
          </Typography>
        </Box>
        <TextField
          label="Search by title, author, ISBN..."
          variant="outlined"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{
            width: 320,
            bgcolor: 'background.default',
            borderRadius: 1
          }}
        />
      </Box>

      {/* Book Cards */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress color="primary" size={48} />
        </Box>
      ) : (
        <>
          <Grid container spacing={2.5}>
            {currentBooks.map((book) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={book.Book_ID}>
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
                  {/* Dynamic placeholder thumbnail */}
                  <Box
                    component="img"
                    src={`https://placehold.co/600x160/EEE/555?text=${encodeURIComponent((book.Title||'Book').slice(0,50))}`}
                    alt={book.Title ? `Placeholder for ${book.Title}` : 'Book cover placeholder'}
                    sx={{
                      height: 120,
                      width: '100%',
                      objectFit: 'cover',
                      borderBottom: theme => `1.5px solid ${theme.palette.divider}`
                    }}
                  />

                  {/* Content */}
                  <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75, flexGrow: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={800}
                      title={book.Title}
                      sx={{ lineHeight: 1.1, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
                    >
                      {book.Title || 'Untitled Book'}
                    </Typography>
                    <Stack spacing={0.25} sx={{ fontSize: 12 }}>
                      <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary"><strong>Author:</strong> {book.Author || '—'}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary"><strong>Publisher:</strong> {book.Publisher || '—'}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary"><strong>Year:</strong> {book.Year || '—'}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary"><strong>ISBN:</strong> {book.ISBN || '—'}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 11 }} color="text.secondary"><strong>Subject:</strong> {book.Subject || '—'}</Typography>
                    </Stack>
                    {/* Tags */}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5}>
                      <Chip size="small" variant="outlined" label={`Ed: ${book.Edition || '—'}`} sx={{ fontSize: 10, fontWeight: 600, borderRadius: 0.5 }} />
                      <Chip size="small" color="info" label={book.Language || 'Lang?'} sx={{ fontSize: 10, fontWeight: 600, borderRadius: 0.5 }} />
                      <Chip size="small" color="primary" label={`Copies ${book.inventory?.length || 0}`} sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.5 }} />
                    </Stack>
                    {book.inventory?.length > 0 && (
                      <Typography variant="overline" sx={{ mt: 1, fontSize: 10, letterSpacing: 0.5, opacity: 0.75 }}>
                        Inventory (first 4)
                      </Typography>
                    )}
                    {book.inventory?.length > 0 && (
                      <Stack mt={0.5} spacing={0.5} sx={{ maxHeight: 120, overflowY: 'auto', pr: 0.5 }}>
                        {book.inventory.slice(0,4).map((copy,i)=>(
                          <Stack key={i} direction="row" spacing={0.5} sx={{ alignItems:'center' }}>
                            <Chip size="small" label={copy.availability || copy.Availability || '—'} color={(copy.availability || copy.Availability) === 'Available' ? 'success' : 'warning'} sx={{ height:20, fontSize:10, fontWeight:600 }} />
                            <Chip size="small" variant="outlined" label={copy.condition || copy.Condition || 'Cond?'} sx={{ height:20, fontSize:10, fontWeight:600 }} />
                            <Chip size="small" variant="outlined" label={getLocationName(copy.location)} sx={{ height:20, fontSize:10, fontWeight:600 }} />
                          </Stack>
                        ))}
                        {book.inventory.length > 4 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize:10 }}>
                            +{book.inventory.length - 4} more…
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </Box>

                  {/* Actions */}
                  <Box
                    sx={{
                      px: 1,
                      py: 0.75,
                      borderTop: theme => `1.5px solid ${theme.palette.divider}`,
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}
                  >
                    <Tooltip title="Edit Book">
                      <IconButton
                        size="small"
                        onClick={() => openEditModal(book)}
                        sx={{
                          borderRadius: 0.75,
                          border: theme => `1px solid ${alpha(theme.palette.primary.main,0.4)}`,
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) }
                        }}
                        color="primary"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Grid>
            ))}
            {currentBooks.length === 0 && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    border: theme => `2px dashed ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No books found. Try a different search.
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={Math.ceil(filteredBooks.length / rowsPerPage)}
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
      <BookFormModal
        open={modalOpen}
        onClose={handleClose}
        isEdit={isEdit}
        bookForm={bookForm}
        handleBookChange={handleBookChange}
        initialBookForm={initialBookForm}
        copyForm={copyForm}
        handleCopyChange={handleCopyChange}
        initialCopyForm={initialCopyForm}
        editCopyIndex={editCopyIndex}
        copies={copies}
        setCopyForm={setCopyForm}
        setCopies={setCopies}
        setEditCopyIndex={setEditCopyIndex}
        handleSaveBook={handleSaveBook}
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

export default AdminBookManagementPage;