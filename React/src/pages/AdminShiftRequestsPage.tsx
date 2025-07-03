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
  TextField,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { adminAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ShiftRequest, ConfirmedShiftCreate, User } from '../types';

const AdminShiftRequestsPage: React.FC = () => {
  const { showError } = useError();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    request: ShiftRequest | null;
  }>({ open: false, request: null });
  const [confirmData, setConfirmData] = useState<{
    start_time: Date | null;
    end_time: Date | null;
  }>({ start_time: null, end_time: null });

  useEffect(() => {
    fetchShiftRequests();
  }, []);

  const fetchShiftRequests = async () => {
    try {
      const data = await adminAPI.getAllShiftRequests();
      setRequests(data);
    } catch (error) {
      showError('シフト希望の取得に失敗したよ〜😭');
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (request: ShiftRequest) => {
    setConfirmDialog({ open: true, request });
    // 既存の時間があればセット
    setConfirmData({
      start_time: request.start_time ? new Date(request.start_time) : null,
      end_time: request.end_time ? new Date(request.end_time) : null,
    });
  };

  const handleConfirmShift = async () => {
    if (!confirmDialog.request || !confirmData.start_time || !confirmData.end_time) {
      showError('開始時間と終了時間を設定してね〜！');
      return;
    }

    try {
      const shiftData: ConfirmedShiftCreate = {
        date: confirmDialog.request.date,
        start_time: confirmData.start_time.toISOString(),
        end_time: confirmData.end_time.toISOString(),
        user_id: confirmDialog.request.user_id,
      };

      await adminAPI.createConfirmedShift(shiftData);
      showError('シフト確定したよ〜！✨'); // これは成功メッセージなんだけどね😅
      setConfirmDialog({ open: false, request: null });
      // 必要に応じてリフレッシュ
    } catch (error: any) {
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('シフト確定に失敗しちゃった💦');
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
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            シフト希望一覧（管理者用）
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>日付</TableCell>
                  <TableCell>ユーザー</TableCell>
                  <TableCell>勤務可否</TableCell>
                  <TableCell>希望時間</TableCell>
                  <TableCell>コメント</TableCell>
                  <TableCell>アクション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {format(new Date(request.date), 'M月d日(E)', { locale: ja })}
                    </TableCell>
                    <TableCell>{request.user_display_name || `ユーザー${request.user_id}`}</TableCell>
                    <TableCell>
                      <Chip
                        label={request.canwork ? '勤務可能' : '勤務不可'}
                        color={request.canwork ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {request.canwork
                        ? request.start_time && request.end_time
                          ? `${format(new Date(request.start_time), 'HH:mm')} - ${format(new Date(request.end_time), 'HH:mm')}`
                          : '希望なし'
                        : '-'}
                    </TableCell>
                    <TableCell>{request.description || '-'}</TableCell>
                    <TableCell>
                      {request.canwork && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => openConfirmDialog(request)}
                        >
                          確定する
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* 確定ダイアログ */}
        <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, request: null })}>
          <DialogTitle>シフト確定</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography gutterBottom>
                {confirmDialog.request?.user_display_name}さんの
                {confirmDialog.request && format(new Date(confirmDialog.request.date), 'M月d日(E)', { locale: ja })}
                のシフトを確定するよ〜！
              </Typography>
              
              <TimePicker
                label="開始時間"
                value={confirmData.start_time}
                onChange={(newValue) => setConfirmData({ ...confirmData, start_time: newValue })}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />

              <TimePicker
                label="終了時間"
                value={confirmData.end_time}
                onChange={(newValue) => setConfirmData({ ...confirmData, end_time: newValue })}
                slots={{ textField: TextField }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ open: false, request: null })}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmShift} variant="contained">
              確定する✨
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default AdminShiftRequestsPage;