import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { adminAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { User } from '../types';

const AdminUsersPage: React.FC = () => {
  const { showError } = useError();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await adminAPI.getAllUsers();
      setUsers(data);
    } catch (error) {
      showError('ユーザー一覧の取得に失敗したよ〜😢');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;

    try {
      await adminAPI.deleteUser(deleteDialog.user.id);
      setUsers(users.filter(u => u.id !== deleteDialog.user!.id));
      setDeleteDialog({ open: false, user: null });
      showError('ユーザーを削除したよ〜'); // 成功メッセージ
    } catch (error: any) {
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('ユーザー削除に失敗しちゃった💦');
      }
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Typography>読み込み中だよ〜⏰</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ユーザー管理
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>ユーザー名</TableCell>
                <TableCell>表示名</TableCell>
                <TableCell>権限</TableCell>
                <TableCell>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.DisplayName}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.admin ? '管理者' : '一般'}
                      color={user.admin ? 'secondary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {!user.admin && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, user })}
                      >
                        削除
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle>ユーザー削除確認</DialogTitle>
        <DialogContent>
          <Typography>
            「{deleteDialog.user?.DisplayName}」さんを削除するよ？<br/>
            この操作は取り消せないから注意してね〜！😰
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>
            キャンセル
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage;