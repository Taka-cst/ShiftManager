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
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip
} from '@mui/material';
import { confirmedShiftAPI } from '../services/api';
import { ConfirmedShift } from '../types';
import { useError } from '../contexts/ErrorContext';

const ConfirmedShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<ConfirmedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const { showError } = useError();

  const months = [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setLoading(true);
        // 新しいAPIエンドポイントを使用して全員の確定シフトを取得
        const data = await confirmedShiftAPI.getAllConfirmedShiftsForUsers(selectedYear, selectedMonth);
        setShifts(data);
      } catch (error) {
        console.error('確定シフト取得エラー:', error);
        showError('確定シフトの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [selectedYear, selectedMonth, showError]);

  // 日付でグループ化
  const groupedShifts = shifts.reduce((acc, shift) => {
    const dateKey = shift.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(shift);
    return acc;
  }, {} as Record<string, ConfirmedShift[]>);

  // 日付をソート
  const sortedDates = Object.keys(groupedShifts).sort();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        みんなの確定シフト
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        全メンバーの確定済みシフトを確認できます
      </Typography>

      {/* 年月選択 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>年</InputLabel>
            <Select
              value={selectedYear}
              label="年"
              onChange={(e: any) => setSelectedYear(Number(e.target.value))}
            >
              {years.map(year => (
                <MenuItem key={year} value={year}>
                  {year}年
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>月</InputLabel>
            <Select
              value={selectedMonth}
              label="月"
              onChange={(e: any) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map(month => (
                <MenuItem key={month.value} value={month.value}>
                  {month.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {shifts.length === 0 ? (
        <Alert severity="info">
          {selectedYear}年{selectedMonth}月の確定されたシフトがありません。
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>日付</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>メンバー</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>開始時間</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>終了時間</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ステータス</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedDates.map(date => (
                groupedShifts[date].map((shift, index) => (
                  <TableRow 
                    key={shift.id} 
                    sx={{ 
                      '&:hover': { backgroundColor: '#f9f9f9' },
                      borderLeft: index === 0 ? '4px solid #1976d2' : 'none'
                    }}
                  >
                    <TableCell>
                      {index === 0 ? formatDate(date) : ''}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {shift.user?.DisplayName || shift.user?.username || '不明'}
                        </Typography>
                        {shift.user?.admin && (
                          <Chip size="small" label="管理者" color="primary" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{shift.start_time}</TableCell>
                    <TableCell>{shift.end_time}</TableCell>
                    <TableCell>
                      <Chip 
                        label="確定済み" 
                        color="success" 
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default ConfirmedShiftsPage;