//src/components/events/CreateEventModal.tsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

interface EventFormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  type: 'online' | 'offline';
  location: string;
  meeting_url: string;
  max_participants: number;
  price: number;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: EventFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData
}: CreateEventModalProps) {
  const updateForm = (updates: Partial<EventFormData>) => {
    setFormData(current => ({
      ...current,
      ...updates
    }));
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-10 inset-0 overflow-y-auto"
        onClose={onClose}
      >
        <div className="flex items-center justify-center min-h-screen">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>

          <div className="relative bg-white rounded-lg w-full max-w-md p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>

            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              イベントを作成
            </Dialog.Title>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  タイトル
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  説明
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    開始日時
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_date}
                    onChange={(e) => updateForm({ start_date: e.target.value })}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    終了日時
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_date}
                    onChange={(e) => updateForm({ end_date: e.target.value })}
                    min={formData.start_date}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  イベントタイプ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const type = e.target.value as 'online' | 'offline';
                    updateForm({ 
                      type,
                      location: type === 'offline' ? formData.location : '',
                      meeting_url: type === 'online' ? formData.meeting_url : ''
                    });
                  }}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="online">オンライン</option>
                  <option value="offline">オフライン</option>
                </select>
              </div>

              {formData.type === 'offline' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    開催場所
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => updateForm({ location: e.target.value })}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ミーティングURL
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.meeting_url}
                    onChange={(e) => updateForm({ meeting_url: e.target.value })}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    参加人数上限
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_participants}
                    onChange={(e) => updateForm({ max_participants: parseInt(e.target.value) })}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    参加費
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => updateForm({ price: parseInt(e.target.value) })}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}