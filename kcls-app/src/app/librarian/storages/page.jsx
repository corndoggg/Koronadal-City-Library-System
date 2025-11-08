import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, useTheme, Chip, Stack, CircularProgress, InputAdornment,
  Skeleton, MenuItem, Tabs, Tab
  , Checkbox
} from "@mui/material";
import { Add, Edit, Search, Visibility, Refresh, Delete as DeleteIcon, WarningAmber } from "@mui/icons-material";
import { formatDate } from '../../../utils/date';

const initialForm = { name: "", capacity: "" };

const StorageManagementPage = () => {
  const theme = useTheme(), API_BASE = import.meta.env.VITE_API_BASE;
  const conditionOptions = ["Good", "Fair", "Average", "Poor", "Bad", "Lost"]; // standardized
  const availabilityOptions = ["Available", "Borrowed", "Reserved", "Lost"]; // unified
  const [storages, setStorages] = useState([]);
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(false);
  const [docsBooks, setDocsBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(2); // default to Storages view
  const [selectedLost, setSelectedLost] = useState(new Set());
  const [selectedAttention, setSelectedAttention] = useState(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchAction, setBatchAction] = useState(null); // 'recover' | 'move'
  const [batchTargetStorage, setBatchTargetStorage] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editInv, setEditInv] = useState(null);
  const [openEditInv, setOpenEditInv] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [viewAllItems, setViewAllItems] = useState([]);
  const [viewAllSearch, setViewAllSearch] = useState("");
  const [viewAllPage, setViewAllPage] = useState(0);
  const rowsPerPage = 10;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchStorages = useCallback(async () => {
    try { setStorages((await axios.get(`${API_BASE}/storages`)).data || []); }
    catch { setStorages([]); }
  }, [API_BASE]);

  const fetchDocsBooks = useCallback(async () => {
    setLoading(true);
    try {
      const booksRes = await axios.get(`${API_BASE}/books`);
      const booksWithInventory = await Promise.all(
        (booksRes.data || []).map(async (b) => {
          const invRes = await axios.get(`${API_BASE}/books/inventory/${b.Book_ID}`);
            const inventory = (invRes.data || []).map(copy => ({
            ...copy,
            location: copy.StorageLocation != null ? String(copy.StorageLocation) : (copy.location != null ? String(copy.location) : ''),
            accessionNumber: copy.accessionNumber ?? copy.AccessionNumber ?? "",
            availability: copy.availability ?? copy.Availability ?? "",
            condition: copy.condition ?? copy.Condition ?? "",
            updatedOn: copy.UpdatedOn || copy.updatedOn || copy.updated_on || null,
            lostOn: copy.LostOn || copy.lostOn || copy.Lost_On || copy.lost_on || null,
            foundOn: copy.FoundOn || copy.foundOn || copy.Found_On || copy.found_on || null
          }));
          return { type: "Book", title: b.Title, id: b.Book_ID, inventory };
        })
      );
      const docsRes = await axios.get(`${API_BASE}/documents`);
      const docsWithInventory = await Promise.all(
        (docsRes.data || []).map(async (d) => {
          const invRes = await axios.get(`${API_BASE}/documents/inventory/${d.Document_ID}`);
          const inventory = (invRes.data || []).map(inv => {
            const rawLocation = inv.StorageLocation ?? inv.location ?? inv.Location ?? null;
            return {
              ...inv,
              location: rawLocation != null ? String(rawLocation) : "",
              availability: inv.availability ?? inv.Availability ?? "",
              condition: inv.condition ?? inv.Condition ?? "",
              updatedOn: inv.UpdatedOn || inv.updatedOn || inv.updated_on || null,
              lostOn: inv.LostOn || inv.lostOn || inv.Lost_On || inv.lost_on || null,
              foundOn: inv.FoundOn || inv.foundOn || inv.Found_On || inv.found_on || null
            };
          });
          return { type: "Document", title: d.Title, id: d.Document_ID, inventory };
        })
      );
      setDocsBooks([...booksWithInventory, ...docsWithInventory]);
    } catch { setDocsBooks([]); }
    setLoading(false);
      }, [API_BASE]);

      useEffect(() => { fetchStorages(); fetchDocsBooks(); }, [fetchStorages, fetchDocsBooks]);

  const handleOpen = () => { setForm(initialForm); setIsEdit(false); setOpen(true); };
  const handleEdit = (storage) => { setForm({ name: storage.Name || "", capacity: String(storage.Capacity ?? "") }); setEditId(storage.ID); setIsEdit(true); setOpen(true); };
  const handleClose = () => { setOpen(false); setForm(initialForm); setIsEdit(false); setEditId(null); };
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    const name = form.name?.trim();
    const capacityNum = form.capacity === "" ? 0 : Number(form.capacity);
    if (!name) return setToast({ open: true, message: "Name is required.", severity: "error" });
    if (Number.isNaN(capacityNum) || capacityNum < 0) {
      return setToast({ open: true, message: "Capacity must be a non-negative number.", severity: "error" });
    }
    // duplicate name guard (case-insensitive, excluding current editing id)
    const dup = storages.some(s => s.Name?.toLowerCase().trim() === name.toLowerCase() && (!isEdit || s.ID !== editId));
    if (dup) {
      return setToast({ open: true, message: "A storage with this name already exists.", severity: "error" });
    }
    if (isEdit) {
      const itemsInStorage = itemsByStorage.get(String(editId)) || [];
      const usedCount = itemsInStorage.length;
      if (capacityNum > 0 && usedCount > capacityNum) {
        setToast({
          open: true,
          message: `This storage currently holds ${usedCount} item${usedCount === 1 ? "" : "s"}. Increase the capacity above that value or move items first.`,
          severity: "error"
        });
        return;
      }
    }
    try {
      if (isEdit) {
        await axios.put(`${API_BASE}/storages/${editId}`, { name, capacity: capacityNum });
        setToast({ open: true, message: "Storage updated.", severity: "success" });
      } else {
        await axios.post(`${API_BASE}/storages`, { name, capacity: capacityNum });
        setToast({ open: true, message: "Storage added.", severity: "success" });
      }
      fetchStorages(); handleClose();
    } catch {
      setToast({ open: true, message: "Failed to save storage.", severity: "error" });
    }
  };

  const handleEditInventory = (item, inv) => {
    // ensure defaults for a straightforward edit
    const normalized = {
      ...inv,
      location: inv.StorageLocation != null ? String(inv.StorageLocation) : (inv.location != null ? String(inv.location) : ""),
      availability: inv.availability || inv.Availability || "Available",
      condition: inv.condition || inv.Condition || "Good"
    };
    setEditItem(item);
    setEditInv({
      ...normalized,
      originalAvailability: normalized.availability,
      originalLocation: normalized.location
    });
    setOpenEditInv(true);
  };

  const checkStorageCapacity = async (locationId) => {
    if (!locationId) return { ok: true };
    const loc = storages.find(s => String(s.ID) === String(locationId));
    const capacity = Number(loc?.Capacity ?? 0);
    if (!capacity || capacity <= 0) return { ok: true };
    try {
      const res = await axios.get(`${API_BASE}/storages/${locationId}/usage`);
      const used = Number(res.data?.used ?? 0);
      if (used >= capacity) return { ok: false, capacity, used };
      return { ok: true, capacity, used };
    } catch {
      return { ok: true };
    }
  };
  const handleSaveInventory = async () => {
    if (!editInv) return;
    const originalAvailability = editInv.originalAvailability || editInv.availability || "Available";
    const originalLocation = editInv.originalLocation ?? editInv.location;
    const isBorrowed = originalAvailability === "Borrowed";

    if (isBorrowed) {
      if (editInv.availability && editInv.availability !== originalAvailability) {
        setToast({ open: true, message: "Borrowed items must be returned before adjusting availability.", severity: "warning" });
        return;
      }
      if (editInv.location && editInv.location !== originalLocation) {
        setToast({ open: true, message: "Borrowed items must be returned before moving locations.", severity: "warning" });
        return;
      }
    }

    const nextAvailability = isBorrowed ? originalAvailability : (editInv.availability || "Available");
    const nextLocationValue = isBorrowed ? originalLocation : editInv.location;

    if (!nextLocationValue) {
      setToast({ open: true, message: "Location is required.", severity: "error" });
      return;
    }
    if (!nextAvailability) {
      setToast({ open: true, message: "Availability is required.", severity: "error" });
      return;
    }

    try {
      const locId = parseInt(String(nextLocationValue), 10);
      const normalizedLocation = Number.isNaN(locId) ? String(nextLocationValue) : locId;
      // If moving to a different location, check capacity
      const originalLocId = originalLocation;
      if (String(normalizedLocation) !== String(originalLocId)) {
        const cap = await checkStorageCapacity(normalizedLocation);
        if (!cap.ok) {
          setToast({ open: true, message: `Cannot move item: target location capacity ${cap.capacity} reached (${cap.used}).`, severity: 'error' });
          return;
        }
      }
      const normalizedCondition = editInv.condition || "Good";
      if (editItem.type === "Book") {
        await axios.put(
          `${API_BASE}/books/inventory/${editItem.id}/${editInv.Copy_ID || editInv.id || editInv.ID}`,
          {
            accessionNumber: editInv.accessionNumber,
            availability: nextAvailability,
            condition: normalizedCondition,
            location: normalizedLocation
          }
        );
      } else {
        const docInvKey = editInv.Storage_ID || editInv.storageId || normalizedLocation;
        await axios.put(
          `${API_BASE}/documents/inventory/${editItem.id}/${docInvKey}`,
          {
            availability: nextAvailability,
            condition: normalizedCondition,
            location: normalizedLocation
          }
        );
      }
      setToast({ open: true, message: "Item updated.", severity: "success" });
      setOpenEditInv(false);
      setEditInv(null);
      fetchDocsBooks();
    } catch {
      setToast({ open: true, message: "Failed to update item.", severity: "error" });
    }
  };

  const handleCloseEditInv = () => {
    setOpenEditInv(false);
    setEditInv(null);
    setEditItem(null);
  };

  const allItems = useMemo(() =>
    docsBooks.flatMap(item =>
      (item.inventory || []).map(inv => ({
        type: item.type,
        title: item.title,
        id: item.id,
        storageId: inv.StorageLocation || inv.location,
        accessionNumber: inv.accessionNumber,
        availability: inv.availability,
        condition: inv.condition,
        inv
      }))
    ), [docsBooks]);

  const totalItems = allItems.length;

  const { borrowedCount, lostCount } = useMemo(() => {
    let borrowed = 0;
    let lost = 0;
    allItems.forEach(entry => {
      const availability = (entry.availability || '').toLowerCase();
      if (availability === 'borrowed') borrowed += 1;
      if (availability === 'lost') lost += 1;
    });
    return { borrowedCount: borrowed, lostCount: lost };
  }, [allItems]);

  const storageLookup = useMemo(() => {
    const map = new Map();
    storages.forEach(s => {
      map.set(String(s.ID), s.Name);
    });
    return map;
  }, [storages]);

  const itemsByStorage = useMemo(() => {
    const map = new Map();
    allItems.forEach(item => {
      const key = String(item.storageId ?? "");
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });
    return map;
  }, [allItems]);

  const overCapacityCount = useMemo(() => {
    let count = 0;
    storages.forEach(storage => {
      const capacity = Number(storage.Capacity ?? 0);
      if (capacity > 0) {
        const used = (itemsByStorage.get(String(storage.ID)) || []).length;
        if (used > capacity) count += 1;
      }
    });
    return count;
  }, [storages, itemsByStorage]);

  const attentionItems = useMemo(() => {
    const severityRank = { lost: 0, bad: 1, poor: 2 };
    return allItems
      .filter(item => {
        const condition = (item.condition || "").toLowerCase();
        const availability = (item.availability || "").toLowerCase();
        // Exclude items that are already lost from the attentionItems list
        if (availability === 'lost' || condition === 'lost') return false;
        return condition === "bad" || condition === "poor" || availability === "lost";
      })
      .map(item => {
        const condition = (item.condition || "").toLowerCase();
        const availability = (item.availability || "").toLowerCase();
        const severityKey = condition === "lost" || availability === "lost"
          ? severityRank.lost
          : severityRank[condition] ?? 3;
        return {
          ...item,
          storageName: storageLookup.get(String(item.storageId ?? "")) || "Unassigned",
          severityKey
        };
      })
      .sort((a, b) => a.severityKey - b.severityKey || (a.title || "").localeCompare(b.title || ""));
  }, [allItems, storageLookup]);

  // Lost items block: items explicitly marked lost, includes LostOn date when available
  const lostItems = useMemo(() => {
    return allItems
      .filter(item => {
        const availability = (item.availability || '').toLowerCase();
        const condition = (item.condition || '').toLowerCase();
        return availability === 'lost' || condition === 'lost';
      })
      .map(item => ({
        ...item,
        storageName: storageLookup.get(String(item.storageId ?? "")) || 'Unassigned',
        lostOn: item.inv?.lostOn || item.inv?.LostOn || item.inv?.lost_on || null,
        foundOn: item.inv?.foundOn || item.inv?.FoundOn || item.inv?.found_on || null
      }))
      .sort((a, b) => (b.lostOn || '').localeCompare(a.lostOn || ''));
  }, [allItems, storageLookup]);

  const filteredAttentionItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attentionItems;
    return attentionItems.filter(item => {
      const title = (item.title || "").toLowerCase();
      const accession = (item.accessionNumber || "").toLowerCase();
      const availability = (item.availability || "").toLowerCase();
      const condition = (item.condition || "").toLowerCase();
      const storageName = (item.storageName || "").toLowerCase();
      const type = (item.type || "").toLowerCase();
      return (
        title.includes(q) ||
        accession.includes(q) ||
        availability.includes(q) ||
        condition.includes(q) ||
        storageName.includes(q) ||
        type.includes(q)
      );
    });
  }, [attentionItems, search]);

  const filteredLostItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lostItems;
    return lostItems.filter(item => {
      const title = (item.title || "").toLowerCase();
      const accession = (item.accessionNumber || "").toLowerCase();
      const availability = (item.availability || "").toLowerCase();
      const condition = (item.condition || "").toLowerCase();
      const storageName = (item.storageName || "").toLowerCase();
      const type = (item.type || "").toLowerCase();
      const lostOn = (item.lostOn || "").toLowerCase();
      return (
        title.includes(q) ||
        accession.includes(q) ||
        availability.includes(q) ||
        condition.includes(q) ||
        storageName.includes(q) ||
        type.includes(q) ||
        lostOn.includes(q)
      );
    });
  }, [lostItems, search]);

  const clearSelections = () => {
    setSelectedLost(new Set());
    setSelectedAttention(new Set());
  };

  const toggleLostSelection = (id) => {
    setSelectedLost(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAttentionSelection = (key) => {
    setSelectedAttention(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAllLost = (checked) => {
    if (!checked) return setSelectedLost(new Set());
    setSelectedLost(new Set((filteredLostItems || []).map(it => `${it.type}-${it.id}-${it.inv?.ID ?? it.inv?.Copy_ID ?? it.inv?.id ?? ''}`)));
  };

  const selectAllAttention = (checked) => {
    if (!checked) return setSelectedAttention(new Set());
    setSelectedAttention(new Set((filteredAttentionItems || []).map(it => `${it.type}-${it.id}-${it.inv?.ID ?? it.inv?.Copy_ID ?? it.inv?.id ?? ''}`)));
  };

  const openBatchDialog = (action) => {
    setBatchAction(action);
    setBatchTargetStorage("");
    setBatchDialogOpen(true);
  };

  const closeBatchDialog = () => {
    setBatchDialogOpen(false);
    setBatchAction(null);
    setBatchTargetStorage("");
  };

  // Helper to perform per-item update
  const performInventoryUpdate = async (item, invKey, payload) => {
    if (item.type === 'Book') {
      return axios.put(`${API_BASE}/books/inventory/${item.id}/${invKey}`, payload);
    }
    const docInvKey = invKey;
    return axios.put(`${API_BASE}/documents/inventory/${item.id}/${docInvKey}`, payload);
  };

  const handleConfirmBatch = async () => {
    if (!batchAction) return closeBatchDialog();
    try {
      if (batchAction === 'recover') {
        const ids = Array.from(selectedLost);
        if (!ids.length) { setToast({ open: true, message: 'No items selected.', severity: 'info' }); return; }
        let success = 0, failed = 0;
        for (const key of ids) {
          // key format: type-id-invId
          const parts = key.split('-');
          const type = parts[0];
          const id = parts[1];
          const invId = parts.slice(2).join('-');
          // find the item from lostItems
          const item = lostItems.find(it => String(it.type) === String(type) && String(it.id) === String(id) && String(it.inv?.ID ?? it.inv?.Copy_ID ?? it.inv?.id ?? '') === String(invId));
          if (!item) { failed++; continue; }
          // If borrowed, skip
          if ((item.availability || '').toLowerCase() === 'borrowed') { failed++; continue; }
          const invKey = item.inv?.Copy_ID || item.inv?.id || item.inv?.ID || item.inv?.Storage_ID || item.inv?.storageId || '';
          const payload = { availability: 'Available' };
          if (batchTargetStorage) payload.location = Number.isNaN(Number(batchTargetStorage)) ? batchTargetStorage : Number(batchTargetStorage);
          try {
            await performInventoryUpdate(item, invKey, payload);
            success++;
          } catch { failed++; }
        }
        setToast({ open: true, message: `Recovered ${success} items${failed ? `, ${failed} failed` : ''}.`, severity: failed ? 'warning' : 'success' });
        clearSelections();
        closeBatchDialog();
        fetchDocsBooks();
        return;
      }

      if (batchAction === 'move') {
        const ids = Array.from(selectedAttention);
        if (!ids.length) { setToast({ open: true, message: 'No items selected.', severity: 'info' }); return; }
        if (!batchTargetStorage) { setToast({ open: true, message: 'Select a target storage.', severity: 'error' }); return; }
        // capacity check: count how many items need moving (not already in target)
        const targetId = batchTargetStorage;
        const itemsToMove = ids.map(key => {
          const parts = key.split('-');
          const type = parts[0];
          const id = parts[1];
          const invId = parts.slice(2).join('-');
          return attentionItems.find(it => String(it.type) === String(type) && String(it.id) === String(id) && String(it.inv?.ID ?? it.inv?.Copy_ID ?? it.inv?.id ?? '') === String(invId));
        }).filter(Boolean);
        const movesNeeded = itemsToMove.filter(it => String(it.storageId) !== String(targetId)).length;
        const loc = storages.find(s => String(s.ID) === String(targetId));
        const capacity = Number(loc?.Capacity ?? 0);
        if (capacity > 0) {
          try {
            const res = await axios.get(`${API_BASE}/storages/${targetId}/usage`);
            const used = Number(res.data?.used ?? 0);
            if (used + movesNeeded > capacity) {
              setToast({ open: true, message: `Cannot move: target capacity ${capacity} would be exceeded. (${used}/${capacity} used)`, severity: 'error' });
              return;
            }
          } catch (err) { console.warn('capacity check failed', err); }
        }

        let success = 0, failed = 0;
        for (const item of itemsToMove) {
          if (!item) { failed++; continue; }
          if ((item.availability || '').toLowerCase() === 'borrowed') { failed++; continue; }
          const invKey = item.inv?.Copy_ID || item.inv?.id || item.inv?.ID || item.inv?.Storage_ID || item.inv?.storageId || '';
          const payload = { location: Number.isNaN(Number(targetId)) ? targetId : Number(targetId) };
          try {
            await performInventoryUpdate(item, invKey, payload);
            success++;
          } catch { failed++; }
        }
        setToast({ open: true, message: `Moved ${success} items${failed ? `, ${failed} failed` : ''}.`, severity: failed ? 'warning' : 'success' });
        clearSelections();
        closeBatchDialog();
        fetchDocsBooks();
        return;
      }
    } catch {
      setToast({ open: true, message: 'Batch operation failed.', severity: 'error' });
    }
  };

  const handleTabChange = (e, newValue) => setTab(newValue);

  const filteredStorages = useMemo(() => {
    const q = search.toLowerCase();
    return storages.filter(s =>
      s.Name.toLowerCase().includes(q) ||
      allItems.some(i => String(i.storageId) === String(s.ID) &&
        (
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.accessionNumber && i.accessionNumber.toLowerCase().includes(q)) ||
          (i.availability && i.availability.toLowerCase().includes(q)) ||
          (i.condition && i.condition.toLowerCase().includes(q))
        )
      )
    );
  }, [storages, allItems, search]);

  const handleViewAll = (storageId) => {
    setViewAllItems(allItems.filter(i => String(i.storageId) === String(storageId)));
    setViewAllSearch("");
    setViewAllPage(0);
    setViewAllOpen(true);
  };

  const filteredViewAllItems = useMemo(() => {
    const q = viewAllSearch.toLowerCase();
    if (!q) return viewAllItems;
    return viewAllItems.filter(item =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.accessionNumber && item.accessionNumber.toLowerCase().includes(q)) ||
      (item.availability && item.availability.toLowerCase().includes(q)) ||
      (item.condition && item.condition.toLowerCase().includes(q))
    );
  }, [viewAllItems, viewAllSearch]);

  const paginatedViewAll = useMemo(() => {
    const start = viewAllPage * rowsPerPage;
    return filteredViewAllItems.slice(start, start + rowsPerPage);
  }, [filteredViewAllItems, viewAllPage]);

  const totalPages = Math.max(1, Math.ceil(filteredViewAllItems.length / rowsPerPage));
  const pageStart = filteredViewAllItems.length ? viewAllPage * rowsPerPage + 1 : 0;
  const pageEnd = filteredViewAllItems.length ? Math.min(filteredViewAllItems.length, (viewAllPage + 1) * rowsPerPage) : 0;
  const isBorrowedEdit = editInv?.originalAvailability === "Borrowed";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            p: { xs: 2, md: 2.5 }
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Storage workspace
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Manage shelves, track inventory health, and reassign items before issues build up.
                </Typography>
              </Box>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ width: { xs: '100%', md: 'auto' } }}
              >
                <TextField
                  size="small"
                  placeholder={
                    tab === 0
                      ? 'Search lost items (title / accession / storage / date)'
                      : tab === 1
                        ? 'Search items (title / accession / availability / condition)'
                        : 'Search storage, items, or accession'
                  }
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    minWidth: { sm: 220, md: 280 },
                    '& .MuiOutlinedInput-root': { borderRadius: 1 }
                  }}
                />
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                  <Tooltip title="Refresh inventory data">
                    <span>
                      <IconButton
                        onClick={() => { fetchStorages(); fetchDocsBooks(); }}
                        size="small"
                        sx={{
                          borderRadius: 1,
                          border: `1px solid ${theme.palette.divider}`,
                          '&:hover': { bgcolor: theme.palette.action.hover }
                        }}
                      >
                        <Refresh fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={handleOpen}
                    sx={{ borderRadius: 1, fontWeight: 600 }}
                  >
                    Add storage
                  </Button>
                </Stack>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Storages: ${storages.length}`} size="small" variant="outlined" sx={{ borderRadius: 1, fontWeight: 600 }} />
              <Chip label={`Items: ${totalItems}`} size="small" variant="outlined" sx={{ borderRadius: 1, fontWeight: 600 }} />
              <Chip
                label={`Borrowed: ${borrowedCount}`}
                size="small"
                color={borrowedCount ? 'warning' : 'default'}
                variant={borrowedCount ? 'filled' : 'outlined'}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
              <Chip
                label={`Lost: ${lostCount}`}
                size="small"
                color={lostCount ? 'error' : 'default'}
                variant={lostCount ? 'filled' : 'outlined'}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
              <Chip
                label={`Over capacity: ${overCapacityCount}`}
                size="small"
                color={overCapacityCount ? 'error' : 'default'}
                variant={overCapacityCount ? 'filled' : 'outlined'}
                sx={{ borderRadius: 1, fontWeight: 600 }}
              />
              {loading && (
                <Chip
                  icon={<CircularProgress size={14} />}
                  label="Refreshing inventory…"
                  size="small"
                  sx={{ borderRadius: 1, fontWeight: 600 }}
                />
              )}
            </Stack>
          </Stack>
        </Paper>

        <Box sx={{ bgcolor: 'background.paper' }}>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }} variant="fullWidth">
            <Tab label={`Lost (${lostItems.length})`} />
            <Tab label={`Attention (${attentionItems.length})`} />
            <Tab label={`Storages (${storages.length})`} />
          </Tabs>

          {/* Lost items tab */}
          {tab === 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Lost items</Typography>
                    <Typography variant="body2" color="text.secondary">Items that were recorded as lost. Use this view to reconcile or record fines.</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" variant="outlined" disabled={!selectedLost.size} onClick={() => openBatchDialog('recover')} sx={{ borderRadius: 1 }}>Recover selected</Button>
                    <Chip label={`Lost: ${lostItems.length}`} size="small" color={lostItems.length ? 'error' : 'default'} sx={{ borderRadius: 1, fontWeight: 600 }} />
                  </Stack>
                </Stack>
                {filteredLostItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No lost items recorded.</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: '40vh' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ '& th': { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 } }}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                indeterminate={selectedLost.size > 0 && selectedLost.size < filteredLostItems.length}
                                checked={filteredLostItems.length > 0 && selectedLost.size === filteredLostItems.length}
                                onChange={e => selectAllLost(e.target.checked)}
                              />
                            </TableCell>
                            <TableCell>Item</TableCell>
                          <TableCell width={120}>Accession</TableCell>
                          <TableCell width={120}>Storage</TableCell>
                          <TableCell width={140}>Lost On</TableCell>
                          <TableCell width={120} align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredLostItems.map((item, idx) => {
                          const key = `${item.type}-${item.id}-${item.inv?.ID ?? item.inv?.Copy_ID ?? item.inv?.id ?? ''}`;
                          return (
                            <TableRow key={`${item.type}-${item.id}-lost-${idx}`} hover>
                              <TableCell padding="checkbox">
                                <Checkbox size="small" checked={selectedLost.has(key)} onChange={() => toggleLostSelection(key)} />
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" fontWeight={600}>{item.type === 'Book' ? `Book · ${item.title}` : `Document · ${item.title}`}</Typography>
                                  <Typography variant="caption" color="text.secondary">Storage: {item.storageName}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">{item.accessionNumber || '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{item.storageName}</Typography>
                              </TableCell>
                              <TableCell>
                                <Stack>
                                  <Typography variant="body2">{item.lostOn ? formatDate(item.lostOn) : '—'}</Typography>
                                  {item.foundOn ? (
                                    <Typography variant="caption" color="text.secondary">Found: {formatDate(item.foundOn)}</Typography>
                                  ) : null}
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  <Button size="small" variant="outlined" onClick={() => handleEditInventory({ type: item.type, title: item.title, id: item.id }, item.inv)} sx={{ borderRadius: 1, fontWeight: 600 }}>Update</Button>
                                  {((item.availability || '').toLowerCase() === 'lost') && !item.foundOn && (
                                    <Button size="small" color="success" variant="contained" onClick={async () => {
                                      try {
                                        const invKey = item.inv?.Copy_ID || item.inv?.id || item.inv?.ID || item.inv?.Storage_ID || item.inv?.storageId || '';
                                        await performInventoryUpdate(item, invKey, { availability: 'Available' });
                                        setToast({ open: true, message: 'Item marked as found.', severity: 'success' });
                                      } catch {
                                        setToast({ open: true, message: 'Failed to mark item as found.', severity: 'error' });
                                      } finally {
                                        fetchDocsBooks();
                                      }
                                    }} sx={{ borderRadius: 1, fontWeight: 600 }}>Mark found</Button>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Paper>
          )}

          {/* Attention tab */}
          {tab === 1 && (
            <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Items needing attention
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lost, damaged, or poor-condition records appear here so you can move them quickly.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" variant="outlined" disabled={!selectedAttention.size} onClick={() => openBatchDialog('move')} sx={{ borderRadius: 1 }}>Move selected</Button>
                    <Chip
                      icon={<WarningAmber fontSize="small" />}
                      label={search.trim()
                        ? `${filteredAttentionItems.length} of ${attentionItems.length} flagged`
                        : `${attentionItems.length} flagged`}
                      size="small"
                      color={attentionItems.length ? 'warning' : 'default'}
                      sx={{ borderRadius: 1, fontWeight: 600 }}
                    />
                  </Stack>
                </Stack>
                {filteredAttentionItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {attentionItems.length && search.trim()
                      ? 'No flagged items match this search.'
                      : 'All items are currently in good standing.'}
                  </Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: '40vh' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow
                            sx={{ '& th': { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, bgcolor: theme.palette.background.paper } }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                indeterminate={selectedAttention.size > 0 && selectedAttention.size < filteredAttentionItems.length}
                                checked={filteredAttentionItems.length > 0 && selectedAttention.size === filteredAttentionItems.length}
                                onChange={e => selectAllAttention(e.target.checked)}
                              />
                            </TableCell>
                            <TableCell>Item</TableCell>
                            <TableCell width={120}>Condition</TableCell>
                            <TableCell width={120}>Availability</TableCell>
                            <TableCell width={160}>Storage</TableCell>
                            <TableCell width={120} align="right">Action</TableCell>
                          </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAttentionItems.map((item, index) => {
                          const key = `${item.type}-${item.id}-${item.inv?.ID ?? item.inv?.Copy_ID ?? item.inv?.id ?? ''}`;
                          const availability = (item.availability || '').toLowerCase();
                          const conditionLabel = item.condition || '—';
                          const normalizedCondition = (item.condition || '').toLowerCase();
                          return (
                            <TableRow key={`${item.type}-${item.id}-${index}`} hover>
                              <TableCell padding="checkbox">
                                <Checkbox size="small" checked={selectedAttention.has(key)} onChange={() => toggleAttentionSelection(key)} />
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.type === 'Book' ? `Book · ${item.title}` : `Document · ${item.title}`}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Accession: {item.accessionNumber || '—'}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={conditionLabel}
                                  color={normalizedCondition === 'lost' ? 'error' : normalizedCondition === 'bad' ? 'error' : 'warning'}
                                  sx={{ borderRadius: 0.75, fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={item.availability || '—'}
                                  color={availability === 'lost' ? 'error' : availability === 'borrowed' ? 'warning' : 'default'}
                                  sx={{ borderRadius: 0.75, fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.storageName}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleEditInventory({ type: item.type, title: item.title, id: item.id }, item.inv)}
                                  sx={{ borderRadius: 1, fontWeight: 600 }}
                                >
                                  Move item
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Paper>
          )}

          {/* Storages tab */}
          {tab === 2 && (
            <>
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
                    Loading inventory…
                  </Typography>
                  <Box mt={3} display="flex" flexDirection="column" gap={1}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={46} />
                    ))}
                  </Box>
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: theme.palette.divider,
                    overflow: 'hidden',
                    bgcolor: 'background.paper'
                  }}
                >
                  <TableContainer
                    sx={{
                      maxHeight: '65vh',
                      '&::-webkit-scrollbar': { width: 8 },
                      '&::-webkit-scrollbar-thumb': {
                        background: theme.palette.divider,
                        borderRadius: 4
                      }
                    }}
                  >
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow
                          sx={{
                            '& th': {
                              fontWeight: 700,
                              fontSize: 12,
                              letterSpacing: 0.6,
                              bgcolor: theme.palette.background.default,
                              borderBottom: `2px solid ${theme.palette.divider}`,
                              textTransform: 'uppercase'
                            }
                          }}
                        >
                          <TableCell width="35%">Storage</TableCell>
                          <TableCell width="15%" align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody
                        sx={{
                          '& tr:hover': { backgroundColor: theme.palette.action.hover },
                          '& td': { borderBottom: `1px solid ${theme.palette.divider}` }
                        }}
                      >
                        {filteredStorages.map(storage => {
                          const itemsInStorage = itemsByStorage.get(String(storage.ID)) || [];
                          const storageAvailable = itemsInStorage.filter(i => (i.availability || '').toLowerCase() === 'available').length;
                          const usedCount = itemsInStorage.length;
                          const capacity = Number(storage.Capacity ?? 0);
                          const overCapacity = capacity > 0 && usedCount > capacity;
                          return (
                            <TableRow key={storage.ID}>
                              <TableCell>
                                <Stack spacing={0.75}>
                                  <Typography fontWeight={800} fontSize={13} lineHeight={1.1}>
                                    {storage.Name}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    <Chip
                                      size="small"
                                      label={`Items: ${usedCount}`}
                                      sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                                    />
                                    <Chip
                                      size="small"
                                      color="success"
                                      label={`Available: ${storageAvailable}`}
                                      sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                                    />
                                    <Chip
                                      size="small"
                                      color={overCapacity ? 'error' : 'default'}
                                      label={`Capacity: ${capacity || '∞'}${capacity ? ` • Used: ${usedCount}/${capacity}` : ''}`}
                                      sx={{ fontSize: 10, fontWeight: 700, borderRadius: 0.75 }}
                                    />
                                  </Stack>
                                </Stack>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title={`View Items (${itemsInStorage.length})`}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={!itemsInStorage.length}
                                      onClick={() => handleViewAll(storage.ID)}
                                      sx={{
                                        mr: 1,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 0.75,
                                        '&:hover': { bgcolor: theme.palette.action.hover }
                                      }}
                                    >
                                      <Visibility fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Edit Storage">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleEdit(storage)}
                                    sx={{
                                      border: `1px solid ${theme.palette.divider}`,
                                      borderRadius: 0.75,
                                      '&:hover': { bgcolor: theme.palette.action.hover }
                                    }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={itemsInStorage.length ? "Remove all items from this location first" : "Delete Storage"}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      disabled={itemsInStorage.length > 0}
                                      onClick={() => { setDeleteTarget(storage); setDeleteOpen(true); }}
                                      sx={{
                                        ml: 1,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 0.75,
                                        '&:hover': { bgcolor: theme.palette.action.hover }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredStorages.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                              <Typography variant="body2" color="text.secondary">
                                No storage locations found{search ? ' for this search.' : '.'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          )}
        </Box>
      </Stack>

      {/* View All Items Modal */}
      <Dialog
        open={viewAllOpen}
        onClose={() => setViewAllOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: `2px solid ${theme.palette.divider}`
          }}
        >
          Items in Location
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            size="small"
            placeholder="Search items (title / accession / availability / condition)"
            fullWidth
            value={viewAllSearch}
            onChange={e => { setViewAllSearch(e.target.value); setViewAllPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
          />
          <TableContainer
            sx={{
              maxHeight: 360,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 } }}>
                  <TableCell>Item</TableCell>
                  <TableCell width={110}>Accession</TableCell>
                  <TableCell width={110}>Condition</TableCell>
                  <TableCell width={120}>Availability</TableCell>
                  <TableCell width={100} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedViewAll.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No items match this search.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedViewAll.map((item, idx) => {
                    const availability = (item.availability || '').toLowerCase();
                    const conditionLabel = item.condition || '—';
                    const normalizedCondition = (item.condition || '').toLowerCase();
                    return (
                      <TableRow key={`${item.type}-${item.id}-${idx}`} hover>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" fontWeight={600}>
                              {item.type === 'Book' ? `Book · ${item.title}` : `Document · ${item.title}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Storage: {storageLookup.get(String(item.storageId ?? "")) || 'Unassigned'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.accessionNumber || '—'}
                          </Typography>
                          {item.inv && (item.inv.updatedOn || item.inv.UpdatedOn) ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Updated: {formatDate(item.inv.updatedOn || item.inv.UpdatedOn)}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={conditionLabel}
                            color={normalizedCondition === 'lost' ? 'error' : normalizedCondition === 'bad' ? 'error' : normalizedCondition === 'poor' ? 'warning' : 'default'}
                            sx={{ borderRadius: 0.75, fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.availability || '—'}
                            color={availability === 'lost' ? 'error' : availability === 'borrowed' ? 'warning' : availability === 'reserved' ? 'info' : 'default'}
                            sx={{ borderRadius: 0.75, fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleEditInventory({ type: item.type, title: item.title, id: item.id }, item.inv)}
                              sx={{ borderRadius: 1, fontWeight: 600 }}
                            >
                              Update
                            </Button>
                            {availability === 'lost' && !(item.inv?.foundOn || item.inv?.FoundOn || item.inv?.found_on) && (
                              <Button size="small" color="success" variant="contained" onClick={async () => {
                                try {
                                  const invKey = item.inv?.Copy_ID || item.inv?.id || item.inv?.ID || item.inv?.Storage_ID || item.inv?.storageId || '';
                                  await performInventoryUpdate(item, invKey, { availability: 'Available' });
                                  setToast({ open: true, message: 'Item marked as found.', severity: 'success' });
                                } catch {
                                  setToast({ open: true, message: 'Failed to mark item as found.', severity: 'error' });
                                } finally {
                                  fetchDocsBooks();
                                }
                              }} sx={{ borderRadius: 1, fontWeight: 600 }}>Mark found</Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={1.5}
            sx={{ mt: 2 }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {filteredViewAllItems.length ? `Showing ${pageStart}-${pageEnd} of ${filteredViewAllItems.length}` : ' '}
            </Typography>
            <Stack direction="row" gap={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                disabled={viewAllPage === 0}
                onClick={() => setViewAllPage(p => Math.max(0, p - 1))}
                sx={{ borderRadius: 1 }}
              >
                Prev
              </Button>
              <Typography variant="caption" fontWeight={700}>
                Page {viewAllPage + 1} / {totalPages}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={viewAllPage >= totalPages - 1}
                onClick={() => setViewAllPage(p => Math.min(totalPages - 1, p + 1))}
                sx={{ borderRadius: 1 }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button onClick={() => setViewAllOpen(false)} size="small" variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

        {/* Batch Actions Dialog */}
        <Dialog
          open={batchDialogOpen}
          onClose={closeBatchDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}
        >
          <DialogTitle sx={{ fontWeight: 800, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
            {batchAction === 'recover' ? 'Recover selected items' : 'Move selected items'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {batchAction === 'recover' ? (
                <Typography variant="body2">This will mark the selected lost items as Available. You may optionally assign them to a storage below.</Typography>
              ) : (
                <Typography variant="body2">Select a destination storage to move the selected items into. Borrowed items cannot be moved.</Typography>
              )}

              <TextField
                select
                label="Target storage"
                value={batchTargetStorage}
                onChange={e => setBatchTargetStorage(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="">Unassigned / Keep current</MenuItem>
                {storages.map(s => (
                  <MenuItem key={s.ID} value={String(s.ID)}>{s.Name}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 1 }}>
            <Button size="small" variant="outlined" onClick={closeBatchDialog}>Cancel</Button>
            <Button size="small" variant="contained" onClick={handleConfirmBatch} sx={{ fontWeight: 700 }}>Confirm</Button>
          </DialogActions>
        </Dialog>

      {/* Edit Inventory Modal */}
      <Dialog
        open={openEditInv}
        onClose={handleCloseEditInv}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: `2px solid ${theme.palette.divider}`
          }}
        >
          Edit {editItem?.type} Inventory
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {isBorrowedEdit && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 1 }}>
              Borrowed items are locked to their current location and availability. Update the condition only, or return the item first.
            </Alert>
          )}
          <Stack spacing={1.25}>
            <TextField
              select
              label="Location"
              value={editInv?.location || ""}
              onChange={e => setEditInv({ ...editInv, location: e.target.value })}
              fullWidth
              required
              size="small"
              helperText={
                !storages.length
                  ? 'Add a storage first.'
                  : isBorrowedEdit
                  ? 'Borrowed items must be returned before changing location.'
                  : ' '
              }
              disabled={!storages.length || isBorrowedEdit}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              {storages.map(s => (
                <MenuItem key={s.ID} value={String(s.ID)}>{s.Name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Condition"
              value={editInv?.condition || "Good"}
              onChange={e => setEditInv({ ...editInv, condition: e.target.value })}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              {/* show current legacy value if not in standard list */}
              {editInv?.condition && !conditionOptions.includes(editInv.condition) && (
                <MenuItem value={editInv.condition} disabled>
                  {`Legacy: ${editInv.condition}`}
                </MenuItem>
              )}
              {conditionOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Availability"
              value={editInv?.availability || "Available"}
              onChange={e => setEditInv({ ...editInv, availability: e.target.value })}
              fullWidth
              size="small"
              helperText={
                isBorrowedEdit
                  ? 'Return this item before changing availability.'
                  : ' '
              }
              disabled={isBorrowedEdit}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              {editInv?.availability && !availabilityOptions.includes(editInv.availability) && (
                <MenuItem value={editInv.availability} disabled>
                  {`Legacy: ${editInv.availability}`}
                </MenuItem>
              )}
              {availabilityOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button
            onClick={handleCloseEditInv}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveInventory}
            variant="contained"
            size="small"
            disabled={!editInv || (!isBorrowedEdit && !editInv.location)}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Storage Modal */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            border: `2px solid ${theme.palette.divider}`
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            py: 1.25,
            borderBottom: `2px solid ${theme.palette.divider}`
          }}
        >
          {isEdit ? "Edit Storage Location" : "Add Storage Location"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={1.25}>
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              size="small"
              autoFocus
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              label="Capacity"
              name="capacity"
              type="number"
              inputProps={{ min: 0, step: 1 }}
              value={form.capacity}
              onChange={handleChange}
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              helperText="Leave empty for unlimited capacity"
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `2px solid ${theme.palette.divider}`,
            py: 1
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            size="small"
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            {isEdit ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, border: `2px solid ${theme.palette.divider}` } }}
      >
        <DialogTitle sx={{ fontWeight: 800, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          Delete Storage?
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmber color="warning" />
            <Typography variant="body2">
              This will permanently remove "{deleteTarget?.Name}". This action cannot be undone.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 1 }}>
          <Button size="small" onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }} variant="outlined">Cancel</Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await axios.delete(`${API_BASE}/storages/${deleteTarget.ID}`);
                setToast({ open: true, message: 'Storage deleted.', severity: 'success' });
                setDeleteOpen(false);
                setDeleteTarget(null);
                fetchStorages();
              } catch {
                setToast({ open: true, message: 'Failed to delete storage.', severity: 'error' });
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
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

export default StorageManagementPage;