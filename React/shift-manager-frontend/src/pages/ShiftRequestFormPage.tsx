import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { shiftRequestAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { ShiftRequestCreate } from '../types';
import { format } from 'date-fns';

interface FormData {
  date: Date | null;
  canwork: boolean;
  description: string;
  start_time: Date | null;
  end_time: Date | null;
}

const ShiftRequestFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useError();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      date: null,
      canwork: true,
      description: '',
      start_time: null,
      end_time: null,
    },
  });

  const canwork = watch('canwork');

  const onSubmit = async (data: FormData) => {
  if (!data.date) {
    showError('日付を選択してちょうだい♪');
    return;
  }

  setIsLoading(true);
  try {
    // 日本時間で時間をフォーマット
    const formatTimeForAPI = (date: Date) => {
      // 日本時間のHH:mmフォーマットで返すか、時刻部分だけ取る
      return format(date, 'HH:mm:ss');
    };

    const requestData: ShiftRequestCreate = {
      date: format(data.date, 'yyyy-MM-dd'), // date-fnsを使った方が確実
      canwork: data.canwork,
      description: data.description || undefined,
      start_time: data.start_time ? formatTimeForAPI(data.start_time) : undefined,
      end_time: data.end_time ? formatTimeForAPI(data.end_time) : undefined,
    };

    await shiftRequestAPI.createShiftRequest(requestData);
    navigate('/shift-requests');
  } catch (error: any) {
    if (error.response?.data?.detail) {
      showError(error.response.data.detail);
    } else {
      showError('シフト希望の登録に失敗しちゃった😭');
    }
  } finally {
    setIsLoading(false);
  }
};

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              シフト希望登録
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
              <Controller
                name="date"
                control={control}
                rules={{ required: '日付を選択してちょうだい' }}
                render={({ field }) => (
                  <DatePicker
                    label="日付"
                    value={field.value}
                    onChange={(newValue) => field.onChange(newValue)}
                    slots={{
                      textField: TextField,
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                        error: !!errors.date,
                        helperText: errors.date?.message,
                      },
                    }}
                  />
                )}
              />

              <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
                <FormLabel component="legend">勤務可否</FormLabel>
                <Controller
                  name="canwork"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      row
                      value={field.value.toString()}
                      onChange={(e) => field.onChange(e.target.value === 'true')}
                    >
                      <FormControlLabel
                        value="true"
                        control={<Radio />}
                        label="勤務可能💪"
                      />
                      <FormControlLabel
                        value="false"
                        control={<Radio />}
                        label="勤務不可😅"
                      />
                    </RadioGroup>
                  )}
                />
              </FormControl>

              {canwork && (
                <Box sx={{ mt: 2 }}>
                  <Controller
                    name="start_time"
                    control={control}
                    render={({ field }) => (
                      <TimePicker
                        label="開始時間"
                        value={field.value}
                        onChange={(newValue) => field.onChange(newValue)}
                        slots={{
                          textField: TextField,
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            margin: 'normal',
                          },
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="end_time"
                    control={control}
                    render={({ field }) => (
                      <TimePicker
                        label="終了時間"
                        value={field.value}
                        onChange={(newValue) => field.onChange(newValue)}
                        slots={{
                          textField: TextField,
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            margin: 'normal',
                          },
                        }}
                      />
                    )}
                  />
                </Box>
              )}

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="コメント（任意）"
                    multiline
                    rows={3}
                    margin="normal"
                    helperText="200文字以内でお願いします♪"
                    inputProps={{ maxLength: 200 }}
                  />
                )}
              />

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/shift-requests')}
                  disabled={isLoading}
                  fullWidth
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  fullWidth
                >
                  {isLoading ? '登録中...⏰' : '登録する✨'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default ShiftRequestFormPage;