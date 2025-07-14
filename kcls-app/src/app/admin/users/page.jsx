import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, CircularProgress, IconButton, Tooltip, Snackbar, Alert, Fab
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import UsersFormModal from '../../../components/UsersFormModal';

const API_BASE = import.meta.env.VITE_API_BASE;

const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

const UserManagementPage = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // Snackbar state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  const handleAdd = () => {
    setIsEdit(false);
    setEditUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setIsEdit(true);
    setEditUser(user);
    setModalOpen(true);
  };

  const handleSave = async (payload) => {
    try {
      let res;
      if (isEdit && editUser) {
        res = await fetch(`${API_BASE}/users/${editUser.UserID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('Failed to save user');
      setToast({ open: true, message: isEdit ? 'User updated!' : 'User added!', severity: 'success' });
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const staff = users.filter(u => u.Role === 'Staff');
  const borrowers = users.filter(u => u.Role === 'Borrower');

  return (
    <Box
      p={3}
      sx={{
        position: 'relative',
        minHeight: '100vh',
        background: theme.palette.background.default,
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4" fontWeight={700} color={theme.palette.text.primary}>
          <GroupIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
          User Management
        </Typography>
      </Box>
      <Paper sx={{ mb: 3, background: theme.palette.background.paper }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '.MuiTab-root': { color: theme.palette.text.secondary },
            '.Mui-selected': { color: theme.palette.primary.main }
          }}
        >
          <Tab label={`Staff (${staff.length})`} icon={<SupervisorAccountIcon />} iconPosition="start" />
          <Tab label={`Borrowers (${borrowers.length})`} icon={<PersonIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress color="primary" /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ background: theme.palette.background.paper }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: theme.palette.text.secondary }}>User</TableCell>
                <TableCell sx={{ color: theme.palette.text.secondary }}>Email</TableCell>
                <TableCell sx={{ color: theme.palette.text.secondary }}>Role</TableCell>
                <TableCell sx={{ color: theme.palette.text.secondary }}>Details</TableCell>
                <TableCell align="center" sx={{ color: theme.palette.text.secondary }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(tab === 0 ? staff : borrowers).map(user => (
                <TableRow key={user.UserID}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>
                        {user.Firstname?.[0]}{user.Lastname?.[0]}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={600} color={theme.palette.text.primary}>
                          {user.Firstname} {user.Lastname}
                        </Typography>
                        <Typography variant="caption" color={theme.palette.text.secondary}>{user.Username}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.text.primary }}>{user.Email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.Role}
                      color={user.Role === 'Staff' ? 'primary' : 'secondary'}
                      size="small"
                      sx={{
                        bgcolor: user.Role === 'Staff'
                          ? theme.palette.primary.light
                          : theme.palette.secondary.light,
                        color: theme.palette.getContrastText(
                          user.Role === 'Staff'
                            ? theme.palette.primary.light
                            : theme.palette.secondary.light
                        ),
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {user.Role === 'Staff' && user.staff && (
                      <Typography variant="body2" color={theme.palette.text.secondary}>
                        Position: <b>{user.staff.Position}</b>
                      </Typography>
                    )}
                    {user.Role === 'Borrower' && user.borrower && (
                      <Box>
                        <Typography variant="body2" color={theme.palette.text.secondary}>
                          Type: <b>{user.borrower.Type}</b>
                        </Typography>
                        <Typography variant="body2" color={theme.palette.text.secondary}>
                          Department: <b>{user.borrower.Department || '-'}</b>
                        </Typography>
                        <Typography variant="body2" color={theme.palette.text.secondary}>
                          Status: <b>{user.borrower.AccountStatus}</b>
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit User">
                      <IconButton color="secondary" onClick={() => handleEdit(user)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {(tab === 0 ? staff : borrowers).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color={theme.palette.text.secondary}>No users found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Floating Add Button */}
      <Tooltip title="Add User">
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleAdd}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1201,
            boxShadow: 6,
            background: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              background: theme.palette.primary.dark,
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Users Form Modal */}
      <UsersFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        isEdit={isEdit}
        userData={editUser}
      />

      {/* Snackbar for feedback */}
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

export default UserManagementPage;