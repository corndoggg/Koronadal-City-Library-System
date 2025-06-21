import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, useTheme,
  Pagination, Snackbar, Alert, Stack, Tooltip
} from '@mui/material';
import { Edit, Add, Book } from '@mui/icons-material';
import BookFormModal from '../../../components/librarian/books/BookFormModal';

const initialBookForm = {
  title: '',
  author: '',
  edition: '',
  publisher: '',
  year: '',
  subject: '',
  language: '',
  isbn: '',
};

const initialCopyForm = {
  accessionNumber: '',
  availability: 'Available',
  physicalStatus: '',
  condition: '',
  location: '',
};

const BookManagementPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const API_BASE = 'https://api.koronadal-library.site/api';

  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [copyForm, setCopyForm] = useState(initialCopyForm);
  const [copies, setCopies] = useState([]);
  const [editCopyIndex, setEditCopyIndex] = useState(null);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [search, books]);

  const fetchBooks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/books`);
      const booksWithInventory = await Promise.all(
        res.data.map(async (book) => {
          const invRes = await axios.get(`${API_BASE}/books/${book.id}/inventory`);
          return { ...book, inventory: invRes.data };
        })
      );
      setBooks(booksWithInventory);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      showToast('Failed to load books', 'error');
    }
  };


  const handleSearch = () => {
    const lowerSearch = search.toLowerCase();
    const filtered = books.filter(book =>
      Object.values(book).some(
        value => typeof value === 'string' && value.toLowerCase().includes(lowerSearch)
      ) ||
      book.inventory?.some(copy =>
        Object.values(copy).some(
          val => typeof val === 'string' && val.toLowerCase().includes(lowerSearch)
        )
      )
    );
    setFilteredBooks(filtered);
    setCurrentPage(1);
  };

  const handleBookChange = (e) => {
    const { name, value } = e.target;
    setBookForm({ ...bookForm, [name]: name === 'year' ? parseInt(value) || '' : value });
  };

  const handleCopyChange = (e) => {
    setCopyForm({ ...copyForm, [e.target.name]: e.target.value });
  };

  const handleAddCopy = () => {
    if (copyForm.accessionNumber && copyForm.location) {
      const updated = [...copies];
      if (editCopyIndex !== null) {
        updated[editCopyIndex] = copyForm;
        setEditCopyIndex(null);
        showToast('Copy updated');
      } else {
        updated.push(copyForm);
        showToast('Copy added');
      }
      setCopies(updated);
      setCopyForm(initialCopyForm);
    } else {
      showToast('Accession Number and Location are required', 'error');
    }
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
        if (copy.id) {
          await axios.put(`${API_BASE}/books/${bookId}/inventory/${copy.id}`, copy);
        } else {
          await axios.post(`${API_BASE}/books/${bookId}/inventory`, copy);
        }
      }

      await fetchBooks();
      handleClose();
    } catch (error) {
      console.error('Error saving book:', error);
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

  const openEditModal = (book) => {
    setIsEdit(true);
    setEditId(book.id);
    setBookForm({
      title: book.title,
      author: book.author,
      edition: book.edition,
      publisher: book.publisher,
      year: book.year,
      subject: book.subject,
      language: book.language,
      isbn: book.isbn,
    });
    setCopies(book.inventory || []);
    setCopyForm(initialCopyForm);
    setModalOpen(true);
  };


  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirst, indexOfLast);

  return (
    <Box p={3}>
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Book fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>
            Book Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openAddModal}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          Add Book
        </Button>
      </Box>

      {/* Search Field */}
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          label="Search by title, author, ISBN..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 350 }}
        />
      </Stack>

      {/* Book Table */}
      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: theme.palette.primary.light, color: '#fff' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Author</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Publisher</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Copies</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentBooks.map((book) => (
              <React.Fragment key={book.Book_ID || book.id}>
                <TableRow hover sx={{ transition: 'all 0.2s' }}>
                  <TableCell>{book.Title}</TableCell>
                  <TableCell>{book.Author}</TableCell>
                  <TableCell>{book.Publisher}</TableCell>
                  <TableCell>{book.Year}</TableCell>
                  <TableCell>{book.inventory?.length || 0}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Book">
                      <IconButton onClick={() => openEditModal(book)} color="primary">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>

                {/* Inventory rows */}
                {book.inventory?.map((copy, index) => (
                  <TableRow key={index} sx={{ backgroundColor: isDark ? '#2b2b2b' : '#f9f9f9' }}>
                    <TableCell colSpan={2} sx={{ pl: 5 }}>
                      <Typography variant="body2">
                        <strong>Accession #:</strong> {copy.accessionNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <strong>Location:</strong> {copy.location}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <strong>Condition:</strong> {copy.condition}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={copy.availability === 'Available' ? 'green' : 'orange'}
                      >
                        <strong>{copy.availability}</strong>
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </React.Fragment>
            ))}

            {currentBooks.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No books found. Try a different search.
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
          count={Math.ceil(filteredBooks.length / rowsPerPage)}
          page={currentPage}
          onChange={(e, page) => setCurrentPage(page)}
          color="primary"
        />
      </Box>

      {/* Modals and Snackbar */}
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
        handleAddCopy={handleAddCopy}
        editCopyIndex={editCopyIndex}
        copies={copies}
        setCopyForm={setCopyForm}
        setCopies={setCopies}
        setEditCopyIndex={setEditCopyIndex}
        handleSaveBook={handleSaveBook}
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

export default BookManagementPage;