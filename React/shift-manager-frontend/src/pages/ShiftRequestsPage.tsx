import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle, Cancel } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { shiftRequestAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ShiftRequest } from '../types';

const ShiftRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useError();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; request: ShiftRequest | null }>({
    open: false,
    request: null,
  });

  useEffect(() => {
    fetchShiftRequests();
  }, []);

  const fetchShiftRequests = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const data = await shiftRequestAPI.getMyShiftRequests(year, month);
      setRequests(data);
    } catch (error) {
      showError('シフト希望の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (request: ShiftRequest) => {
    try {
      await shiftRequestAPI.deleteShiftRequest(request.id);
      setRequests(requests.filter(r => r.id !== request.id));
      setDeleteDialog({ open: false, request: null });
    } catch (error) {
      showError('シフト希望の削除に失敗しました。');
    }
  };

  const openDeleteDialog = (request: ShiftRequest) => {
    setDeleteDialog({ open: true, request });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, request: null });
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <Typography>読み込み中...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            シフト希望一覧
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/shift-requests/new')}
          >
            新規作成
          </Button>
        </Box>

        {requests.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                シフト希望がありません
              </Typography>
              <Typography color="textSecondary" paragraph>
                新しいシフト希望を作成してください。
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/shift-requests/new')}
              >
                新規作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {requests.map((request) => (
              <Grid item xs={12} sm={6} md={4} key={request.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h3">
                        {format(new Date(request.date), 'M月d日(E)', { locale: ja })}
                      </Typography>
                      <Chip
                        icon={request.canwork ? <CheckCircle /> : <Cancel />}
                        label={request.canwork ? '勤務可能' : '勤務不可'}
                        color={request.canwork ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    
                    {request.canwork && request.start_time && request.end_time && (
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        時間: {request.start_time} - {request.end_time}
                      </Typography>
                    )}
                    
                    {request.description && (
                      <Typography variant="body2" color="textSecondary">
                        備考: {request.description}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <IconButton 
                      size="small" 
                      onClick={() => navigate(`/shift-requests/${request.id}/edit`)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => openDeleteDialog(request)}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Dialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          シフト希望を削除しますか？
        </DialogTitle>
        <DialogContent>
          <Typography>
            {deleteDialog.request && 
              `${format(new Date(deleteDialog.request.date), 'M月d日(E)', { locale: ja })}のシフト希望を削除します。この操作は取り消せません。`
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>キャンセル</Button>
          <Button 
            color="error" 
            onClick={() => deleteDialog.request && handleDelete(deleteDialog.request)}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ShiftRequestsPage;
