import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  InputAdornment,
  CircularProgress,
  Divider
} from "@mui/material";
import { Book, Article, Search } from "@mui/icons-material";

const BrowseLibraryPage = () => {
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [tab, setTab] = useState(0);
  const [books, setBooks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [searchKey, setSearchKey] = useState("All");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, docsRes] = await Promise.all([
        axios.get(`${API_BASE}/books`),
        axios.get(`${API_BASE}/documents`)
      ]);
      setBooks(booksRes.data || []);
      setDocuments(docsRes.data || []);
    } catch {
      setBooks([]);
      setDocuments([]);
    }
    setLoading(false);
  };

  const handleTabChange = (_, v) => setTab(v);

  const filterItems = (items, allKeys) => {
    return items.filter(item => {
      if (!search) return true;
      if (searchKey === "All") {
        return allKeys.some(key =>
          (item[key] || "").toLowerCase().includes(search.toLowerCase())
        );
      } else {
        return (item[searchKey] || "").toLowerCase().includes(search.toLowerCase());
      }
    });
  };

  const renderDetails = (item, isBook) => (
    <Box>
      <Box
        sx={{
          width: "100%",
          height: 120,
          background: "#e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
          borderRadius: 2,
          overflow: "hidden"
        }}
      >
        <img
          src={
            isBook
              ? "https://placehold.co/400x120?text=Book+Cover"
              : "https://placehold.co/400x120?text=PDF+Document"
          }
          alt={isBook ? "Book Cover" : "PDF Document"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>

      {isBook ? (
        <>
          <Typography variant="body2"><b>Author:</b> {item.Author}</Typography>
          <Typography variant="body2"><b>Publisher:</b> {item.Publisher}</Typography>
          <Typography variant="body2"><b>ISBN:</b> {item.ISBN}</Typography>
          <Typography variant="body2"><b>Year:</b> {item.Year}</Typography>
          <Typography variant="body2"><b>Edition:</b> {item.Edition}</Typography>
        </>
      ) : (
        <>
          <Typography variant="h6" fontWeight={700}>{item.Title}</Typography>
          <Typography variant="body2">{item.Author || "N/A"}</Typography>
          <Typography variant="body2">{item.Category || "Other"} • {item.Year || "N/A"}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>Dept:</b> {item.Department || "N/A"}
          </Typography>
          <Typography variant="body2">
            <b>Classification:</b> {item.Classification || "N/A"}
          </Typography>
          <Typography variant="body2">
            <b>Sensitivity:</b> {item.Sensitivity || "N/A"}
          </Typography>
        </>
      )}
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={2}>Browse Library</Typography>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <TextField
          placeholder="Search books or documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
          sx={{ width: 350 }}
        />
        <TextField
          select
          label="Filter by"
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
          sx={{ width: 150 }}
          size="small"
          SelectProps={{ native: true }}
        >
          <option value="All">All</option>
          <option value="Title">Title</option>
          <option value="Author">Author</option>
          <option value="Publisher">Publisher</option>
          <option value="ISBN">ISBN</option>
          <option value="Category">Category</option>
        </TextField>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="Books" icon={<Book />} iconPosition="start" />
          <Tab label="Documents" icon={<Article />} iconPosition="start" />
        </Tabs>
      </Stack>
      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {(tab === 0
            ? filterItems(books, ["Title", "Author", "Publisher", "ISBN", "Category", "CallNumber", "Edition", "Description"])
            : filterItems(documents, ["Title", "Type", "Author", "Publisher", "Category", "Description"])
          ).map(item => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.Book_ID || item.Document_ID}>
              <Card sx={{ borderRadius: 3, boxShadow: 4, height: "100%" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    {tab === 0 ? <Book color="primary" /> : <Article color="secondary" />}
                    <Typography variant="h6" fontWeight={600}>
                      {item.Title}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  {renderDetails(item, tab === 0)}
                  <Chip
                    label={tab === 0 ? "Book" : "Document"}
                    color={tab === 0 ? "primary" : "secondary"}
                    size="small"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
          {(tab === 0
            ? filterItems(books, ["Title", "Author", "Publisher", "ISBN", "Category", "CallNumber", "Edition", "Description"])
            : filterItems(documents, ["Title", "Type", "Author", "Publisher", "Category", "Description"])
          ).length === 0 && (
            <Grid item xs={12}>
              <Box textAlign="center" py={6}>
                <Typography color="text.secondary">No {tab === 0 ? "books" : "documents"} found.</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default BrowseLibraryPage;
