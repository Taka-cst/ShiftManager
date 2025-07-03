import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TextField,
  Box,
} from '@mui/material';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ShiftTableProps {
  mode: 'confirmed' | 'request';
  weekStart: Date;
  users?: Array<{ id: number; DisplayName: string; IsAdmin: boolean }>;
  shifts?: Array<{
    date: string;
    user_id: number;
    start_time: string;
    end_time: string;
    user_display_name?: string;
  }>;
  onTimeChange?: (date: Date, field: 'start' | 'end', value: string) => void;
}

const ShiftTable: React.FC<ShiftTableProps> = ({
  mode,
  weekStart,
  users = [],
  shifts = [],
  onTimeChange,
}) => {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const nonAdminUsers = users.filter(user => !user.IsAdmin);

  const getShiftForUserAndDate = (userId: number, date: Date) => {
    return shifts.find(shift => 
      shift.user_id === userId && 
      isSameDay(new Date(shift.date), date)
    );
  };

  if (mode === 'confirmed') {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>日付</TableCell>
              <TableCell>氏名</TableCell>
              <TableCell>開始時間</TableCell>
              <TableCell>終了時間</TableCell>
              <TableCell>勤務時間</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weekDays.map(date => (
              nonAdminUsers.map(user => {
                const shift = getShiftForUserAndDate(user.id, date);
                if (!shift) return null;
                
                const startTime = new Date(shift.start_time);
                const endTime = new Date(shift.end_time);
                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                
                return (
                  <TableRow key={`${format(date, 'yyyy-MM-dd')}-${user.id}`}>
                    <TableCell>
                      {format(date, 'M月d日', { locale: ja })}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {format(date, 'E曜日', { locale: ja })}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.DisplayName}</TableCell>
                    <TableCell>
                      {format(startTime, 'HH時mm分')}
                    </TableCell>
                    <TableCell>
                      {format(endTime, 'HH時mm分')}
                    </TableCell>
                    <TableCell>
                      {duration.toFixed(1)}時間
                    </TableCell>
                  </TableRow>
                );
              }).filter(Boolean)
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>日付</TableCell>
            <TableCell>氏名</TableCell>
            <TableCell>開始時間</TableCell>
            <TableCell>終了時間</TableCell>
            <TableCell>勤務時間</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {weekDays.map(date => (
            <TableRow key={format(date, 'yyyy-MM-dd')}>
              <TableCell>
                {format(date, 'M月d日', { locale: ja })}
                <br />
                <Typography variant="caption" color="textSecondary">
                  {format(date, 'E曜日', { locale: ja })}
                </Typography>
              </TableCell>
              <TableCell>自分</TableCell>
              <TableCell>
                <TextField
                  type="time"
                  size="small"
                  onChange={(e) => onTimeChange?.(date, 'start', e.target.value)}
                  inputProps={{ step: 1800 }}
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="time"
                  size="small"
                  onChange={(e) => onTimeChange?.(date, 'end', e.target.value)}
                  inputProps={{ step: 1800 }}
                />
              </TableCell>
              <TableCell>-</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ShiftTable;