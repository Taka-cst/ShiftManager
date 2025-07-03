import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete, NavigateBefore, NavigateNext, CheckCircle, Cancel } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { shiftRequestAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ShiftRequest } from '../types';

const ShiftRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useError();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; request: ShiftRequest | null }>({
    open: false,
    request: null,
  });

  useEffect(() => {
    fetchShiftRequests();
  }, [currentWeek]);

  const fetchShiftRequests = async () => {
    try {
      const year = currentWeek.getFullYear();
      const month = currentWeek.getMonth() + 1;
      
      const data = await shiftRequestAPI.getShiftRequests(year, month);
      setRequests(data);
    } catch (error) {
      showError('シフト希望の取得に失敗しました。😢');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (request: ShiftRequest) => {
    try {
      await shiftRequestAPI.deleteShiftRequest(request.id);
      setRequests(requests.filter(r => r.id !== request.id));
      setDeleteDialog({ open: false, request: null });
      showError('シフト希望を削除しました！✨');
    } catch (error) {
      showError('シフト希望の削除に失敗しました。😭');
    }
  };

  const openDeleteDialog = (request: ShiftRequest) => {
    setDeleteDialog({ open: true, request });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, request: null });
  };

  // 週の日付を生成
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // 特定の日付のシフト希望を取得
  const getRequestForDate = (date: Date) => {
    return requests.find(request => 
      isSameDay(new Date(request.date), date)
    );
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            シフト希望一覧 📋
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/shift-requests/new')}
          >
            新規作成
          </Button>
        </Box>

        {/* 週選択 */}
        <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={3}>
          <IconButton onClick={handlePreviousWeek}>
            <NavigateBefore />
          </IconButton>
          <Typography variant="h6">
            {format(currentWeek, 'yyyy年M月d日', { locale: ja })} 週
          </Typography>
          <IconButton onClick={handleNextWeek}>
            <NavigateNext />
          </IconButton>
        </Box>

        {/* カレンダー表 */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>日付</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>氏名</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>勤務可否</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>開始時間</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>終了時間</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>勤務時間</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {weekDays.map(date => {
                const request = getRequestForDate(date);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <TableRow 
                    key={format(date, 'yyyy-MM-dd')}
                    sx={{ 
                      backgroundColor: isToday ? 'rgba(25, 118, 210, 0.04)' : 'inherit',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body1" fontWeight={isToday ? 'bold' : 'normal'}>
                          {format(date, 'M月d日', { locale: ja })}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={isToday ? 'primary' : 'textSecondary'}
                          fontWeight={isToday ? 'bold' : 'normal'}
                        >
                          {format(date, 'E曜日', { locale: ja })}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        自分
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {request ? (
                        <Chip
                          icon={request.canwork ? <CheckCircle /> : <Cancel />}
                          label={request.canwork ? '勤務可能' : '勤務不可'}
                          color={request.canwork ? 'success' : 'error'}
                          size="small"
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          未登録
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {request && request.canwork && request.start_time ? (
                        <Typography variant="body2">
                          {request.start_time.substring(0, 5)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {request && request.canwork && request.end_time ? (
                        <Typography variant="body2">
                          {request.end_time.substring(0, 5)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {request && request.canwork && request.start_time && request.end_time ? (
                        (() => {
                          const startTime = new Date(`2000-01-01T${request.start_time}`);
                          const endTime = new Date(`2000-01-01T${request.end_time}`);
                          const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                          return (
                            <Typography variant="body2">
                              {duration.toFixed(1)}時間
                            </Typography>
                          );
                        })()
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={1}>
                        {request ? (
                          <>
                            <IconButton 
                              size="small" 
                              onClick={() => navigate(`/shift-requests/${request.id}/edit`)}
                              title="編集"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => openDeleteDialog(request)}
                              title="削除"
                            >
                              <Delete />
                            </IconButton>
                          </>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={() => navigate(`/shift-requests/new?date=${format(date, 'yyyy-MM-dd')}`)}
                          >
                            登録
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 空のデータ用メッセージ */}
        {requests.length === 0 && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography>
              この週にはシフト希望がありません。新規作成ボタンから登録してください！📝
            </Typography>
          </Alert>
        )}
      </Box>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          シフト希望を削除しますか？🗑️
        </DialogTitle>
        <DialogContent>
          <Typography>
            {deleteDialog.request && 
              `${format(new Date(deleteDialog.request.date), 'M月d日(E)', { locale: ja })}のシフト希望を削除します。この操作は取り消せません！😰`
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>キャンセル</Button>
          <Button 
            color="error" 
            onClick={() => deleteDialog.request && handleDelete(deleteDialog.request)}
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ShiftRequestsPage;