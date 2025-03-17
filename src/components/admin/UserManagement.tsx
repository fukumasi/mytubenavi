// src/components/admin/UserManagement.tsx

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../ui/LoadingSpinner';
import { AdminContext } from '../../pages/AdminDashboardPage';

type User = {
 id: string;
 username: string;
 email?: string;
 role: string;
 is_premium: boolean;
 created_at: string;
 avatar_url?: string;
 active: boolean; // アカウント有効/無効のフラグ
};

type SortField = 'username' | 'role' | 'is_premium' | 'created_at' | 'active';
type SortOrder = 'asc' | 'desc';

// 検索パラメータの型定義
type SearchParams = {
 username?: string;
 userId?: string;
 role?: string;
 premium?: boolean | null;
 active?: boolean | null;
};

// リアルタイム変更を監視するチャンネル名
const PROFILE_CHANGES_CHANNEL = 'user-management-profiles';

const UserManagement: React.FC = () => {
 // AdminContextを使用してグローバルな更新関数を取得
 const { refreshData, setError: setGlobalError } = useContext(AdminContext);
 
 const [users, setUsers] = useState<User[]>([]);
 const [loading, setLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);
 const [selectedUser, setSelectedUser] = useState<User | null>(null);
 const [editMode, setEditMode] = useState<boolean>(false);
 const [page, setPage] = useState<number>(1);
 const [perPage] = useState<number>(10);
 const [totalCount, setTotalCount] = useState<number>(0);
 const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
 const [sortField, setSortField] = useState<SortField>('created_at');
 const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
 
 // 検索パラメータの状態
 const [searchParams, setSearchParams] = useState<SearchParams>({});
 const [searchUsername, setSearchUsername] = useState<string>('');
 const [searchUserId, setSearchUserId] = useState<string>('');
 const [searchRole, setSearchRole] = useState<string>('');
 const [searchPremium, setSearchPremium] = useState<string>('');
 const [searchActive, setSearchActive] = useState<string>('');
 const [isSearching, setIsSearching] = useState<boolean>(false);

 // 一括操作用の状態
 const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
 const [showBulkActions, setShowBulkActions] = useState<boolean>(false);
 const [bulkRole, setBulkRole] = useState<string>('');
 const [bulkPremium, setBulkPremium] = useState<string>('');
 const [bulkActive, setBulkActive] = useState<string>('');
 const [processingBulk, setProcessingBulk] = useState<boolean>(false);
 
 // キャッシュ回避用のカウンター
 const [refreshCounter, setRefreshCounter] = useState<number>(0);

 // エラーハンドリングの統合
 const handleError = (errorMessage: string, consoleError?: any) => {
   setError(errorMessage);
   setGlobalError(errorMessage);
   if (consoleError) {
     console.error(errorMessage, consoleError);
   }
 };

 // ユーザーデータの取得
 const fetchUsers = useCallback(async () => {
   setLoading(true);
   try {
     // キャッシュを回避するための現在時刻を追加
     const timestamp = new Date().getTime();
     console.log(`データ取得開始 (${timestamp})...`);
     
     // まず、profiles テーブルの構造を確認
     const { data: columns, error: columnError } = await supabase
       .from('profiles')
       .select('*')
       .limit(1)
       .order('id', { ascending: true });
     
     if (columnError) throw columnError;
     
     // active カラムが存在するか確認
     const hasActiveColumn = columns && columns.length > 0 && 'active' in columns[0];
     
     // プロファイルテーブルからユーザー情報を取得
     let query = supabase
       .from('profiles')
       .select('*', { count: 'exact', head: false });
     
     // 検索パラメータがある場合は絞り込み
     if (searchParams.username) {
       query = query.ilike('username', `%${searchParams.username}%`);
     }
     
     if (searchParams.userId) {
       query = query.ilike('id', `%${searchParams.userId}%`);
     }
     
     if (searchParams.role && searchParams.role !== 'all') {
       query = query.eq('role', searchParams.role);
     }
     
     if (searchParams.premium !== null && searchParams.premium !== undefined) {
       query = query.eq('is_premium', searchParams.premium);
     }
     
     // active カラムが存在する場合のみフィルタリングを適用
     if (hasActiveColumn && searchParams.active !== null && searchParams.active !== undefined) {
       query = query.eq('active', searchParams.active);
     }
     
     // ページネーションとソート - キャッシュバスターを追加
     const { data, error, count } = await query
       .range((page - 1) * perPage, page * perPage - 1)
       .order(sortField, { ascending: sortOrder === 'asc' })
       .order('id', { ascending: true });  // 2番目のソートキーを追加して一貫した結果を得る

     if (error) throw error;
     
     // active フィールドが存在しない場合はデフォルトで true に設定
     const processedData = data?.map(user => ({
       ...user,
       active: user.active === undefined ? true : user.active
     })) || [];
     
     // データの処理 - ユーザーロールの表示変換
     const displayData = processedData.map(user => {
       // is_premium=trueかつrole=userのユーザーはUIではrole=premiumとして表示
       const displayUser = { ...user };
       if (displayUser.is_premium && displayUser.role === 'user') {
         displayUser.role = 'premium';
       }
       return displayUser;
     });
     
     console.log(`ユーザー情報を取得しました (${timestamp}): ${displayData.length}件`);
     setUsers(displayData);
     setTotalCount(count || 0);
     setError(null); // エラーがなければクリア
     setGlobalError(null); // グローバルエラーもクリア
   } catch (err) {
     handleError('ユーザー情報の取得に失敗しました。', err);
   } finally {
     setLoading(false);
   }
 }, [page, perPage, searchParams, sortField, sortOrder, setGlobalError]);

 // リアルタイム監視の設定
 useEffect(() => {
   console.log('UserManagement: リアルタイム監視を設定します...');
   
   // profiles テーブルの変更を監視するサブスクリプションを設定
   const profilesSubscription = supabase
     .channel(PROFILE_CHANGES_CHANNEL)
     .on('postgres_changes', { 
       event: '*', 
       schema: 'public', 
       table: 'profiles' 
     }, (payload) => {
       // プロファイル変更時にデータを再取得
       console.log('UserManagement: プロファイルデータ変更を検知:', payload);
       
       // データを最新状態に更新
       setRefreshCounter(prev => prev + 1);
       
       // グローバルな更新関数も呼び出し、他のコンポーネントも更新
       refreshData();
     })
     .subscribe((status) => {
       console.log(`Subscription status: ${status}`);
     });

   // 初期データ取得
   fetchUsers();

   // クリーンアップ関数でサブスクリプションを解除
   return () => {
     console.log('UserManagement: リアルタイム監視を解除します...');
     supabase.removeChannel(profilesSubscription);
   };
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 // 通常のデータ更新（検索やページ変更時）
 useEffect(() => {
   console.log('UserManagement: パラメータ変更を検知しました。データを再取得します...');
   fetchUsers();
 }, [page, perPage, sortField, sortOrder, searchParams, refreshCounter, fetchUsers]);

 // 検索実行
 const handleSearch = () => {
   setIsSearching(true);
   const params: SearchParams = {};
   
   if (searchUsername.trim()) {
     params.username = searchUsername.trim();
   }
   
   if (searchUserId.trim()) {
     params.userId = searchUserId.trim();
   }
   
   if (searchRole) {
     params.role = searchRole;
   }
   
   if (searchPremium) {
     if (searchPremium === 'true') {
       params.premium = true;
     } else if (searchPremium === 'false') {
       params.premium = false;
     } else {
       params.premium = null;
     }
   }
   
   if (searchActive) {
     if (searchActive === 'true') {
       params.active = true;
     } else if (searchActive === 'false') {
       params.active = false;
     } else {
       params.active = null;
     }
   }
   
   setSearchParams(params);
   setPage(1); // 検索時はページを1に戻す
   setSelectedUserIds([]); // 検索時に選択をリセット
 };

 // 検索リセット
 const resetSearch = () => {
   setSearchUsername('');
   setSearchUserId('');
   setSearchRole('');
   setSearchPremium('');
   setSearchActive('');
   setSearchParams({});
   setIsSearching(false);
   setPage(1);
   setSelectedUserIds([]); // 検索リセット時に選択もリセット
 };

 // ソート処理
 const handleSort = (field: SortField) => {
   if (field === sortField) {
     // 同じフィールドをクリックした場合は昇順/降順を切り替え
     setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
   } else {
     // 違うフィールドをクリックした場合は、そのフィールドで降順に設定
     setSortField(field);
     setSortOrder('desc');
   }
   setPage(1); // ソートしたらページを1に戻す
 };

 // ソートアイコンの表示
 const renderSortIcon = (field: SortField) => {
   if (field !== sortField) {
     return <span className="text-gray-300 ml-1">⇅</span>;
   }
   return sortOrder === 'asc' ? 
     <span className="text-blue-600 ml-1">↑</span> : 
     <span className="text-blue-600 ml-1">↓</span>;
 };

 // ユーザーの役割を更新
 const updateUserRole = async (userId: string, role: string) => {
   try {
     setUpdateSuccess(false);
     setError(null);
     setGlobalError(null);
     
     // 現在のユーザー情報を取得
     const currentUser = users.find(user => user.id === userId);
     if (!currentUser) {
       throw new Error('ユーザーが見つかりません');
     }
     
     // 更新データの準備
     let updateData: any = {};
     
     // UIでは「premium」と表示されるが、実際のデータベースでは「user」+「is_premium=true」で表現する
     if (role === 'premium') {
       // 「プレミアムユーザー」の場合は実際には「user」roleに変更し、is_premiumフラグを立てる
       updateData.role = 'user';
       updateData.is_premium = true;
       updateData.premium_plan = 'standard';
       // 現在の日付から30日後を計算（プレミアム期限）
       const premiumExpiry = new Date();
       premiumExpiry.setDate(premiumExpiry.getDate() + 30);
       updateData.premium_expiry = premiumExpiry.toISOString();
     } else {
       updateData.role = role;
       
       // 現在のユーザーがプレミアムステータスを持っていて、別の権限に変更される場合はプレミアムステータスをオフに
       if (currentUser.is_premium && (currentUser.role === 'premium' || currentUser.role === 'user')) {
         updateData.is_premium = false;
         updateData.premium_plan = null;
         updateData.premium_expiry = null;
       }
     }
     
     console.log(`ユーザー ${userId} の権限を更新します:`, updateData);

     // Supabaseを使用して更新を実行
     const { error } = await supabase
       .from('profiles')
       .update(updateData)
       .eq('id', userId);

     if (error) {
       console.error('権限更新エラー:', error);
       throw new Error(`権限の更新に失敗しました: ${error.message}`);
     }
     
     // 成功したら、ユーザーリストを更新
     setUsers(users.map(user => {
       if (user.id === userId) {
         if (role === 'premium') {
           // UIではプレミアムユーザーとして表示
           return { ...user, role: 'premium', is_premium: true };
         } else if (currentUser.is_premium && (currentUser.role === 'premium' || currentUser.role === 'user')) {
           return { ...user, role, is_premium: false };
         } else {
           return { ...user, role };
         }
       }
       return user;
     }));
     
     // 選択されているユーザーの情報も更新
     if (selectedUser && selectedUser.id === userId) {
       if (role === 'premium') {
         setSelectedUser({ ...selectedUser, role: 'premium', is_premium: true });
       } else if (currentUser.is_premium && (currentUser.role === 'premium' || currentUser.role === 'user')) {
         setSelectedUser({ ...selectedUser, role, is_premium: false });
       } else {
         setSelectedUser({ ...selectedUser, role });
       }
     }
     
     // データを再取得
     setTimeout(() => {
       fetchUsers();
     }, 300);
     
     setUpdateSuccess(true);
     setTimeout(() => setUpdateSuccess(false), 3000);
   } catch (err: any) {
     handleError(`ユーザー権限の更新に失敗しました: ${err.message || 'エラーが発生しました'}`, err);
   }
 };

 // プレミアムステータスの更新
 const updatePremiumStatus = async (userId: string, is_premium: boolean) => {
   try {
     setUpdateSuccess(false);
     setError(null);
     setGlobalError(null);
     
     // 現在のユーザー情報を取得
     const currentUser = users.find(user => user.id === userId);
     if (!currentUser) {
       throw new Error('ユーザーが見つかりません');
     }
     
     // 更新データの準備
     const updateData: any = { 
       is_premium,
       role: is_premium ? 'user' : currentUser.role, // プレミアムステータスがtrueの場合はroleを'user'に設定
       premium_plan: is_premium ? 'standard' : null,
     };
     
     // プレミアム期限の設定
     if (is_premium) {
       const premiumExpiry = new Date();
       premiumExpiry.setDate(premiumExpiry.getDate() + 30);
       updateData.premium_expiry = premiumExpiry.toISOString();
     } else {
       updateData.premium_expiry = null;
     }
     
     console.log(`ユーザー ${userId} のプレミアムステータスを更新します:`, updateData);
     
     // Supabaseを使用して更新を実行
     const { error } = await supabase
       .from('profiles')
       .update(updateData)
       .eq('id', userId);

     if (error) {
       console.error('プレミアム更新エラー:', error);
       throw new Error(`プレミアムステータスの更新に失敗しました: ${error.message}`);
     }
     
     // 成功したら、ユーザーリストを更新
     setUsers(users.map(user => {
       if (user.id === userId) {
         // UIでの表示のために、プレミアムステータスによってroleの表示を切り替える
         if (is_premium) {
           return { ...user, is_premium: true, role: 'premium' };
         } else {
           // プレミアムではない場合、元の役割に戻す（ただし、UIでの表示のみ）
           // 元々の役割がpremiumだった場合はuserに戻す
           const actualRole = user.role === 'premium' ? 'user' : user.role;
           return { ...user, is_premium: false, role: actualRole };
         }
       }
       return user;
     }));
     
     // 選択されているユーザーの情報も更新
     if (selectedUser && selectedUser.id === userId) {
       if (is_premium) {
         setSelectedUser({ ...selectedUser, is_premium: true, role: 'premium' });
       } else {
         const actualRole = selectedUser.role === 'premium' ? 'user' : selectedUser.role;
         setSelectedUser({ ...selectedUser, is_premium: false, role: actualRole });
       }
     }
     
     // データを再取得
     setTimeout(() => {
       fetchUsers();
     }, 300);
     
     setUpdateSuccess(true);
     setTimeout(() => setUpdateSuccess(false), 3000);
   } catch (err: any) {
     handleError(`プレミアムステータスの更新に失敗しました: ${err.message || 'エラーが発生しました'}`, err);
   }
 };

 // アカウント有効/無効の更新
 const updateAccountStatus = async (userId: string, active: boolean) => {
   try {
     setUpdateSuccess(false);
     setError(null);
     setGlobalError(null);
     
     // まず、active カラムが存在するか確認
     const { data: columns, error: columnError } = await supabase
       .from('profiles')
       .select('*')
       .limit(1);
     
     if (columnError) throw columnError;
     
     // active カラムが存在しない場合は、追加する
     if (columns && columns.length > 0 && !('active' in columns[0])) {
       const { error: alterError } = await supabase.rpc('add_active_column');
       if (alterError) {
         console.error('active カラムの追加に失敗しました:', alterError);
         setError('データベース構造の更新が必要です。管理者に連絡してください。');
         return;
       }
     }
     
     // 更新データの準備
     const updateData = { active };
     
     console.log(`ユーザー ${userId} のアカウント状態を更新します: ${active ? 'アクティブ' : '無効'}`);
     
     // Supabaseを使用して更新を実行
     const { error } = await supabase
       .from('profiles')
       .update(updateData)
       .eq('id', userId);

     if (error) {
       console.error('アカウント状態更新エラー:', error);
       throw new Error(`アカウント状態の更新に失敗しました: ${error.message}`);
     }
     
     // 成功したら、ユーザーリストを更新
     setUsers(users.map(user => {
       if (user.id === userId) {
         return { ...user, active };
       }
       return user;
     }));
     
     // 選択されているユーザーの情報も更新
     if (selectedUser && selectedUser.id === userId) {
       setSelectedUser({ ...selectedUser, active });
     }
     
     // データを再取得
     setTimeout(() => {
       fetchUsers();
     }, 300);
     
     setUpdateSuccess(true);
     setTimeout(() => setUpdateSuccess(false), 3000);
   } catch (err: any) {
     handleError(`アカウント状態の更新に失敗しました: ${err.message || 'エラーが発生しました'}`, err);
   }
 };

 // 一括操作: 権限変更
 const handleBulkRoleUpdate = async () => {
   if (!bulkRole || selectedUserIds.length === 0) return;
   
   setProcessingBulk(true);
   setError(null);
   setGlobalError(null);
   
   try {
     // プレミアム権限からそれ以外に変更されるユーザーのIDを取得
     const premiumToNonPremiumUserIds = bulkRole !== 'premium' ? users
       .filter(user => selectedUserIds.includes(user.id) && user.is_premium)
       .map(user => user.id) : [];
     
     // 更新データの準備
     let updateData: any = {};
     
     // 権限がプレミアムに変更される場合
     if (bulkRole === 'premium') {
       // プレミアム期限の計算
       const premiumExpiry = new Date();
       premiumExpiry.setDate(premiumExpiry.getDate() + 30);
       
       updateData = {
         role: 'user', // データベースには'user'として保存
         is_premium: true,
         premium_plan: 'standard',
         premium_expiry: premiumExpiry.toISOString()
       };
     } 
     // 権限がプレミアムから他の権限に変更される場合
     else if (premiumToNonPremiumUserIds.length > 0) {
       updateData = {
         role: bulkRole,
         is_premium: false,
         premium_plan: null,
         premium_expiry: null
       };
     }
     // 通常の権限変更
     else {
       updateData = {
         role: bulkRole
       };
     }
     
     console.log(`${selectedUserIds.length}件のユーザーの権限を一括更新します:`, bulkRole);
     
     // 一括更新を実行 - 一度に全部ではなく、バッチに分けて処理
     const batchSize = 25;  // バッチサイズ（一度に更新するユーザー数）
     const batches = [];
     
     // ユーザーIDをバッチに分割
     for (let i = 0; i < selectedUserIds.length; i += batchSize) {
       const batchIds = selectedUserIds.slice(i, i + batchSize);
       batches.push(batchIds);
     }
     
     // 各バッチを順番に処理
     for (const batchIds of batches) {
       const { error } = await supabase
         .from('profiles')
         .update(updateData)
         .in('id', batchIds);
       
       if (error) {
         console.error('バッチ更新エラー:', error);
         throw new Error(`一括権限更新に失敗しました: ${error.message}`);
       }
     }
     
     // 成功したら、ユーザーリストを更新
     setUsers(users.map(user => {
       if (selectedUserIds.includes(user.id)) {
         if (bulkRole === 'premium') {
           // 権限がプレミアムの場合、プレミアムステータスも更新（UIでの表示用）
           return { ...user, role: 'premium', is_premium: true };
         } else if (user.is_premium && (user.role === 'premium' || user.role === 'user')) {
           // 権限がプレミアムから他の権限に変更される場合
           return { ...user, role: bulkRole, is_premium: false };
         } else {
           // 通常の権限変更
           return { ...user, role: bulkRole };
         }
       }
       return user;
     }));
     
     // データを再取得
     setTimeout(() => {
       fetchUsers();
     }, 300);
     
     setUpdateSuccess(true);
     setTimeout(() => setUpdateSuccess(false), 3000);
     
     // リセット
     setBulkRole('');
     setSelectedUserIds([]);
     setShowBulkActions(false);
   } catch (err: any) {
     handleError(`一括権限更新に失敗しました: ${err.message || 'エラーが発生しました'}`, err);
   } finally {
     setProcessingBulk(false);
   }
 };

 // 一括操作: プレミアムステータス変更
 const handleBulkPremiumUpdate = async () => {
   if (!bulkPremium || selectedUserIds.length === 0) return;
   
   setProcessingBulk(true);
   setError(null);
   setGlobalError(null);
   
   try {
     const is_premium = bulkPremium === 'true';

     // 更新データを準備
     const updateData: any = { 
       is_premium,
       premium_plan: is_premium ? 'standard' : null,
     };
     
     // プレミアム期限の設定
     if (is_premium) {
       const premiumExpiry = new Date();
       premiumExpiry.setDate(premiumExpiry.getDate() + 30);
       updateData.premium_expiry = premiumExpiry.toISOString();
       
       // プレミアム化する場合は、roleも「user」に設定（DBでの表現）
       updateData.role = 'user';
     } else {
       updateData.premium_expiry = null;
       // プレミアムを解除する場合はroleは変更しない
     }
     
     console.log(`${selectedUserIds.length}件のユーザーのプレミアムステータスを一括更新します:`, is_premium ? 'プレミアム' : '一般');
     
     // バッチ処理で一括更新
     const batchSize = 25;
     const batches = [];
     
     for (let i = 0; i < selectedUserIds.length; i += batchSize) {
       const batchIds = selectedUserIds.slice(i, i + batchSize);
       batches.push(batchIds);
     }
     
     for (const batchIds of batches) {
       const { error } = await supabase
         .from('profiles')
         .update(updateData)
         .in('id', batchIds);
       
       if (error) {
         console.error('バッチ更新エラー:', error);
         throw new Error(`一括プレミアムステータス更新に失敗しました: ${error.message}`);
       }
     }
     
     // 成功したら、ユーザーリストを更新
     setUsers(users.map(user => {
       if (selectedUserIds.includes(user.id)) {
         // UIでは、プレミアムステータスによってroleの表示を切り替える
         if (is_premium) {
           return { ...user, is_premium: true, role: 'premium' };
         } else {
           const actualRole = user.role === 'premium' ? 'user' : user.role;
           return { ...user, is_premium: false, role: actualRole };
         }
       }
       return user;
     }));
     
     // データを再取得
     setTimeout(() => {
       fetchUsers();
     }, 300);
     
     setUpdateSuccess(true);
     setTimeout(() => setUpdateSuccess(false), 3000);
     
     // リセット
     setBulkPremium('');
     setSelectedUserIds([]);
     setShowBulkActions(false);
   } catch (err: any) {
     handleError(`一括プレミアムステータス更新に失敗しました: ${err.message || 'エラーが発生しました'}`, err);
   } finally {
     setProcessingBulk(false);
   }
 };

 // 一括操作: アカウント有効/無効変更
 const handleBulkActiveUpdate = async () => {
   if (!bulkActive || selectedUserIds.length === 0) return;
   
   setProcessingBulk(true);
   setError(null);
   setGlobalError(null);
   
   try {
     const active = bulkActive === 'true';
     
     console.log(`${selectedUserIds.length}件のユーザーのアカウント状態を一括更新します:`, active ? 'アクティブ' : '無効');
     
     // バッチ処理で一括更新
     const batchSize = 25;
     const batches = [];
     
     for (let i = 0; i < selectedUserIds.length; i += batchSize) {
       const batchIds = selectedUserIds.slice(i, i + batchSize);
       batches.push(batchIds);
     }
     
     for (const batchIds of batches) {
       const { error } = await supabase
       .from('profiles')
       .update({ active })
       .in('id', batchIds);
     
     if (error) {
       console.error('バッチ更新エラー:', error);
       throw new Error(`一括アカウント状態更新に失敗しました: ${error.message}`);
     }
   }
   
   // 成功したら、ユーザーリストを更新
   setUsers(users.map(user => {
     if (selectedUserIds.includes(user.id)) {
       return { ...user, active };
     }
     return user;
   }));
   
   // データを再取得
   setTimeout(() => {
     fetchUsers();
   }, 300);
   
   setUpdateSuccess(true);
   setTimeout(() => setUpdateSuccess(false), 3000);
   
   // リセット
   setBulkActive('');
   setSelectedUserIds([]);
   setShowBulkActions(false);
 } catch (err: any) {
   handleError(`一括アカウント状態更新に失敗しました: ${err.message || 'エラーが発生しました'}`, err);
 } finally {
   setProcessingBulk(false);
 }
};

// すべてのユーザーを選択/選択解除
const toggleSelectAll = () => {
 if (selectedUserIds.length === users.length) {
   // すべて選択済みなら、すべて選択解除
   setSelectedUserIds([]);
 } else {
   // そうでなければ、すべて選択
   setSelectedUserIds(users.map(user => user.id));
 }
};

// 個別ユーザーの選択/選択解除
const toggleSelectUser = (userId: string) => {
 if (selectedUserIds.includes(userId)) {
   // 選択済みなら、選択解除
   setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
 } else {
   // そうでなければ、選択追加
   setSelectedUserIds([...selectedUserIds, userId]);
 }
};

// ユーザーの詳細を表示
const showUserDetail = (user: User) => {
 setSelectedUser(user);
 setEditMode(false);
};

// 編集モードの切り替え
const toggleEditMode = () => {
 setEditMode(!editMode);
};

// ユーザー詳細画面を閉じる
const closeDetail = () => {
 setSelectedUser(null);
 setEditMode(false);
};

// ページネーション処理
const handlePageChange = (newPage: number) => {
 setPage(newPage);
 setSelectedUserIds([]); // ページ変更時に選択をリセット
};

const totalPages = Math.ceil(totalCount / perPage);

// ローディング中の表示
if (loading && users.length === 0) {
 return <LoadingSpinner />;
}

return (
 <div className="container mx-auto px-4 py-6">
   {error && (
     <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
       {error}
     </div>
   )}
   
   {updateSuccess && (
     <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
       ユーザー情報が正常に更新されました。
     </div>
   )}

   <div className="flex justify-between items-center mb-6">
     <h2 className="text-2xl font-bold">ユーザー管理</h2>
     <div className="flex space-x-2">
       <button
         onClick={() => {
           setRefreshCounter(prev => prev + 1);
           fetchUsers();
           // グローバルなデータも更新
           refreshData();
         }}
         className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
       >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
           <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
         </svg>
         最新データに更新
       </button>
     </div>
   </div>

   {/* 更新ナビゲーションガイド - 追加 */}
   <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
     <div className="flex items-center">
       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
         <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
       </svg>
       <span className="font-medium">データが反映されない場合:</span>
     </div>
     <p className="mt-1 ml-7">ユーザー情報を更新後、変更が画面に反映されない場合は「最新データに更新」ボタンをクリックしてください。</p>
   </div>

   {/* 検索フォーム */}
   <div className="bg-white shadow rounded-lg p-6 mb-6">
     <h3 className="text-lg font-semibold mb-4">ユーザー検索</h3>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
       <div>
         <label className="block text-gray-700 text-sm font-bold mb-2">
           ユーザー名
         </label>
         <input
           type="text"
           value={searchUsername}
           onChange={(e) => setSearchUsername(e.target.value)}
           className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
           placeholder="ユーザー名で検索"
         />
       </div>
       <div>
         <label className="block text-gray-700 text-sm font-bold mb-2">
           ユーザーID
         </label>
         <input
           type="text"
           value={searchUserId}
           onChange={(e) => setSearchUserId(e.target.value)}
           className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
           placeholder="ユーザーIDで検索"
         />
       </div>
       <div>
         <label className="block text-gray-700 text-sm font-bold mb-2">
           権限
         </label>
         <select
           value={searchRole}
           onChange={(e) => setSearchRole(e.target.value)}
           className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
         >
           <option value="">すべて</option>
           <option value="user">一般ユーザー</option>
           <option value="premium">プレミアムユーザー</option>
           <option value="youtuber">YouTuber</option>
           <option value="admin">管理者</option>
         </select>
       </div>
       <div>
         <label className="block text-gray-700 text-sm font-bold mb-2">
           プレミアムステータス
         </label>
         <select
           value={searchPremium}
           onChange={(e) => setSearchPremium(e.target.value)}
           className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
         >
           <option value="">すべて</option>
           <option value="true">プレミアム会員</option>
           <option value="false">一般会員</option>
         </select>
       </div>
       <div>
         <label className="block text-gray-700 text-sm font-bold mb-2">
           アカウント状態
         </label>
         <select
           value={searchActive}
           onChange={(e) => setSearchActive(e.target.value)}
           className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
         >
           <option value="">すべて</option>
           <option value="true">有効</option>
           <option value="false">無効</option>
         </select>
       </div>
     </div>
     <div className="flex justify-end space-x-2">
       <button
         onClick={resetSearch}
         className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
       >
         リセット
       </button>
       <button
         onClick={handleSearch}
         className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
       >
         検索
       </button>
     </div>
   </div>

   {/* 検索中の表示 */}
   {isSearching && Object.keys(searchParams).length > 0 && (
     <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
       <span>
         検索条件: 
         {searchParams.username && ` ユーザー名: "${searchParams.username}"`}
         {searchParams.userId && ` ユーザーID: "${searchParams.userId}"`}
         {searchParams.role && searchParams.role !== 'all' && ` 権限: "${
           searchParams.role === 'admin' ? '管理者' : 
           searchParams.role === 'youtuber' ? 'YouTuber' :
           searchParams.role === 'premium' ? 'プレミアム' : '一般'
         }"`}
         {searchParams.premium !== null && searchParams.premium !== undefined && 
           ` プレミアム: "${searchParams.premium ? 'はい' : 'いいえ'}"`
         }
         {searchParams.active !== null && searchParams.active !== undefined && 
           ` アカウント状態: "${searchParams.active ? '有効' : '無効'}"`
         }
       </span>
       <button
         onClick={resetSearch}
         className="ml-4 text-blue-700 hover:text-blue-900"
       >
         ✕ クリア
       </button>
     </div>
   )}

   {/* 一括操作パネル */}
   {selectedUserIds.length > 0 && (
     <div className="bg-white shadow rounded-lg p-4 mb-6">
       <div className="flex justify-between items-center mb-4">
         <h3 className="text-lg font-semibold">
           一括操作 ({selectedUserIds.length}件選択中)
         </h3>
         <div>
           <button
             onClick={() => setShowBulkActions(!showBulkActions)}
             className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
           >
             {showBulkActions ? '閉じる' : '操作を表示'}
           </button>
           <button
             onClick={() => setSelectedUserIds([])}
             className="ml-2 px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
           >
             選択解除
           </button>
         </div>
       </div>

       {showBulkActions && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           <div>
             <label className="block text-gray-700 text-sm font-bold mb-2">
               権限一括変更
             </label>
             <div className="flex space-x-2">
               <select
                 value={bulkRole}
                 onChange={(e) => setBulkRole(e.target.value)}
                 className="shadow border rounded flex-grow py-2 px-3 text-gray-700"
                 disabled={processingBulk}
               >
                 <option value="">選択してください</option>
                 <option value="user">一般ユーザー</option>
                 <option value="premium">プレミアムユーザー</option>
                 <option value="youtuber">YouTuber</option>
                 <option value="admin">管理者</option>
               </select>
               <button
                 onClick={handleBulkRoleUpdate}
                 disabled={!bulkRole || processingBulk}
                 className={`px-4 py-2 rounded ${
                   !bulkRole || processingBulk
                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     : 'bg-blue-500 text-white hover:bg-blue-600'
                 }`}
               >
                 {processingBulk ? '処理中...' : '適用'}
               </button>
             </div>
             <p className="text-xs text-gray-500 mt-1">
               ※「プレミアムユーザー」を選択すると自動的にプレミアムステータスも「はい」になります
             </p>
             <p className="text-xs text-gray-500 mt-1">
               ※「プレミアムユーザー」以外を選択すると、権限が「プレミアムユーザー」のユーザーはプレミアムステータスが「いいえ」になります
             </p>
           </div>
           <div>
             <label className="block text-gray-700 text-sm font-bold mb-2">
               プレミアム一括変更
             </label>
             <div className="flex space-x-2">
               <select
                 value={bulkPremium}
                 onChange={(e) => setBulkPremium(e.target.value)}
                 className="shadow border rounded flex-grow py-2 px-3 text-gray-700"
                 disabled={processingBulk}
               >
                 <option value="">選択してください</option>
                 <option value="true">プレミアム会員にする</option>
                 <option value="false">一般会員にする</option>
               </select>
               <button
                 onClick={handleBulkPremiumUpdate}
                 disabled={!bulkPremium || processingBulk}
                 className={`px-4 py-2 rounded ${
                   !bulkPremium || processingBulk
                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     : 'bg-blue-500 text-white hover:bg-blue-600'
                 }`}
               >
                 {processingBulk ? '処理中...' : '適用'}
               </button>
             </div>
             <p className="text-xs text-gray-500 mt-1">
               ※プレミアム会員を「いいえ」にすると、権限が「プレミアムユーザー」のユーザーは「一般ユーザー」に変更されます
             </p>
             <p className="text-xs text-gray-500 mt-1">
               ※プレミアム会員を「はい」にすると、権限が「一般ユーザー」のユーザーは「プレミアムユーザー」に変更されます
             </p>
           </div>
           <div>
             <label className="block text-gray-700 text-sm font-bold mb-2">
               アカウント状態一括変更
             </label>
             <div className="flex space-x-2">
               <select
                 value={bulkActive}
                 onChange={(e) => setBulkActive(e.target.value)}
                 className="shadow border rounded flex-grow py-2 px-3 text-gray-700"
                 disabled={processingBulk}
               >
                 <option value="">選択してください</option>
                 <option value="true">有効にする</option>
                 <option value="false">無効にする</option>
               </select>
               <button
                 onClick={handleBulkActiveUpdate}
                 disabled={!bulkActive || processingBulk}
                 className={`px-4 py-2 rounded ${
                   !bulkActive || processingBulk
                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     : 'bg-blue-500 text-white hover:bg-blue-600'
                 }`}
               >
                 {processingBulk ? '処理中...' : '適用'}
               </button>
             </div>
             <p className="text-xs text-gray-500 mt-1">
               ※アカウントを無効にすると、ユーザーはログインできなくなります
             </p>
           </div>
         </div>
       )}
     </div>
   )}

   {selectedUser ? (
     <div className="bg-white shadow rounded-lg p-6 mb-6">
       <div className="flex justify-between items-center mb-4">
         <h3 className="text-xl font-semibold">ユーザー詳細</h3>
         <div className="flex space-x-2">
           <button
             onClick={toggleEditMode}
             className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
           >{editMode ? '詳細表示' : '編集'}
           </button>
           <button
             onClick={closeDetail}
             className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
           >
             閉じる
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="mb-4">
           <label className="block text-gray-700 text-sm font-bold mb-2">
             ユーザー名
           </label>
           <div className="bg-gray-100 p-2 rounded">
             {selectedUser.username || 'N/A'}
           </div>
         </div>

         <div className="mb-4">
           <label className="block text-gray-700 text-sm font-bold mb-2">
             ユーザーID
           </label>
           <div className="bg-gray-100 p-2 rounded text-sm break-all">
             {selectedUser.id}
           </div>
         </div>

         <div className="mb-4">
           <label className="block text-gray-700 text-sm font-bold mb-2">
             登録日
           </label>
           <div className="bg-gray-100 p-2 rounded">
             {new Date(selectedUser.created_at).toLocaleDateString('ja-JP')}
           </div>
         </div>

         <div className="mb-4">
           <label className="block text-gray-700 text-sm font-bold mb-2">
             権限
           </label>
           {editMode ? (
             <div>
               <select
                 className="shadow border rounded w-full py-2 px-3 text-gray-700 mb-1"
                 value={selectedUser.role}
                 onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
               >
                 <option value="user">一般ユーザー</option>
                 <option value="premium">プレミアムユーザー</option>
                 <option value="youtuber">YouTuber</option>
                 <option value="admin">管理者</option>
               </select>
               <p className="text-xs text-gray-500">
                 ※「プレミアムユーザー」を選択すると自動的にプレミアムステータスも「はい」になります
               </p>
               {selectedUser.is_premium && (
                 <p className="text-xs text-gray-500">
                   ※「プレミアムユーザー」以外を選択すると、プレミアムステータスが「いいえ」になります
                 </p>
               )}
             </div>
           ) : (
             <div className="bg-gray-100 p-2 rounded">
               {selectedUser.role === 'admin' ? '管理者' : 
                selectedUser.role === 'youtuber' ? 'YouTuber' :
                selectedUser.role === 'premium' ? 'プレミアムユーザー' : '一般ユーザー'}
             </div>
           )}
         </div>

         <div className="mb-4">
           <label className="block text-gray-700 text-sm font-bold mb-2">
             プレミアムステータス
           </label>
           {editMode ? (
             <div>
               <div className="flex items-center mb-1">
                 <input
                   type="checkbox"
                   checked={selectedUser.is_premium}
                   onChange={(e) => updatePremiumStatus(selectedUser.id, e.target.checked)}
                   className="mr-2"
                 />
                 <span>プレミアム会員</span>
               </div>
               {selectedUser.role === 'premium' && !selectedUser.is_premium && (
                 <p className="text-xs text-red-500">
                   ※プレミアムステータスをOFFにすると、権限が「プレミアムユーザー」から「一般ユーザー」に変更されます
                 </p>
               )}
               {selectedUser.role === 'user' && selectedUser.is_premium && (
                 <p className="text-xs text-red-500">
                   ※プレミアムステータスをONにすると、権限が「一般ユーザー」から「プレミアムユーザー」に変更されます
                 </p>
               )}
             </div>
           ) : (
             <div className="bg-gray-100 p-2 rounded">
               {selectedUser.is_premium ? 'はい' : 'いいえ'}
             </div>
           )}
         </div>

         <div className="mb-4">
           <label className="block text-gray-700 text-sm font-bold mb-2">
             アカウント状態
           </label>
           {editMode ? (
             <div>
               <div className="flex items-center mb-1">
                 <input
                   type="checkbox"
                   checked={selectedUser.active}
                   onChange={(e) => updateAccountStatus(selectedUser.id, e.target.checked)}
                   className="mr-2"
                 />
                 <span>アカウント有効</span>
               </div>
               <p className="text-xs text-gray-500">
                 ※アカウントを無効にすると、ユーザーはログインできなくなります
               </p>
             </div>
           ) : (
             <div className={`bg-gray-100 p-2 rounded ${!selectedUser.active ? 'text-red-600 font-semibold' : ''}`}>
               {selectedUser.active ? '有効' : '無効'}
             </div>
           )}
         </div>

         {selectedUser.avatar_url && (
           <div className="mb-4 col-span-2">
             <label className="block text-gray-700 text-sm font-bold mb-2">
               アバター
             </label>
             <div className="bg-gray-100 p-2 rounded">
               <img 
                 src={selectedUser.avatar_url} 
                 alt={`${selectedUser.username}のアバター`}
                 className="h-20 w-20 object-cover rounded-full" 
               />
             </div>
           </div>
         )}
       </div>
     </div>
   ) : (
     <div className="bg-white shadow overflow-hidden rounded-lg">
       <table className="min-w-full divide-y divide-gray-200">
         <thead className="bg-gray-50">
           <tr>
             <th className="px-2 py-3 text-left">
               <input
                 type="checkbox"
                 checked={users.length > 0 && selectedUserIds.length === users.length}
                 onChange={toggleSelectAll}
                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
               />
             </th>
             <th 
               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
               onClick={() => handleSort('username')}
             >
               <div className="flex items-center">
                 ユーザー名
                 {renderSortIcon('username')}
               </div>
             </th>
             <th 
               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
               onClick={() => handleSort('role')}
             >
               <div className="flex items-center">
                 権限
                 {renderSortIcon('role')}
               </div>
             </th>
             <th 
               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
               onClick={() => handleSort('is_premium')}
             >
               <div className="flex items-center">
                 プレミアム
                 {renderSortIcon('is_premium')}
               </div>
             </th>
             <th 
               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
               onClick={() => handleSort('active')}
             >
               <div className="flex items-center">
                 状態
                 {renderSortIcon('active')}
               </div>
             </th>
             <th 
               className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
               onClick={() => handleSort('created_at')}
             >
               <div className="flex items-center">
                 登録日
                 {renderSortIcon('created_at')}
               </div>
             </th>
             <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
               アクション
             </th>
           </tr>
         </thead>
         <tbody className="bg-white divide-y divide-gray-200">
           {users.length > 0 ? (
             users.map((user) => (
               <tr key={user.id} className={`hover:bg-gray-50 ${selectedUserIds.includes(user.id) ? 'bg-blue-50' : ''} ${!user.active ? 'bg-red-50' : ''}`}>
                 <td className="px-2 py-4 whitespace-nowrap">
                   <input
                     type="checkbox"
                     checked={selectedUserIds.includes(user.id)}
                     onChange={() => toggleSelectUser(user.id)}
                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                   />
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                     {user.avatar_url ? (
                       <img
                         src={user.avatar_url}
                         alt={`${user.username}のアバター`}
                         className="h-10 w-10 rounded-full mr-3"
                       />
                     ) : (
                       <div className="h-10 w-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                         <span className="text-gray-600">{user.username?.charAt(0).toUpperCase()}</span>
                       </div>
                     )}
                     <div className="text-sm font-medium text-gray-900">
                       {user.username || 'N/A'}
                     </div>
                   </div>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                     ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                       user.role === 'youtuber' ? 'bg-blue-100 text-blue-800' : 
                       user.role === 'premium' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'}`}
                  >
                  {user.role === 'admin' ? '管理者' : 
                       user.role === 'youtuber' ? 'YouTuber' :
                       user.role === 'premium' ? 'プレミアム' : '一般'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.is_premium ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {user.is_premium ? 'はい' : 'いいえ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {user.active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => showUserDetail(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      詳細
                    </button>
                    <button
                      onClick={() => updateAccountStatus(user.id, !user.active)}
                      className={`ml-4 ${user.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {user.active ? '無効化' : '有効化'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                  {isSearching ? '検索条件に一致するユーザーが見つかりませんでした。' : 'ユーザーが見つかりませんでした。'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                前へ
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  <span>{totalCount > 0 ? (page - 1) * perPage + 1 : 0}</span>
                  <span> から </span>
                  <span>{Math.min(page * perPage, totalCount)}</span>
                  <span> / 全 </span>
                  <span>{totalCount}</span>
                  <span> 件</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">最初へ</span>
                    «
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">前へ</span>
                    ‹
                  </button>
                  
                  {/* ページ番号表示 */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      // 5ページ以下ならすべて表示
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      // 現在が3ページ以下なら1~5を表示
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      // 現在が後ろから3ページ以内なら最後の5ページを表示
                      pageNum = totalPages - 4 + i;
                    } else {
                      // それ以外なら現在ページの前後2ページを表示
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        aria-current={page === pageNum ? 'page' : undefined}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">次へ</span>
                    ›
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">最後へ</span>
                    »
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
 );
};

export default UserManagement;