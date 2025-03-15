import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../ui/LoadingSpinner';

type User = {
  id: string;
  username: string;
  email?: string;
  role: string;
  is_premium: boolean;
  created_at: string;
  avatar_url?: string;
  active?: boolean;
};

type SortField = 'username' | 'role' | 'is_premium' | 'created_at';
type SortOrder = 'asc' | 'desc';

const UserManagement: React.FC = () => {
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

  // ユーザーデータの取得
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // プロファイルテーブルからユーザー情報を取得
      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .range((page - 1) * perPage, page * perPage - 1)
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      
      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('ユーザー情報の取得に失敗しました:', err);
      setError('ユーザー情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, perPage, sortField, sortOrder]);

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
      
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      
      // 成功したら、ユーザーリストを更新
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role } : user
      ));
      
      setSelectedUser(selectedUser && selectedUser.id === userId 
        ? { ...selectedUser, role } 
        : selectedUser
      );
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error('ユーザー権限の更新に失敗しました:', err);
      setError('ユーザー権限の更新に失敗しました。');
    }
  };

  // プレミアムステータスの更新
  const updatePremiumStatus = async (userId: string, is_premium: boolean) => {
    try {
      setUpdateSuccess(false);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_premium,
          premium_plan: is_premium ? 'standard' : null,
          premium_expiry: is_premium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
        })
        .eq('id', userId);

      if (error) throw error;
      
      // 成功したら、ユーザーリストを更新
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_premium } : user
      ));
      
      setSelectedUser(selectedUser && selectedUser.id === userId 
        ? { ...selectedUser, is_premium } 
        : selectedUser
      );
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error('プレミアムステータスの更新に失敗しました:', err);
      setError('プレミアムステータスの更新に失敗しました。');
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
            onClick={() => fetchUsers()}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            更新
          </button>
        </div>
      </div>

      {selectedUser ? (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">ユーザー詳細</h3>
            <div className="flex space-x-2">
              <button
                onClick={toggleEditMode}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {editMode ? '詳細表示' : '編集'}
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
                <select
                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                  value={selectedUser.role}
                  onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
                >
                  <option value="user">一般ユーザー</option>
                  <option value="premium">プレミアムユーザー</option>
                  <option value="youtuber">YouTuber</option>
                  <option value="admin">管理者</option>
                </select>
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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUser.is_premium}
                    onChange={(e) => updatePremiumStatus(selectedUser.id, e.target.checked)}
                    className="mr-2"
                  />
                  <span>プレミアム会員</span>
                </div>
              ) : (
                <div className="bg-gray-100 p-2 rounded">
                  {selectedUser.is_premium ? 'はい' : 'いいえ'}
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
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
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
                  </td>
                </tr>
              ))}
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
                    <span>{(page - 1) * perPage + 1}</span>
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