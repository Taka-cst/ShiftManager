import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  IconButton,
  Button,
  ButtonGroup,
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import ShiftTable from '../components/ShiftTable';
import { confirmedShiftAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ConfirmedShift, User } from '../types';

const ConfirmedShiftsPage: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [shifts, setShifts] = useState<ConfirmedShift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useError();

  useEffect(() => {
    loadConfirmedShifts();
  }, [currentWeek]);

  const loadConfirmedShifts = async () => {
    try {
      setLoading(true);
      const currentYear = currentWeek.getFullYear();
      const currentMonth = currentWeek.getMonth() + 1;
      
      // 確定シフトデータを取得（自分のもののみ）
      const shiftsData = await confirmedShiftAPI.getConfirmedShifts(currentYear, currentMonth);
      
      setShifts(shiftsData);
      // ユーザーリストは不要（自分のシフトのみ表示のため）
      setUsers([]);
    } catch (error) {
      showError('確定シフトの取得に失敗しました😭');
    } finally {
      setLoading(false);
    }
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            確定シフト一覧
          </Typography>
          
          <ButtonGroup variant="outlined" size="small">
            <Button 
              variant={viewMode === 'week' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('week')}
            >
              週表示
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('month')}
            >
              月表示
            </Button>
          </ButtonGroup>
        </Box>

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
          mode="confirmed"
          weekStart={currentWeek}
          users={users}
          shifts={shifts}
        />
      </Box>
    </Container>
  );
};

export default ConfirmedShiftsPage;