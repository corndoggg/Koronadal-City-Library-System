import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Button,
  Tabs, Tab, TextField, InputAdornment, List, ListItem, ListItemText, ListItemSecondaryAction,
  Tooltip, Chip, Typography, CircularProgress, Divider, Stack, Badge
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  DoneAll as DoneAllIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon
} from "@mui/icons-material";

const API_BASE = import.meta.env.VITE_API_BASE;

const formatDateTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

// Helpers to make text formal and informative
const toTitleCase = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatSentence = (text) => {
  if (!text) return '';
  let s = String(text).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  s = s[0].toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
};

const formatTitle = (n, types) => {
  const raw = n?.Title || types[n?.Type] || n?.Type || 'Notification';
  return toTitleCase(raw);
};

const formatMessage = (n) => {
  const base = formatSentence(n?.Message || '');
  return base || 'You have a new notification.';
};

const NotificationModal = ({ open, onClose, userId, onNavigate }) => {
  const [tab, setTab] = useState("unread"); // 'unread' | 'all'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [q, setQ] = useState("");
  const [types, setTypes] = useState({});
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userNameById, setUserNameById] = useState({}); // NEW: cache of userId -> name

  const activeIsReadParam = useMemo(() => (tab === "unread" ? "false" : undefined), [tab]);

  const loadTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/notification-types`);
      const map = {};
      (res.data || []).forEach(t => { map[t.Code] = t.Description; });
      setTypes(map);
    } catch { /* ignore */ }
  };

  const refreshUnreadCount = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_BASE}/users/${userId}/notifications/unread-count`);
      setUnreadCount(Number(res.data?.unread || 0));
    } catch { setUnreadCount(0); }
  };

  const resetAndFetch = async () => {
    setOffset(0);
    await fetchNotifications(0, true);
    await refreshUnreadCount();
  };

  const fetchNotifications = async (startOffset = offset, replace = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(startOffset));
      if (activeIsReadParam !== undefined) params.set("isRead", activeIsReadParam);
      if (q?.trim()) params.set("q", q.trim());
      const url = `${API_BASE}/users/${userId}/notifications?${params.toString()}`;
      const res = await axios.get(url);
      const rows = res.data || [];
      setHasMore(rows.length === limit);
      setNotifs(replace ? rows : [...notifs, ...rows]);
    } catch {
      if (replace) setNotifs([]); else setNotifs([...notifs]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const next = offset + limit;
    setOffset(next);
    await fetchNotifications(next, false);
  };

  const markRead = async (n) => {
    if (!userId || !n) return;
    setActionLoading(true);
    try {
      await axios.put(`${API_BASE}/users/${userId}/notifications/${n.NotificationID}/read`);
      // Optimistic update
      setNotifs(prev => prev.map(x => x.NotificationID === n.NotificationID ? { ...x, IsRead: 1, ReadAt: new Date().toISOString() } : x));
      await refreshUnreadCount();
    } finally { setActionLoading(false); }
  };

  const markAllVisibleRead = async () => {
    if (!userId || !notifs.length) return;
    setActionLoading(true);
    try {
      const ids = notifs.filter(n => !n.IsRead).map(n => n.NotificationID);
      if (ids.length) {
        await axios.put(`${API_BASE}/users/${userId}/notifications/mark-read`, { notificationIds: ids });
        setNotifs(prev => prev.map(n => ids.includes(n.NotificationID) ? { ...n, IsRead: 1, ReadAt: new Date().toISOString() } : n));
        await refreshUnreadCount();
      }
    } finally { setActionLoading(false); }
  };

  const removeForUser = async (n) => {
    if (!userId || !n) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE}/users/${userId}/notifications/${n.NotificationID}`);
      setNotifs(prev => prev.filter(x => x.NotificationID !== n.NotificationID));
      await refreshUnreadCount();
    } finally { setActionLoading(false); }
  };

  const formatUserName = useCallback((u) => {
    if (!u) return "";
    const full =
      [u.FirstName ?? u.Firstname, u.MiddleName ?? u.Middlename, u.LastName ?? u.Lastname]
        .filter(Boolean)
        .join(" ")
        .trim();
    return (
      full ||
      u.FullName ||
      u.Name ||
      u.Username ||
      u.Email ||
      (u.User_ID ? `User #${u.User_ID}` : u.id ? `User #${u.id}` : "")
    );
  }, []);

  const getUserName = useCallback(
    (id) => (id ? userNameById[id] || `#${id}` : "—"),
    [userNameById]
  );

  // Fetch missing sender names from API (tries multiple endpoints)
  useEffect(() => {
    if (!open) return;
    const ids = [...new Set((notifs || []).map(n => n.SenderUserID).filter(Boolean))];
    const missing = ids.filter((id) => !userNameById[id]);
    if (!missing.length) return;

    let cancelled = false;

    const fetchUserById = async (id) => {
      const urls = [
        `${API_BASE}/users/${id}`,            // common
        `${API_BASE}/users/borrower/${id}`,   // used elsewhere in app
        `${API_BASE}/users?id=${encodeURIComponent(id)}`, // fallback
      ];
      for (const url of urls) {
        try {
          const r = await axios.get(url);
          const data = Array.isArray(r.data) ? (r.data[0] || null) : r.data;
          if (data) return data;
        } catch {
          // try next
        }
      }
      return null;
    };

    (async () => {
      const updates = {};
      for (const id of missing) {
        const u = await fetchUserById(id);
        if (u) updates[id] = formatUserName(u);
      }
      if (!cancelled && Object.keys(updates).length) {
        setUserNameById((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, notifs, userNameById, formatUserName]);

  const titleFor = (n) => formatTitle(n, types);

  const metaChips = (n) => {
    const chips = [];
    if (n.Type) chips.push({ label: `Category: ${types[n.Type] ? types[n.Type] : toTitleCase(n.Type)}` , color: 'default' });
    if (n.RelatedType && n.RelatedID != null) chips.push({ label: `Reference: ${toTitleCase(n.RelatedType)} #${n.RelatedID}`, color: 'primary' });
    if (n.SenderUserID) chips.push({ label: `Sender: ${getUserName(n.SenderUserID)}`, color: 'secondary' });
    return chips;
  };

  useEffect(() => {
    if (!open) return;
    loadTypes();
    resetAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { borderRadius: 1, border: theme => `2px solid ${theme.palette.divider}` } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.25 }}>
        <Badge color="error" badgeContent={unreadCount} max={99}>
          <NotificationsIcon />
        </Badge>
        <Typography fontWeight={800}>Notifications</Typography>
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={resetAndFetch}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {tab === "unread" && (
            <Tooltip title="Mark all visible as read">
              <span>
                <Button size="small" variant="outlined" startIcon={<DoneAllIcon />} disabled={actionLoading || notifs.every(n => n.IsRead)}>
                  <span onClick={markAllVisibleRead}>Mark all read</span>
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ px: 2, pt: 1, pb: 1.5, display: "flex", gap: 1, alignItems: "center" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}>
            <Tab value="unread" label={`Unread (${unreadCount})`} />
            <Tab value="all" label="All" />
          </Tabs>
          <Box sx={{ ml: "auto", width: { xs: "100%", sm: 320 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search title or message"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") resetAndFetch(); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Box>
          <Button size="small" onClick={resetAndFetch} variant="outlined">Search</Button>
        </Box>

        <Divider />

        {loading && !notifs.length ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CircularProgress />
            <Typography variant="caption" display="block" mt={1.5} color="text.secondary">Loading…</Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ maxHeight: "60vh", overflow: "auto" }}>
            {notifs.map((n) => (
              <ListItem key={n.NotificationID} alignItems="flex-start"
                sx={{ px: 2, py: 1.25, borderBottom: theme => `1px solid ${theme.palette.divider}`, bgcolor: n.IsRead ? "background.paper" : "action.hover" }}>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={800} fontSize={14}>{titleFor(n)}</Typography>
                      <Typography variant="caption" color="text.secondary">• {formatDateTime(n.NotificationCreatedAt)}</Typography>
                    </Stack>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{formatMessage(n)}</Typography>
                      <Stack direction="row" spacing={0.75} mt={0.75} flexWrap="wrap">
                        {metaChips(n).map((c, i) => (
                          <Chip key={i} size="small" label={c.label} color={c.color} sx={{ borderRadius: 0.75 }} />
                        ))}
                      </Stack>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={0.5}>
                    {onNavigate && n.RelatedType && n.RelatedID != null && (
                      <Tooltip title="Open related">
                        <IconButton size="small" onClick={() => onNavigate(n.RelatedType, n.RelatedID)}>
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!n.IsRead ? (
                      <Tooltip title="Mark as read">
                        <span>
                          <IconButton size="small" onClick={() => markRead(n)} disabled={actionLoading}>
                            <MarkEmailReadIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Remove from my inbox">
                        <span>
                          <IconButton size="small" onClick={() => removeForUser(n)} disabled={actionLoading}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
            ))}

            {!loading && !notifs.length && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  {tab === "unread" ? "No unread notifications." : "No notifications found."}
                </Typography>
              </Box>
            )}

            {hasMore && (
              <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                <Button variant="outlined" onClick={loadMore} disabled={loading}>
                  {loading ? "Loading…" : "Load more"}
                </Button>
              </Box>
            )}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2 }}>
        <Button onClick={onClose} variant="text">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationModal;