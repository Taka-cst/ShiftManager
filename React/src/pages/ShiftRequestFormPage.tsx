import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Cancel } from '@mui/icons-material';
import { shiftRequestAPI } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { useLocation } from 'react-router-dom';

interface FormData {
  date: Date | null;
  canwork: boolean;
  start_time: Date | null;
  end_time: Date | null;
  description: string;
}

const ShiftRequestFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: shiftId } = useParams<{ id?: string }>();
  const { showError } = useError();
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const dateParam = params.get('date');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      date: dateParam ? new Date(dateParam) : null,
      canwork: true,
      start_time: null,
      end_time: null,
      description: '',
    },
  });

  // 編集時は初期値をAPIから取得
  React.useEffect(() => {
    if (shiftId) {
      (async () => {
        try {
          const res = await shiftRequestAPI.getShiftRequest(Number(shiftId));
          reset({
            date: res.date ? new Date(res.date) : null,
            canwork: res.canwork,
            start_time: res.start_time ? new Date(res.start_time) : null,
            end_time: res.end_time ? new Date(res.end_time) : null,
            description: res.description || '',
          });
        } catch (e) {
          showError('編集データの取得に失敗しました😭');
          navigate('/shift-requests');
        }
      })();
    }
  }, [shiftId, reset, showError, navigate]);

  const canwork = watch('canwork');

  const onSubmit = async (data: FormData) => {
    if (!data.date) {
      showError('日付を選択してください！📅');
      return;
    }

    setIsLoading(true);
    try {
      // 日付と時刻を結合してISO 8601形式の文字列（`YYYY-MM-DDTHH:mm:ss`）を生成するヘルパー関数
      const formatDateTimeForAPI = (date: Date, time: Date): string => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const hours = time.getHours();
        const minutes = time.getMinutes();
        const seconds = time.getSeconds();
        const combined = new Date(year, month, day, hours, minutes, seconds);
        // FastAPIが解釈できる形式にフォーマット
        return format(combined, "yyyy-MM-dd'T'HH:mm:ss");
      };

      const requestData = {
        date: format(data.date, 'yyyy-MM-dd'),
        canwork: data.canwork,
        description: data.description || undefined,
        start_time: data.canwork && data.start_time ? formatDateTimeForAPI(data.date, data.start_time) : undefined,
        end_time: data.canwork && data.end_time ? formatDateTimeForAPI(data.date, data.end_time) : undefined,
      };

      console.log('送信するデータ:', requestData); // デバッグ用


      if (shiftId) {
        // 編集時は更新APIを呼ぶ
        await shiftRequestAPI.updateShiftRequest(Number(shiftId), requestData);
      } else {
        // 新規登録
        await shiftRequestAPI.createShiftRequest(requestData);
      }
      setSaveSuccess(true);
      // 0.5秒後にシフト希望一覧に戻る
      setTimeout(() => {
        navigate('/shift-requests');
      }, 500);

    } catch (error: any) {
      console.error('保存エラー:', error); // デバッグ用
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('シフト希望の登録に失敗しました😭');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/shift-requests');
  };

  if (saveSuccess) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="h6">
              {shiftId ? 'シフト希望を更新しました！✨' : 'シフト希望を保存しました！✨'}
            </Typography>
            <Typography variant="body2">
              自動でシフト希望一覧に戻ります...
            </Typography>
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              {shiftId ? 'シフト希望編集' : 'シフト希望登録'}
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
              {/* 日付選択 */}
              <Controller
                name="date"
                control={control}
                rules={{ required: '日付を選択してください' }}
                render={({ field }) => (
                  <DatePicker
                    label="日付 📅"
                    value={field.value}
                    onChange={(newValue) => field.onChange(newValue)}
                    slots={{ textField: TextField }}
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

              {/* 勤務可否選択 */}
              <Controller
                name="canwork"
                control={control}
                render={({ field }) => (
                  <FormControl component="fieldset" sx={{ mt: 3, width: '100%' }}>
                    <FormLabel component="legend">
                      <Typography variant="subtitle1" fontWeight="bold">
                        勤務可否
                      </Typography>
                    </FormLabel>
                    <RadioGroup
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value === 'true')}
                      row
                      sx={{ mt: 1 }}
                    >
                      <FormControlLabel
                        value={true}
                        control={<Radio />}
                        label="⭕ 勤務可能"
                      />
                      <FormControlLabel
                        value={false}
                        control={<Radio />}
                        label="❌ 勤務不可"
                      />
                    </RadioGroup>
                  </FormControl>
                )}
              />

              {/* 勤務可能な場合のみ時間入力を表示 */}
              {canwork && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    勤務時間
                  </Typography>
                  
                  <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                    <Controller
                      name="start_time"
                      control={control}
                      render={({ field }) => (
                        <TimePicker
                          label="開始時間 🕒"
                          value={field.value}
                          onChange={(newValue) => field.onChange(newValue)}
                          slots={{ textField: TextField }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              margin: 'normal',
                              error: !!errors.start_time,
                              helperText: errors.start_time?.message,
                            },
                          }}
                          ampm={false}
                          minutesStep={30}
                        />
                      )}
                    />

                    <Controller
                      name="end_time"
                      control={control}
                      render={({ field }) => (
                        <TimePicker
                          label="終了時間 🕒"
                          value={field.value}
                          onChange={(newValue) => field.onChange(newValue)}
                          slots={{ textField: TextField }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              margin: 'normal',
                              error: !!errors.end_time,
                              helperText: errors.end_time?.message,
                            },
                          }}
                          ampm={false}
                          minutesStep={30}
                        />
                      )}
                    />
                  </Box>
                </Box>
              )}

              {/* コメント */}
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="コメント（任意）"
                    multiline
                    rows={3}
                    fullWidth
                    margin="normal"
                    placeholder="特記事項があれば入力してください..."
                    sx={{ mt: 3 }}
                  />
                )}
              />

              {/* ボタン */}
              <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleCancel}
                  disabled={isLoading}
                  size="large"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={isLoading}
                  size="large"
                  sx={{ minWidth: 160 }}
                >
                  {isLoading ? '保存中...⏰' : (shiftId ? 'シフト希望を更新' : 'シフト希望を保存')}
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