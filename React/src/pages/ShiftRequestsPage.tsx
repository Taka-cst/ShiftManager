import React, { useState, useEffect } from 'react';
import { getDaysInMonth } from 'date-fns';
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
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, subMonths, addMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { shiftRequestAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ShiftRequest } from '../types';
const getWorkDays = async (): Promise<number[]> => {
  // 例: APIで取得する場合
  // const settings = await fetch('/api/v1/settings/dow').then(res => res.json());
  // return settings.enabledDays; // [1, 4] など（1=火曜, 4=金曜）

  // APIがなければ火曜(2)・金曜(5)のみ
  return [2, 5];
};

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
  const [workDays, setWorkDays] = useState<number[]>([2, 5]); // 火曜(2)・金曜(5)をデフォルトで有効にする
  const [displayMonth, setDisplayMonth] = useState(new Date());
  useEffect(() => {
    fetchShiftRequests();
  }, [displayMonth]);

  useEffect(() => {
    // 勤務曜日を取得
    getWorkDays().then(setWorkDays);
  }, []);

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth(); // 0始まり
  const daysInMonth = getDaysInMonth(displayMonth);

  // 今月の勤務曜日だけの日付リストを作成
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
    .filter(date => workDays.includes(date.getDay()));

  const fetchShiftRequests = async () => {
    setLoading(true);
    try {
      const data = await shiftRequestAPI.getShiftRequests(year, month + 1);
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

  const handlePreviousMonth = () => {
    setDisplayMonth(prev => subMonths(prev, 1));
  };
  const handleNextMonth = () => {
    setDisplayMonth(prev => addMonths(prev, 1));
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Typography>読み込み中⏰</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={handlePreviousMonth}>
              <NavigateBefore />
            </IconButton>
            <Typography variant="h4" component="h1">
              シフト希望一覧（{format(displayMonth, 'yyyy年M月', { locale: ja })}）📋
            </Typography>
            <IconButton onClick={handleNextMonth}>
              <NavigateNext />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/shift-requests/new')}
          >
            新規作成
          </Button>
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
              {monthDays.map(date => {
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
                          {format(new Date(request.start_time), 'HH:mm')}
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
                          {format(new Date(request.end_time), 'HH:mm')}
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
                          const startTime = new Date(request.start_time);
                          const endTime = new Date(request.end_time);
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
              今月はまだシフト希望がありません。新規作成ボタンから登録してください！📝
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