import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  IconButton,
  Alert,
} from '@mui/material';
import { NavigateBefore, NavigateNext, Save, Edit } from '@mui/icons-material';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import ShiftTable from '../components/ShiftTable';

const ShiftRequestEditPage: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftRequests, setShiftRequests] = useState<Record<string, { start: string; end: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 既存のシフト希望を読み込み
    const loadExistingRequests = async () => {
      try {
        // API呼び出し処理
        setIsLoading(false);
      } catch (error) {
        console.error('シフト希望の読み込みに失敗しました:', error);
        setIsLoading(false);
      }
    };

    loadExistingRequests();
  }, [currentWeek]);

  const handleTimeChange = (date: Date, field: 'start' | 'end', value: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setShiftRequests(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [field]: value,
      },
    }));
  };

  const handleUpdate = async () => {
    console.log('更新するシフト希望:', shiftRequests);
    // API呼び出し処理をここに実装
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          シフト希望変更
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          登録済みのシフト希望を変更できます。変更後は「更新」ボタンを押してください。
        </Alert>

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

        <ShiftTable
          mode="request"
          weekStart={currentWeek}
          onTimeChange={handleTimeChange}
        />

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={handleUpdate}
            size="large"
          >
            シフト希望を更新
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default ShiftRequestEditPage;