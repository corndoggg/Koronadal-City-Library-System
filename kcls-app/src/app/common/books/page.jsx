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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse
  , TableSortLabel
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
  const rowsPerPage = 24;
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
  const [expandedRows, setExpandedRows] = useState({});

  const [sortBy, setSortBy] = useState('Title');
  const [sortDir, setSortDir] = useState('asc');

  const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

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
              updatedOn: copy.UpdatedOn || copy.updatedOn || copy.updated_on || copy.Updated_On || null,
              lostOn: copy.LostOn || copy.lostOn || copy.Lost_On || copy.lost_on || null
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

  const sortedBooks = useMemo(() => {
    const arr = [...(filteredBooks || [])];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'Copies') {
        return ((a.inventory || []).length - (b.inventory || []).length) * dir;
      }
      const va = (a[sortBy] || '').toString().toLowerCase();
      const vb = (b[sortBy] || '').toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filteredBooks, sortBy, sortDir]);

  const currentBooks = sortedBooks.slice(indexOfFirst, indexOfLast);

  const handleSort = (column) => {
    if (sortBy === column) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortDir('asc'); }
  };

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
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><TableSortLabel active={sortBy === 'Title'} direction={sortDir} onClick={() => handleSort('Title')}>Title</TableSortLabel></TableCell>
                  <TableCell><TableSortLabel active={sortBy === 'Author'} direction={sortDir} onClick={() => handleSort('Author')}>Author</TableSortLabel></TableCell>
                  <TableCell><TableSortLabel active={sortBy === 'Edition'} direction={sortDir} onClick={() => handleSort('Edition')}>Edition</TableSortLabel></TableCell>
                  <TableCell><TableSortLabel active={sortBy === 'Copies'} direction={sortDir} onClick={() => handleSort('Copies')}>Copies</TableSortLabel></TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentBooks.map(book => {
                  const copiesList = book.inventory || [];
                  const isOpen = !!expandedRows[book.Book_ID];
                  return (
                    <React.Fragment key={book.Book_ID}>
                      <TableRow hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{book.Title || 'Untitled Book'}</Typography>
                          <Typography variant="caption" color="text.secondary">{book.ISBN || ''}</Typography>
                        </TableCell>
                        <TableCell>{book.Author || '—'}</TableCell>
                        <TableCell>{book.Edition || '—'}</TableCell>
                        <TableCell>{copiesList.length}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit book"><IconButton size="small" onClick={() => openEditModal(book)}><Edit fontSize="small" /></IconButton></Tooltip>
                            {copiesList.length > 0 && (
                              <Button size="small" onClick={() => toggleRow(book.Book_ID)}>{isOpen ? 'Hide copies' : `Show copies (${copiesList.length})`}</Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                      {copiesList.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ p: 0 }}>
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
                                    {copiesList.map((copy, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>{copy.availability || copy.Availability || 'Unknown'}</TableCell>
                                        <TableCell>{copy.condition || copy.Condition || '—'}</TableCell>
                                        <TableCell>{getLocationName(copy.location ?? copy.Location ?? copy.Location_ID ?? copy.location_id ?? copy.LocationName)}</TableCell>
                                        <TableCell>{
                                          copy.accessionNumber || copy.AccessionNumber || copy.Accession_No || copy.Accession || copy.Copy_Number || copy.CopyNo || copy.Copy_ID || '—'
                                        }</TableCell>
                                        <TableCell>{copy.updatedOn ? formatDate(copy.updatedOn) : '—'}</TableCell>
                                        <TableCell>{copy.lostOn ? formatDate(copy.lostOn) : '—'}</TableCell>
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