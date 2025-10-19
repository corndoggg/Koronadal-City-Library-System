import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  useTheme,
  Pagination,
  Snackbar,
  Alert,
  Tooltip,
  Grid,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Divider,
  InputAdornment,
  LinearProgress
} from '@mui/material';
import { Edit, Book, Add, Search, Refresh, LibraryBooks } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import BookFormModal from '../../../components/BookFormModal.jsx';
import { formatDate } from '../../../utils/date';

const initialBookForm = { title: '', author: '', edition: '', publisher: '', year: '', subject: '', language: '', isbn: '' };
const initialCopyForm = { accessionNumber: '', availability: 'Available', condition: '', location: '' };

const BookManagementPage = () => {
  const theme = useTheme();
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [copyForm, setCopyForm] = useState(initialCopyForm);
  const [copies, setCopies] = useState([]);
  const [editCopyIndex, setEditCopyIndex] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  const showToast = useCallback((message, severity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/books`);
      const booksWithInventory = await Promise.all(
        (res.data || []).map(async book => {
          try {
            const invRes = await axios.get(`${API_BASE}/books/inventory/${book.Book_ID}`);
            const inventory = (invRes.data || []).map(copy => ({
              ...copy,
              location:
                copy.location !== null && copy.location !== undefined
                  ? String(copy.location)
                  : copy.Location_ID !== null && copy.Location_ID !== undefined
                  ? String(copy.Location_ID)
                  : '',
              updatedOn: copy.UpdatedOn || copy.updatedOn || copy.updated_on || copy.Updated_On || null
            }));
            return { ...book, inventory };
          } catch {
            return { ...book, inventory: [] };
          }
        })
      );
      setBooks(booksWithInventory);
    } catch {
      showToast('Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, showToast]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/storages`);
      setLocations(res.data || []);
    } catch {
      setLocations([]);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchBooks();
    fetchLocations();
  }, [fetchBooks, fetchLocations]);

  const handleSearch = useCallback(() => {
    const lower = search.toLowerCase();
    setFilteredBooks(
      books.filter(book =>
        Object.values(book).some(val => typeof val === 'string' && val.toLowerCase().includes(lower)) ||
        (book.inventory || []).some(copy =>
          Object.values(copy).some(val => typeof val === 'string' && val.toLowerCase().includes(lower))
        )
      )
    );
    setCurrentPage(1);
  }, [books, search]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleBookChange = event => {
    const { name, value } = event.target;
    setBookForm(prev => ({
      ...prev,
      [name]: name === 'year' ? (value === '' ? '' : parseInt(value, 10) || '') : value
    }));
  };

  const handleCopyChange = event => {
    const { name, value } = event.target;
    setCopyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBook = async () => {
    try {
      let bookId;
      if (isEdit) {
        await axios.put(`${API_BASE}/books/${editId}`, bookForm);
        bookId = editId;
        showToast('Book updated');
      } else {
        const res = await axios.post(`${API_BASE}/books`, bookForm);
        bookId = res.data.book_id;
        showToast('Book added');
      }

      for (const copy of copies) {
        const parsedLocation = parseInt(copy.location, 10);
        if (!copy.location || Number.isNaN(parsedLocation)) continue;
        const payload = { ...copy, location: parsedLocation };
        if (copy.Copy_ID) {
          await axios.put(`${API_BASE}/books/inventory/${bookId}/${copy.Copy_ID}`, payload);
        } else {
          await axios.post(`${API_BASE}/books/inventory/${bookId}`, payload);
        }
      }

      await fetchBooks();
      handleClose();
    } catch {
      showToast('Failed to save book', 'error');
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setIsEdit(false);
    setBookForm(initialBookForm);
    setCopyForm(initialCopyForm);
    setCopies([]);
    setEditCopyIndex(null);
  };

  const openAddModal = () => {
    setIsEdit(false);
    setBookForm(initialBookForm);
    setCopyForm(initialCopyForm);
    setCopies([]);
    setModalOpen(true);
  };

  const openEditModal = book => {
    setIsEdit(true);
    setEditId(book.Book_ID);
    setBookForm({
      title: book.Title,
      author: book.Author,
      edition: book.Edition,
      publisher: book.Publisher,
      year: book.Year,
      subject: book.Subject,
      language: book.Language,
      isbn: book.ISBN
    });
    setCopies(
      (book.inventory || []).map(copy => ({
        ...copy,
        location:
          copy.location !== null && copy.location !== undefined
            ? String(copy.location)
            : copy.Location_ID !== null && copy.Location_ID !== undefined
            ? String(copy.Location_ID)
            : ''
      }))
    );
    setCopyForm(initialCopyForm);
    setModalOpen(true);
  };

  const bookStats = useMemo(() => {
    let totalCopies = 0;
    let availableCopies = 0;
    let borrowedCopies = 0;
    let reservedCopies = 0;
    let lostCopies = 0;
    const subjectSet = new Set();
    const languageSet = new Set();

    for (const book of books) {
      if (book.Subject) subjectSet.add(book.Subject);
      if (book.Language) languageSet.add(book.Language);

      const inventory = book.inventory || [];
      totalCopies += inventory.length;

      for (const copy of inventory) {
        const availability = (copy.availability || copy.Availability || '').toLowerCase();
        if (availability === 'available') availableCopies += 1;
        else if (availability === 'borrowed') borrowedCopies += 1;
        else if (availability === 'reserved') reservedCopies += 1;
        else if (availability === 'lost') lostCopies += 1;
      }
    }

    return {
      totalBooks: books.length,
      totalCopies,
      availableCopies,
      borrowedCopies,
      reservedCopies,
      lostCopies,
      subjectCount: subjectSet.size,
      languageCount: languageSet.size
    };
  }, [books]);

  const {
    totalBooks,
    totalCopies,
    borrowedCopies,
    lostCopies
  } = bookStats;
  // Summary cards removed per project design guidance; inline chips used instead

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirst, indexOfLast);

  const getLocationName = useCallback(
    value => {
      if (!value && value !== 0) return '-';
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue) && value !== '' && value !== null) {
        const found = locations.find(loc => String(loc.ID) === String(value));
        if (found) return found.Name;
      }
      return String(value);
    },
    [locations]
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Book />
                <Typography variant="subtitle1" fontWeight={700}>Collection workspace</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Search and manage physical titles; inventory counts are shown inline.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Search title, author, or ISBN"
                value={search}
                onChange={event => setSearch(event.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>) }}
                sx={{ minWidth: { sm: 220, md: 320 }, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`Titles: ${totalBooks}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip label={`Copies: ${totalCopies}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                <Chip label={`Borrowed: ${borrowedCopies}`} size="small" color={borrowedCopies ? 'warning' : 'default'} variant={borrowedCopies ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
                <Chip label={`Lost: ${lostCopies}`} size="small" color={lostCopies ? 'error' : 'default'} variant={lostCopies ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
                <Tooltip title="Refresh books"><IconButton size="small" onClick={() => { fetchBooks(); fetchLocations(); }} sx={{ borderRadius: 1, border: `1px solid ${alpha(theme.palette.divider, 0.75)}` }}><Refresh fontSize="small" /></IconButton></Tooltip>
                <Button variant="contained" size="small" startIcon={<Add />} onClick={openAddModal} sx={{ borderRadius: 1, fontWeight: 700 }}>Add</Button>
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
              Loading books…
            </Typography>
          </Paper>
        ) : currentBooks.length === 0 ? (
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
              No books found. Try a different search.
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
            {currentBooks.map(book => {
              const copiesList = book.inventory || [];
              return (
                <Paper
                  key={book.Book_ID}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    width: '100%',
                    minHeight: 320,
                    height: 320,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'border-color .18s ease, box-shadow .18s ease',
                    '&:hover': {
                      borderColor: t => t.palette.primary.main,
                      boxShadow: t => `0 10px 32px ${alpha(t.palette.primary.main, 0.18)}`
                    }
                  }}
                >
                  <Box
                    sx={{
                      px: 1.75,
                      py: 1.5,
                      borderBottom: t => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
                      backgroundImage: t =>
                        `linear-gradient(135deg, ${
                          alpha(t.palette.primary.light, t.palette.mode === 'dark' ? 0.35 : 0.18)
                        } 0%, ${
                          alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.35 : 0.24)
                        } 100%)`
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          bgcolor: t => t.palette.background.paper,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: t => `0 6px 12px ${alpha(t.palette.primary.main, 0.25)}`
                        }}
                      >
                        <LibraryBooks fontSize="small" color="primary" />
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={800}
                          title={book.Title}
                          sx={{
                            lineHeight: 1.1,
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            overflow: 'hidden'
                          }}
                        >
                          {book.Title || 'Untitled Book'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          {book.Author || 'Author unknown'}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={book.Language || 'Language?'}
                        color={book.Language ? 'secondary' : 'default'}
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
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Edition: ${book.Edition || '—'}`}
                        sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Publisher: ${book.Publisher || '—'}`}
                        sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Year: ${book.Year || '—'}`}
                        sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Subject: ${book.Subject || '—'}`}
                        sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`ISBN: ${book.ISBN || '—'}`}
                        sx={{ fontWeight: 600, borderRadius: 0.75, fontSize: 10 }}
                      />
                    </Stack>

                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      {copiesList.length > 0 ? (
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
                          {copiesList.slice(0, 4).map((copy, index) => {
                            const availability = (copy.availability || copy.Availability || '').toLowerCase();
                            const availabilityColor =
                              availability === 'available'
                                ? 'success'
                                : availability === 'borrowed'
                                ? 'warning'
                                : availability === 'reserved'
                                ? 'info'
                                : availability === 'lost'
                                ? 'error'
                                : 'default';
                            const locationLabel = getLocationName(
                              copy.location ?? copy.Location ?? copy.Location_ID ?? copy.location_id ?? copy.LocationName
                            );

                            return (
                              <Stack key={index} direction="row" spacing={0.5} alignItems="center">
                                <Chip
                                  size="small"
                                  label={copy.availability || copy.Availability || 'Unknown'}
                                  color={availabilityColor}
                                  sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: 0.75 }}
                                />
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={copy.condition || copy.Condition || 'Cond?'}
                                  sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: 0.75 }}
                                />
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={locationLabel}
                                  sx={{ height: 20, fontSize: 10, fontWeight: 600, borderRadius: 0.75 }}
                                />
                                {copy.updatedOn ? (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, ml: 0.5 }}>
                                    Updated: {formatDate(copy.updatedOn)}
                                  </Typography>
                                ) : null}
                              </Stack>
                            );
                          })}
                          {copiesList.length > 4 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                              +{copiesList.length - 4} additional copies…
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
                    <Tooltip title="Edit book">
                      <IconButton
                        size="small"
                        onClick={() => openEditModal(book)}
                        sx={{
                          borderRadius: 0.75,
                          border: t => `1px solid ${alpha(t.palette.secondary.main, 0.35)}`,
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
            count={Math.max(1, Math.ceil(filteredBooks.length / rowsPerPage))}
            page={currentPage}
            onChange={(event, page) => setCurrentPage(page)}
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
      </Stack>
    </Box>
  );
};

export default BookManagementPage;