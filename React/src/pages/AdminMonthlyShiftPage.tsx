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
    TextField,
    Button,
    Chip,
    IconButton,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Card,
    CardContent,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    Save,
    Edit,
    Check,
    Close,
    NavigateBefore,
    NavigateNext,
    Schedule,
    Person,
    Warning,
    Info,
    Add
} from '@mui/icons-material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameDay,
    parseISO,
    differenceInMinutes
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useError } from '../contexts/ErrorContext';
import { adminAPI, confirmedShiftAPI, authAPI } from '../services/api';
import { User, ShiftRequest, ConfirmedShift, ConfirmedShiftCreate, DayOfWeekSettings } from '../types';

// 各日のシフト情報を管理する型
interface DayShiftInfo {
    date: string;
    user_id: number;
    canwork: boolean;
    start_time: string | null;
    end_time: string | null;
    confirmed_shift_id?: number;
    shift_request_id?: number;
    is_confirmed: boolean;
    is_editing?: boolean;
    temp_start_time?: Date | null;
    temp_end_time?: Date | null;
    description?: string;
}

// ユーザー毎の月間シフト情報
interface UserMonthlyShifts {
    user: User;
    shifts: { [date: string]: DayShiftInfo };
}

const AdminMonthlyShiftPage: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [users, setUsers] = useState<User[]>([]);
    const [userShifts, setUserShifts] = useState<UserMonthlyShifts[]>([]);
    const [dayOfWeekSettings, setDayOfWeekSettings] = useState<DayOfWeekSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingCells, setEditingCells] = useState<Set<string>>(new Set());
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        message: string;
        onConfirm: () => void;
    }>({ open: false, message: '', onConfirm: () => { } });

    const { showError } = useError();

    // 授業曜日設定に基づいて表示対象の日を決定
    const getValidDays = () => {
        if (!dayOfWeekSettings) return [];

        const allDays = eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });

        return allDays.filter(day => {
            const dayOfWeek = day.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜
            switch (dayOfWeek) {
                case 0: return dayOfWeekSettings.sunday;
                case 1: return dayOfWeekSettings.monday;
                case 2: return dayOfWeekSettings.tuesday;
                case 3: return dayOfWeekSettings.wednesday;
                case 4: return dayOfWeekSettings.thursday;
                case 5: return dayOfWeekSettings.friday;
                case 6: return dayOfWeekSettings.saturday;
                default: return false;
            }
        });
    };

    const monthDays = getValidDays();

    useEffect(() => {
        loadMonthlyData();
    }, [currentMonth]);

    const loadMonthlyData = async () => {
        try {
            setLoading(true);

            // 全ユーザー、シフト希望、確定シフト、授業曜日設定を並行取得
            const [usersData, shiftRequestsData, confirmedShiftsData, dayOfWeekData] = await Promise.all([
                adminAPI.getAllUsers(),
                adminAPI.getAllShiftRequests(),
                confirmedShiftAPI.getAllConfirmedShifts(),
                adminAPI.getDayOfWeekSettings()
            ]);

            // 管理者を除外
            const nonAdminUsers = usersData.filter(user => !user.admin);

            setDayOfWeekSettings(dayOfWeekData);

            // 現在の月のデータのみフィルタリング
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);

            const monthlyRequests = shiftRequestsData.filter(req => {
                const reqDate = parseISO(req.date);
                return reqDate >= monthStart && reqDate <= monthEnd;
            });

            const monthlyConfirmed = confirmedShiftsData.filter(shift => {
                const shiftDate = parseISO(shift.date);
                const isInRange = shiftDate >= monthStart && shiftDate <= monthEnd;
                
                // デバッグログ追加
                if (!isInRange) {
                    console.log(`確定シフト除外: ${shift.date} (${shiftDate.toISOString()}) - 範囲外`, {
                        monthStart: monthStart.toISOString(),
                        monthEnd: monthEnd.toISOString(),
                        shiftDate: shiftDate.toISOString()
                    });
                }
                
                return isInRange;
            });

            console.log('=== データ読み込み完了 ===');
            console.log('確定シフト一覧:', monthlyConfirmed); 
            console.log('シフト希望一覧:', monthlyRequests); 
            console.log('現在の月:', format(currentMonth, 'yyyy-MM')); 
            console.log('月間確定シフト詳細:');
            monthlyConfirmed.forEach(shift => {
                console.log(`  ID=${shift.id}, ユーザーID=${shift.user_id}, 日付=${shift.date}, 開始=${shift.start_time}, 終了=${shift.end_time}`);
            });
            
            // 特定のuser_id=3のデータをハイライト
            const user3Shifts = monthlyConfirmed.filter(shift => shift.user_id === 3);
            console.log('🔍 ユーザー3の確定シフト:', user3Shifts);
            user3Shifts.forEach(shift => {
                console.log(`  📅 日付: "${shift.date}" (型: ${typeof shift.date})`);
                console.log(`  👤 ユーザーID: ${shift.user_id} (型: ${typeof shift.user_id})`);
            });
            console.log('=======================');

            // 授業曜日設定に基づいて表示対象の日を決定
            const validDays = eachDayOfInterval({
                start: monthStart,
                end: monthEnd
            }).filter(day => {
                const dayOfWeek = day.getDay();
                switch (dayOfWeek) {
                    case 0: return dayOfWeekData.sunday;
                    case 1: return dayOfWeekData.monday;
                    case 2: return dayOfWeekData.tuesday;
                    case 3: return dayOfWeekData.wednesday;
                    case 4: return dayOfWeekData.thursday;
                    case 5: return dayOfWeekData.friday;
                    case 6: return dayOfWeekData.saturday;
                    default: return false;
                }
            });

            // ユーザー毎の月間シフトデータを構築（管理者を除外）
            const userShiftsData: UserMonthlyShifts[] = nonAdminUsers.map(user => {
                const shifts: { [date: string]: DayShiftInfo } = {};

                validDays.forEach(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');

                    // シフト希望を確認
                    const shiftRequest = monthlyRequests.find(req =>
                        req.user_id === user.id && req.date === dateStr
                    );

                    // 確定シフトを確認（厳密な日付比較）
                    const confirmedShift = monthlyConfirmed.find(shift => {
                        // 日付文字列の正規化（yyyy-MM-dd形式に統一）
                        let shiftDateStr: string;
                        
                        if (typeof shift.date === 'string') {
                            if (shift.date.includes('T')) {
                                shiftDateStr = shift.date.split('T')[0];
                            } else {
                                shiftDateStr = shift.date;
                            }
                        } else {
                            // Date オブジェクトの場合
                            shiftDateStr = format(shift.date, 'yyyy-MM-dd');
                        }
                        
                        const isUserMatch = shift.user_id === user.id;
                        const isDateMatch = shiftDateStr === dateStr;
                        const isMatch = isUserMatch && isDateMatch;
                        
                        // 詳細デバッグログ（特にuser_id=3の場合）
                        if (user.id === 3) {
                            console.log(`🔍 確定シフト検索: ユーザー${user.id}, 検索日="${dateStr}"`);
                            console.log(`  🔄 シフトID=${shift.id}, シフトユーザーID=${shift.user_id}, シフト日="${shiftDateStr}"`);
                            console.log(`  ✅ ユーザーマッチ=${isUserMatch}, 日付マッチ=${isDateMatch}, 総合マッチ=${isMatch}`);
                            if (isMatch) {
                                console.log(`  🎯 マッチしました！シフトID=${shift.id}`);
                            }
                        }
                        
                        return isMatch;
                    });

                    // デバッグ: 確定シフトの検索処理をログ出力
                    if (user.id === 3) { // ユーザー3でデバッグ
                        console.log(`📊 ユーザー${user.id} ${dateStr}の検索結果:`, {
                            dateStr,
                            availableConfirmedShifts: monthlyConfirmed.filter(s => s.user_id === user.id),
                            foundConfirmedShift: confirmedShift,
                            foundShiftRequest: shiftRequest
                        });
                        
                        if (!confirmedShift) {
                            console.log(`❌ 確定シフトが見つかりません。利用可能なシフト:`);
                            monthlyConfirmed.filter(s => s.user_id === user.id).forEach(s => {
                                const sDateStr = typeof s.date === 'string' ? 
                                    (s.date.includes('T') ? s.date.split('T')[0] : s.date) : 
                                    format(s.date, 'yyyy-MM-dd');
                                console.log(`  📅 ID=${s.id}, 日付="${sDateStr}" vs 検索日="${dateStr}", 一致=${sDateStr === dateStr}`);
                            });
                        }
                    }

                    if (confirmedShift) {
                        // 確定シフトが存在する場合
                        console.log('確定シフトデータ:', confirmedShift); // デバッグログ追加
                        
                        let startTimeStr: string, endTimeStr: string;
                        
                        try {
                            // start_time と end_time の処理を堅牢化
                            if (typeof confirmedShift.start_time === 'string') {
                                if (confirmedShift.start_time.includes('T')) {
                                    // ISO形式（例：2024-07-10T09:00:00）から時刻部分を抽出
                                    const startDate = parseISO(confirmedShift.start_time);
                                    startTimeStr = format(startDate, 'HH:mm');
                                } else if (confirmedShift.start_time.match(/^\d{2}:\d{2}$/)) {
                                    // 既に "HH:mm" 形式の場合
                                    startTimeStr = confirmedShift.start_time;
                                } else {
                                    // その他の形式を試行
                                    const startDate = parseISO(`2024-01-01T${confirmedShift.start_time}`);
                                    startTimeStr = format(startDate, 'HH:mm');
                                }
                            } else {
                                // Date オブジェクトの場合
                                startTimeStr = format(confirmedShift.start_time, 'HH:mm');
                            }

                            if (typeof confirmedShift.end_time === 'string') {
                                if (confirmedShift.end_time.includes('T')) {
                                    const endDate = parseISO(confirmedShift.end_time);
                                    endTimeStr = format(endDate, 'HH:mm');
                                } else if (confirmedShift.end_time.match(/^\d{2}:\d{2}$/)) {
                                    endTimeStr = confirmedShift.end_time;
                                } else {
                                    const endDate = parseISO(`2024-01-01T${confirmedShift.end_time}`);
                                    endTimeStr = format(endDate, 'HH:mm');
                                }
                            } else {
                                endTimeStr = format(confirmedShift.end_time, 'HH:mm');
                            }
                            
                            console.log(`時刻変換結果: ${startTimeStr} - ${endTimeStr}`); // デバッグログ
                        } catch (error) {
                            console.error('時刻パースエラー:', error, confirmedShift);
                            console.error('start_time:', confirmedShift.start_time, 'type:', typeof confirmedShift.start_time);
                            console.error('end_time:', confirmedShift.end_time, 'type:', typeof confirmedShift.end_time);
                            startTimeStr = '00:00';
                            endTimeStr = '00:00';
                        }

                        shifts[dateStr] = {
                            date: dateStr,
                            user_id: user.id,
                            canwork: true,
                            start_time: startTimeStr,
                            end_time: endTimeStr,
                            confirmed_shift_id: confirmedShift.id,
                            shift_request_id: shiftRequest?.id,
                            is_confirmed: true,
                            description: shiftRequest?.description
                        };
                    } else if (shiftRequest) {
                        // シフト希望のみ存在する場合
                        console.log('シフト希望データ:', shiftRequest); // デバッグログ追加
                        
                        let requestStartTime = null;
                        let requestEndTime = null;
                        
                        try {
                            if (shiftRequest.start_time) {
                                if (typeof shiftRequest.start_time === 'string') {
                                    if (shiftRequest.start_time.includes('T')) {
                                        requestStartTime = format(parseISO(shiftRequest.start_time), 'HH:mm');
                                    } else {
                                        requestStartTime = shiftRequest.start_time;
                                    }
                                } else {
                                    requestStartTime = format(shiftRequest.start_time, 'HH:mm');
                                }
                            }
                            
                            if (shiftRequest.end_time) {
                                if (typeof shiftRequest.end_time === 'string') {
                                    if (shiftRequest.end_time.includes('T')) {
                                        requestEndTime = format(parseISO(shiftRequest.end_time), 'HH:mm');
                                    } else {
                                        requestEndTime = shiftRequest.end_time;
                                    }
                                } else {
                                    requestEndTime = format(shiftRequest.end_time, 'HH:mm');
                                }
                            }
                        } catch (error) {
                            console.error('シフト希望時刻パースエラー:', error, shiftRequest);
                        }

                        shifts[dateStr] = {
                            date: dateStr,
                            user_id: user.id,
                            canwork: shiftRequest.canwork,
                            start_time: requestStartTime,
                            end_time: requestEndTime,
                            shift_request_id: shiftRequest.id,
                            is_confirmed: false,
                            description: shiftRequest.description
                        };
                    } else {
                        // 未登録の場合
                        shifts[dateStr] = {
                            date: dateStr,
                            user_id: user.id,
                            canwork: false,
                            start_time: null,
                            end_time: null,
                            is_confirmed: false
                        };
                    }
                });

                return { user, shifts };
            });

            setUsers(nonAdminUsers);
            setUserShifts(userShiftsData);
        } catch (error) {
            showError('データの読み込みに失敗しました😭');
        } finally {
            setLoading(false);
        }
    };

    const calculateWorkingHours = (start: string | null, end: string | null): string => {
        if (!start || !end) return '';

        const startTime = parseISO(`2000-01-01T${start}:00`);
        const endTime = parseISO(`2000-01-01T${end}:00`);
        const minutes = differenceInMinutes(endTime, startTime);

        if (minutes <= 0) return '';

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return mins > 0 ? `${hours}.${mins}時間` : `${hours}時間`;
    };

    const handleEditStart = (userId: number, date: string) => {
        const cellKey = `${userId}-${date}`;
        setEditingCells(prev => new Set(prev.add(cellKey)));

        // 編集用の一時的な時間を設定（希望時間を初期値として使用）
        setUserShifts(prev => prev.map(userShift => {
            if (userShift.user.id === userId) {
                const shift = userShift.shifts[date];
                
                // 希望時間がある場合はそれを初期値として使用、なければnull
                let initialStartTime = null;
                let initialEndTime = null;
                
                if (shift.start_time) {
                    try {
                        initialStartTime = parseISO(`2000-01-01T${shift.start_time}:00`);
                    } catch (error) {
                        console.error('開始時間のパースに失敗:', shift.start_time);
                    }
                }
                
                if (shift.end_time) {
                    try {
                        initialEndTime = parseISO(`2000-01-01T${shift.end_time}:00`);
                    } catch (error) {
                        console.error('終了時間のパースに失敗:', shift.end_time);
                    }
                }

                const updatedShift = {
                    ...shift,
                    is_editing: true,
                    temp_start_time: initialStartTime,
                    temp_end_time: initialEndTime
                };

                return {
                    ...userShift,
                    shifts: {
                        ...userShift.shifts,
                        [date]: updatedShift
                    }
                };
            }
            return userShift;
        }));
    };

    const handleEditCancel = (userId: number, date: string) => {
        const cellKey = `${userId}-${date}`;
        setEditingCells(prev => {
            const newSet = new Set(prev);
            newSet.delete(cellKey);
            return newSet;
        });

        // 編集状態をリセット
        setUserShifts(prev => prev.map(userShift => {
            if (userShift.user.id === userId) {
                const shift = userShift.shifts[date];
                const updatedShift = {
                    ...shift,
                    is_editing: false,
                    temp_start_time: undefined,
                    temp_end_time: undefined
                };

                return {
                    ...userShift,
                    shifts: {
                        ...userShift.shifts,
                        [date]: updatedShift
                    }
                };
            }
            return userShift;
        }));
    };

    const handleTimeChange = (userId: number, date: string, field: 'start' | 'end', value: Date | null) => {
        setUserShifts(prev => prev.map(userShift => {
            if (userShift.user.id === userId) {
                const shift = userShift.shifts[date];
                const updatedShift = {
                    ...shift,
                    [field === 'start' ? 'temp_start_time' : 'temp_end_time']: value
                };

                return {
                    ...userShift,
                    shifts: {
                        ...userShift.shifts,
                        [date]: updatedShift
                    }
                };
            }
            return userShift;
        }));
    };

    const handleEditSave = async (userId: number, date: string) => {
        try {
            setSaving(true);

            const userShift = userShifts.find(us => us.user.id === userId);
            if (!userShift) return;

            const shift = userShift.shifts[date];
            if (!shift.temp_start_time || !shift.temp_end_time) {
                showError('開始時間と終了時間を入力してください！');
                return;
            }

            const startTime = format(shift.temp_start_time, 'HH:mm');
            const endTime = format(shift.temp_end_time, 'HH:mm');

            if (shift.is_confirmed && shift.confirmed_shift_id) {
                // 確定シフトの更新
                await adminAPI.updateConfirmedShift(shift.confirmed_shift_id, {
                    date,
                    start_time: startTime,  // HH:mm形式の文字列
                    end_time: endTime,      // HH:mm形式の文字列
                    user_id: userId
                });
            } else {
                // 新しい確定シフトの作成
                console.log('=== 確定シフト作成開始 ===');
                console.log('ユーザーID:', userId);
                console.log('日付:', date);
                console.log('開始時間（HH:mm）:', startTime);
                console.log('終了時間（HH:mm）:', endTime);
                console.log('現在の確定シフト一覧:');
                
                // 現在データベースにある確定シフトを表示
                const currentUserShift = userShifts.find(us => us.user.id === userId);
                if (currentUserShift) {
                    Object.values(currentUserShift.shifts).forEach(s => {
                        if (s.is_confirmed) {
                            console.log(`  既存: 日付=${s.date}, ID=${s.confirmed_shift_id}, 確定=${s.is_confirmed}`);
                        }
                    });
                }
                console.log('==========================');
                
                await adminAPI.createConfirmedShift({
                    date,
                    start_time: startTime,  // HH:mm形式の文字列
                    end_time: endTime,      // HH:mm形式の文字列
                    user_id: userId
                });
                
                console.log('確定シフト作成完了');
            }

            // 編集状態を終了
            const cellKey = `${userId}-${date}`;
            setEditingCells(prev => {
                const newSet = new Set(prev);
                newSet.delete(cellKey);
                return newSet;
            });

            // データを再読み込み
            await loadMonthlyData();
            showError('シフトを保存しました！✨');

        } catch (error: any) {
            console.error('シフト保存エラー:', error);
            console.error('エラー詳細:', {
                userId,
                date,
                errorResponse: error.response?.data
            });
            
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (detail.includes('既に存在')) {
                    showError(`このシフトは既に確定済みです。画面を更新しています...\n詳細: ${detail}`);
                    // 強制的にデータを再読み込み
                    await loadMonthlyData();
                } else {
                    showError(`エラー: ${detail}`);
                }
            } else {
                showError('シフトの保存に失敗しました😭 データを再読み込みします...');
                await loadMonthlyData();
            }
        } finally {
            setSaving(false);
        }
    };

    const handleBulkConfirmHopes = async () => {
        // 希望時間が設定されている未確定シフトを一括確定
        const hopesToConfirm = userShifts.flatMap(userShift => 
            Object.entries(userShift.shifts).filter(([_, shift]) => 
                shift.canwork && !shift.is_confirmed && shift.start_time && shift.end_time
            ).map(([date, shift]) => ({
                date,
                userId: userShift.user.id,
                userName: userShift.user.DisplayName,
                start_time: shift.start_time,
                end_time: shift.end_time
            }))
        );

        if (hopesToConfirm.length === 0) {
            showError('確定できる希望シフトがありません');
            return;
        }

        setConfirmDialog({
            open: true,
            message: `${hopesToConfirm.length}件の希望シフトを一括確定しますか？\n\n${hopesToConfirm.map(h => `・${h.userName}: ${format(parseISO(h.date), 'M/d', { locale: ja })} ${h.start_time}-${h.end_time}`).join('\n')}`,
            onConfirm: async () => {
                try {
                    setSaving(true);
                    
                    // 順次処理（並行処理だとサーバーに負荷をかける可能性があるため）
                    for (const hope of hopesToConfirm) {
                        if (!hope.start_time || !hope.end_time) continue;
                        
                        // 時刻文字列をHH:mm形式に変換
                        let startTimeStr: string;
                        let endTimeStr: string;
                        
                        if (hope.start_time.includes('T')) {
                            // ISO形式の場合、時刻部分のみ抽出
                            startTimeStr = format(parseISO(hope.start_time), 'HH:mm');
                        } else if (hope.start_time.match(/^\d{2}:\d{2}$/)) {
                            // 既にHH:mm形式の場合
                            startTimeStr = hope.start_time;
                        } else {
                            // その他の形式は仮定でパース
                            startTimeStr = format(parseISO(`2000-01-01T${hope.start_time}:00`), 'HH:mm');
                        }
                        
                        if (hope.end_time.includes('T')) {
                            // ISO形式の場合、時刻部分のみ抽出
                            endTimeStr = format(parseISO(hope.end_time), 'HH:mm');
                        } else if (hope.end_time.match(/^\d{2}:\d{2}$/)) {
                            // 既にHH:mm形式の場合
                            endTimeStr = hope.end_time;
                        } else {
                            // その他の形式は仮定でパース
                            endTimeStr = format(parseISO(`2000-01-01T${hope.end_time}:00`), 'HH:mm');
                        }

                        await adminAPI.createConfirmedShift({
                            date: hope.date,
                            start_time: startTimeStr,  // HH:mm形式の文字列
                            end_time: endTimeStr,      // HH:mm形式の文字列
                            user_id: hope.userId
                        });
                    }

                    await loadMonthlyData();
                    showError(`${hopesToConfirm.length}件の希望シフトを確定しました！✨`);
                } catch (error) {
                    showError('一括確定に失敗しました😭');
                } finally {
                    setSaving(false);
                }
                setConfirmDialog({ open: false, message: '', onConfirm: () => { } });
            }
        });
    };

    const handleDeleteShift = async (userId: number, date: string) => {
        const userShift = userShifts.find(us => us.user.id === userId);
        if (!userShift) return;

        const shift = userShift.shifts[date];
        if (!shift.confirmed_shift_id) return;

        setConfirmDialog({
            open: true,
            message: `${userShift.user.DisplayName}さんの${format(parseISO(date), 'M月d日', { locale: ja })}のシフトを削除しますか？`,
            onConfirm: async () => {
                try {
                    await adminAPI.deleteConfirmedShift(shift.confirmed_shift_id!);
                    await loadMonthlyData();
                    showError('シフトを削除しました！');
                } catch (error) {
                    showError('シフトの削除に失敗しました😭');
                }
                setConfirmDialog({ open: false, message: '', onConfirm: () => { } });
            }
        });
    };

    const getStatusChip = (shift: DayShiftInfo) => {
        // より厳密な確定済み判定
        if (shift.is_confirmed && shift.confirmed_shift_id) {
            return <Chip label="✅ 確定済み" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
        } else if (shift.canwork && shift.start_time && shift.end_time) {
            return <Chip label="⏰ 希望時間あり" color="primary" size="small" />;
        } else if (shift.canwork) {
            return <Chip label="🆗 勤務可" color="info" size="small" />;
        } else if (shift.shift_request_id) {
            return <Chip label="❌ 勤務不可" color="error" size="small" />;
        } else {
            return <Chip label="⚪ 未登録" color="default" size="small" />;
        }
    };

    const renderTimeCell = (shift: DayShiftInfo, userId: number, date: string) => {
        const cellKey = `${userId}-${date}`;
        const isEditing = editingCells.has(cellKey);

        if (isEditing) {
            return (
                <Box sx={{ p: 1, border: '2px solid', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <TimePicker
                                label="開始時間"
                                value={shift.temp_start_time}
                                onChange={(value) => handleTimeChange(userId, date, 'start', value)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true
                                    }
                                }}
                            />
                            <TimePicker
                                label="終了時間"
                                value={shift.temp_end_time}
                                onChange={(value) => handleTimeChange(userId, date, 'end', value)}
                                slotProps={{
                                    textField: {
                                        size: 'small',
                                        fullWidth: true
                                    }
                                }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button
                                    size="small"
                                    onClick={() => handleEditCancel(userId, date)}
                                    color="inherit"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleEditSave(userId, date)}
                                    disabled={saving}
                                    startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                                >
                                    {shift.is_confirmed ? '更新' : '確定'}
                                </Button>
                            </Box>
                        </Box>
                    </LocalizationProvider>
                </Box>
            );
        }

        // 確定済みシフトの表示（confirmed_shift_idも確認）
        if (shift.is_confirmed && shift.confirmed_shift_id) {
            return (
                <Box sx={{ 
                    p: 1.5, 
                    border: '2px solid', 
                    borderColor: 'success.main', 
                    borderRadius: 1, 
                    bgcolor: 'success.50',
                    position: 'relative'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold" color="success.dark">
                            確定シフト
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                                size="small"
                                onClick={() => handleEditStart(userId, date)}
                                color="primary"
                            >
                                <Edit />
                            </IconButton>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteShift(userId, date)}
                            >
                                <Close />
                            </IconButton>
                        </Box>
                    </Box>
                    {shift.start_time && shift.end_time ? (
                        <Box>
                            <Typography variant="body1" fontWeight="bold" color="success.dark">
                                {getDisplayTime(shift.start_time)} - {getDisplayTime(shift.end_time)}
                            </Typography>
                            <Typography variant="caption" color="success.dark">
                                勤務時間: {calculateWorkingHours(shift.start_time, shift.end_time)}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="error">
                            時間未設定
                        </Typography>
                    )}
                </Box>
            );
        }

        // 希望時間ありの未確定シフト
        if (shift.canwork && shift.start_time && shift.end_time) {
            return (
                <Box sx={{ 
                    p: 1.5, 
                    border: '2px solid', 
                    borderColor: 'primary.main', 
                    borderRadius: 1, 
                    bgcolor: 'primary.50'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold" color="primary.dark">
                            希望時間
                        </Typography>
                        <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<Check />}
                            onClick={() => handleEditStart(userId, date)}
                        >
                            確定
                        </Button>
                    </Box>
                    <Typography variant="body1" fontWeight="bold" color="primary.dark">
                        {getDisplayTime(shift.start_time)} - {getDisplayTime(shift.end_time)}
                    </Typography>
                    <Typography variant="caption" color="primary.dark">
                        予想勤務: {calculateWorkingHours(shift.start_time, shift.end_time)}
                    </Typography>
                </Box>
            );
        }

        // 勤務可能だが時間未設定
        if (shift.canwork) {
            return (
                <Box sx={{ 
                    p: 1.5, 
                    border: '2px solid', 
                    borderColor: 'info.main', 
                    borderRadius: 1, 
                    bgcolor: 'info.50'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold" color="info.dark">
                            勤務可能
                        </Typography>
                        <Button
                            size="small"
                            variant="contained"
                            color="info"
                            startIcon={<Schedule />}
                            onClick={() => handleEditStart(userId, date)}
                        >
                            時間設定
                        </Button>
                    </Box>
                    <Typography variant="caption" color="info.dark">
                        時間を設定してシフトを確定できます
                    </Typography>
                </Box>
            );
        }

        // 勤務不可
        if (shift.shift_request_id) {
            return (
                <Box sx={{ 
                    p: 1.5, 
                    border: '2px solid', 
                    borderColor: 'error.main', 
                    borderRadius: 1, 
                    bgcolor: 'error.50'
                }}>
                    <Typography variant="body2" fontWeight="bold" color="error.dark" sx={{ mb: 1 }}>
                        勤務不可
                    </Typography>
                    <Typography variant="caption" color="error.dark">
                        この日は勤務できません
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<Schedule />}
                            onClick={() => handleEditStart(userId, date)}
                        >
                            強制設定
                        </Button>
                    </Box>
                </Box>
            );
        }

        // 未登録
        return (
            <Box sx={{ 
                p: 1.5, 
                border: '2px dashed', 
                borderColor: 'grey.400', 
                borderRadius: 1, 
                bgcolor: 'grey.50'
            }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    未登録
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                    シフト希望が提出されていません
                </Typography>
                <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    startIcon={<Add />}
                    onClick={() => handleEditStart(userId, date)}
                >
                    新規作成
                </Button>
            </Box>
        );
    };

    if (loading) {
        return (
            <Container>
                <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>読み込み中...</Typography>
                </Box>
            </Container>
        );
    }

    // 授業曜日設定が読み込まれるまで待機
    if (!dayOfWeekSettings) {
        return (
            <Container>
                <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>設定を読み込み中...</Typography>
                </Box>
            </Container>
        );
    }

    const validDays = getValidDays();
    // 追加：時刻表示用の関数
    function getDisplayTime(timeStr: string | null): string {
        // null や undefined の場合は空文字を返す
        if (!timeStr) return '';
        
        // すでに "HH:mm" 形式ならそのまま返す
        if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
        
        // ISO形式やその他の形式を試行
        try {
            if (timeStr.includes('T')) {
                // ISO形式の場合、時刻部分のみ抽出
                const date = new Date(timeStr);
                return format(date, 'HH:mm');
            } else {
                // その他の形式を試行
                const date = parseISO(`2024-01-01T${timeStr}`);
                return format(date, 'HH:mm');
            }
        } catch (error) {
            console.error('時刻表示エラー:', error, timeStr);
            return timeStr; // エラーの場合は元の文字列をそのまま返す
        }
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <Container maxWidth="xl">
                <Box sx={{ mt: 4, mb: 4 }}>
                    {/* ヘッダー */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1">
                            月間シフト管理
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <NavigateBefore />
                            </IconButton>
                            <Typography variant="h6">
                                {format(currentMonth, 'yyyy年M月', { locale: ja })}
                            </Typography>
                            <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <NavigateNext />
                            </IconButton>
                            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                            <Button
                                variant="outlined"
                                color="success"
                                startIcon={<Check />}
                                onClick={handleBulkConfirmHopes}
                                disabled={saving}
                            >
                                希望時間を一括確定
                            </Button>
                        </Box>
                    </Box>

                    {/* 統計情報 */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={2.4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <Person color="primary" />
                                        <Typography variant="h4" color="primary">{users.length}</Typography>
                                        <Typography variant="body2">登録メンバー</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={2.4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <Schedule color="info" />
                                        <Typography variant="h4" color="info.main">{validDays.length}</Typography>
                                        <Typography variant="body2">授業日数</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={2.4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <Check color="success" />
                                        <Typography variant="h4" color="success.main">
                                            {userShifts.reduce((total, userShift) =>
                                                total + Object.values(userShift.shifts).filter(shift => shift.is_confirmed).length, 0
                                            )}
                                        </Typography>
                                        <Typography variant="body2">確定シフト</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={2.4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <Schedule color="primary" />
                                        <Typography variant="h4" color="primary.main">
                                            {userShifts.reduce((total, userShift) =>
                                                total + Object.values(userShift.shifts).filter(shift => shift.canwork && !shift.is_confirmed).length, 0
                                            )}
                                        </Typography>
                                        <Typography variant="body2">未確定希望</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={2.4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <Warning color="warning" />
                                        <Typography variant="h4" color="warning.main">
                                            {(users.length * validDays.length) - 
                                             userShifts.reduce((total, userShift) =>
                                                total + Object.values(userShift.shifts).filter(shift => shift.shift_request_id).length, 0
                                            )}
                                        </Typography>
                                        <Typography variant="body2">未提出</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* 使用方法の説明 */}
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            <strong>🎯 シフト管理方法:</strong><br/>
                            
                            <strong>✅ 確定済み（緑色）:</strong> 既に確定されたシフト。編集・削除が可能<br/>
                            <strong>⏰ 希望時間あり（青色）:</strong> ユーザーが希望時間を提出済み。「確定」ボタンで確定可能<br/>
                            <strong>🆗 勤務可（水色）:</strong> 勤務可能だが時間未設定。「時間設定」で確定可能<br/>
                            <strong>❌ 勤務不可（赤色）:</strong> ユーザーが勤務不可と申告。「強制設定」で上書き可能<br/>
                            <strong>⚪ 未登録（グレー）:</strong> シフト希望未提出。「新規作成」で直接確定可能<br/>
                            
                            <strong>※</strong> 授業曜日設定で有効にした曜日のみ表示されます。
                        </Typography>
                    </Alert>

                    {/* メインテーブル */}
                    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 120, position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                                        氏名
                                    </TableCell>
                                    {validDays.map((day) => (
                                        <TableCell key={day.toISOString()} sx={{ minWidth: 160, textAlign: 'center' }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {format(day, 'M/d', { locale: ja })}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {format(day, '(E)', { locale: ja })}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {userShifts.map((userShift) => (
                                    <TableRow key={userShift.user.id}>
                                        <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1, minWidth: 150 }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {userShift.user.DisplayName}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    ID: {userShift.user.id}
                                                </Typography>
                                                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    <Chip 
                                                        label={`確定: ${Object.values(userShift.shifts).filter(s => s.is_confirmed).length}`}
                                                        color="success" 
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                    <Chip 
                                                        label={`希望: ${Object.values(userShift.shifts).filter(s => s.canwork && !s.is_confirmed).length}`}
                                                        color="primary" 
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        {validDays.map((day) => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const shift = userShift.shifts[dateStr];

                                            return (
                                                <TableCell key={dateStr} sx={{ minWidth: 280, maxWidth: 280, verticalAlign: 'top', p: 1 }}>
                                                    <Box sx={{ mb: 1 }}>
                                                        {getStatusChip(shift)}
                                                        {shift.description && (
                                                            <Tooltip title={`コメント: ${shift.description}`} arrow>
                                                                <Info color="info" sx={{ ml: 1, fontSize: 16, cursor: 'pointer' }} />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                    {renderTimeCell(shift, userShift.user.id, dateStr)}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* 確認ダイアログ */}
                <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, message: '', onConfirm: () => { } })} maxWidth="md">
                    <DialogTitle>確認</DialogTitle>
                    <DialogContent>
                        <Typography component="pre" sx={{ whiteSpace: 'pre-line' }}>
                            {confirmDialog.message}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDialog({ open: false, message: '', onConfirm: () => { } })}>
                            キャンセル
                        </Button>
                        <Button onClick={confirmDialog.onConfirm} color="primary" variant="contained">
                            実行
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </LocalizationProvider>
    );
};

export default AdminMonthlyShiftPage;
