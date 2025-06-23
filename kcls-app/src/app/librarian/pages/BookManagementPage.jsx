import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, IconButton, useTheme,
  Pagination, Snackbar, Alert, Stack, Tooltip, Grid, Card, CardContent, CardActions, CardMedia, Chip
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
          const invRes = await axios.get(`${API_BASE}/inventory/${book.Book_ID}`);
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
        if (copy.Copy_ID) {
          await axios.put(`${API_BASE}/inventory/${bookId}/${copy.Copy_ID}`, copy);
        } else {
          await axios.post(`${API_BASE}/inventory/${bookId}`, copy);
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
    setEditId(book.Book_ID);
    setBookForm({
      title: book.Title,
      author: book.Author,
      edition: book.Edition,
      publisher: book.Publisher,
      year: book.Year,
      subject: book.Subject,
      language: book.Language,
      isbn: book.ISBN,
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

  // Placeholder image for book cover
  const placeholderImg = "https://placehold.co/400x180?text=Book+Cover";

  return (
    <Box p={3} sx={{ position: 'relative', minHeight: '100vh' }}>
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
        {/* Search Field at top right */}
        <TextField
          label="Search by title, author, ISBN..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 350 }}
        />
      </Box>

      {/* Book Cards Grid */}
      <Grid container spacing={3}>
        {currentBooks.map((book) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={book.Book_ID}>
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
              <CardMedia
                component="img"
                src={placeholderImg}
                alt="Book Cover"
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
                  {book.Title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {book.Author}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {book.Publisher} &bull; {book.Year}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Subject: {book.Subject}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Language: {book.Language}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  ISBN: {book.ISBN}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={`Copies: ${book.inventory?.length || 0}`}
                    color="primary"
                    size="small"
                  />
                </Box>
                {/* Show up to 2 copies as a preview */}
                {book.inventory?.slice(0, 2).map((copy, idx) => (
                  <Box key={idx} sx={{ mt: 1, pl: 1, borderLeft: '2px solid #eee' }}>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      <strong>Accession #:</strong> {copy.accessionNumber}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      <strong>Location:</strong> {copy.location}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      <strong>Condition:</strong> {copy.condition}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: 13 }}
                      color={copy.availability === 'Available' ? 'green' : 'orange'}
                    >
                      <strong>{copy.availability}</strong>
                    </Typography>
                  </Box>
                ))}
                {book.inventory && book.inventory.length > 2 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    +{book.inventory.length - 2} more copies...
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pb: 2 }}>
                <Tooltip title="Edit Book">
                  <IconButton onClick={() => openEditModal(book)} color="primary">
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {currentBooks.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.secondary">
                No books found. Try a different search.
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={Math.ceil(filteredBooks.length / rowsPerPage)}
          page={currentPage}
          onChange={(e, page) => setCurrentPage(page)}
          color="primary"
        />
      </Box>

      {/* Floating Add Book Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={openAddModal}
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