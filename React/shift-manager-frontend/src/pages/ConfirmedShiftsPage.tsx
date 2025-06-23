import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { confirmedShiftAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ConfirmedShift } from '../types';

const ConfirmedShiftsPage: React.FC = () => {
  const { showError } = useError();
  const [shifts, setShifts] = useState<ConfirmedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchConfirmedShifts();
  }, [currentDate]);

  const fetchConfirmedShifts = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const data = await confirmedShiftAPI.getConfirmedShifts(year, month);
      setShifts(data);
    } catch (error) {
      showError('確定シフトの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
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
            確定シフト一覧
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handlePreviousMonth}>
              <NavigateBefore />
            </IconButton>
            <Typography variant="h6">
              {format(currentDate, 'yyyy年M月', { locale: ja })}
            </Typography>
            <IconButton onClick={handleNextMonth}>
              <NavigateNext />
            </IconButton>
          </Box>
        </Box>

        {shifts.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                この月の確定シフトはありません
              </Typography>
              <Typography color="textSecondary">
                管理者がシフトを確定するまでお待ちください。
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {shifts.map((shift) => (
              <Grid item xs={12} sm={6} md={4} key={shift.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h3">
                        {format(new Date(shift.date), 'M月d日(E)', { locale: ja })}
                      </Typography>
                      <Chip
                        label={shift.user_display_name || `ユーザー${shift.user_id}`}
                        color="primary"
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="textSecondary">
                      時間: {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default ConfirmedShiftsPage;