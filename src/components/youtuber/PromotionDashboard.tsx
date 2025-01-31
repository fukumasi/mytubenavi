import {  useState, useEffect } from 'react';
import { 
    Upload,
    Edit,
    Trash2,
    DollarSign,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getProfile } from '../../lib/supabase';
import type { Profile } from '../../types';


export default function PromotionDashboard() {
    const { currentUser } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            if(currentUser?.id) {
                try {
                    const userProfile = await getProfile();
                    setProfile(userProfile);
                } catch (error) {
                    console.error('Error fetching profile:', error);
                }
          }

        setLoading(false);
      };
  
      fetchProfile();
    }, [currentUser]);
  return (
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-lg shadow-sm p-4">
                   <div className="flex items-center space-x-3 mb-6">
                      <div>
                      <h2 className="text-sm font-medium text-gray-900">
                            {profile?.username || currentUser?.user_metadata?.channel_name}
                        </h2>
                        <p className="text-xs text-gray-500">YouTuber</p>
                      </div>
                    </div>

                    <button className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 mb-6">
                        <Upload className="inline-block w-4 h-4 mr-2" />
                        掲載枠を登録する
                    </button>
                     
                </div>
            </div>

             <div className="flex-grow">
                  <div className="space-y-8 mt-12">
                    {/* 掲載枠管理 */}
                    <section>
                    
                    <div className="flex items-center mb-4">
                      <DollarSign className="h-6 w-6 text-indigo-600 mr-2" />
                      <h2 className="text-2xl font-bold text-gray-900">掲載枠管理</h2>
                   </div>
                    {loading ? (
                      <p>Loading...</p>
                     ) : (
                        
                        <div className="bg-white rounded-lg shadow-sm">
                           <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <h2 className="text-lg font-medium text-gray-900">掲載枠一覧</h2>
                                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                    <Upload className="h-4 w-4 mr-2" />
                                    新規作成
                                </button>
                              </div>
                           </div>
                             <div className="divide-y divide-gray-200">
                                <div  className="p-6 flex items-start space-x-4">
                                    <div className="relative flex-shrink-0 w-48">
                                        掲載枠の画像
                                       </div>
                                    <div className="flex-grow">
                                        <h3 className="text-sm font-medium text-gray-900">掲載枠の名前</h3>
                                       <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                                         <span >掲載枠の説明文</span>
                                        </div>
                                    </div>
                                        <div className="flex items-center space-x-2">
                                        <button className="p-2 text-gray-400 hover:text-gray-500">
                                          <Edit className="h-5 w-5" />
                                         </button>
                                          <button className="p-2 text-gray-400 hover:text-red-500">
                                            <Trash2 className="h-5 w-5" />
                                          </button>
                                         </div>
                                 </div>
                                 
                              </div>
                          </div>
                     )}
                    </section>

                </div>
             </div>
        </div>
      
  );
}