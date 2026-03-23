import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import { X, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface CharacterEditorModalProps {
  isOpen: boolean;
  characters: Character[];
  editingCharacterId?: string | null;
  onClose: () => void;
  onSave: (updatedCharacters: Character[]) => void;
}

export function CharacterEditorModal({ isOpen, characters, editingCharacterId, onClose, onSave }: CharacterEditorModalProps) {
  const [editedCharacter, setEditedCharacter] = useState<Character | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingCharacterId) {
        const char = characters.find(c => c.id === editingCharacterId);
        setEditedCharacter(char ? JSON.parse(JSON.stringify(char)) : null);
      } else {
        setEditedCharacter({
          id: `char-${Date.now()}`,
          name: '',
          age: '',
          role: '',
          personality: '',
          relationships: '',
          want: '',
          need: ''
        });
      }
      setShowConfirm(false);
    }
  }, [isOpen, characters, editingCharacterId]);

  if (!isOpen || !editedCharacter) return null;

  const handleRemoveCharacter = () => {
    const updatedCharacters = characters.filter(c => c.id !== editedCharacter.id);
    onSave(updatedCharacters);
    onClose();
  };

  const handleChange = (field: keyof Character, value: string) => {
    setEditedCharacter({ ...editedCharacter, [field]: value });
  };

  const handleSaveClick = () => {
    let hasChanged = false;
    if (editingCharacterId) {
      const originalChar = characters.find(c => c.id === editingCharacterId);
      hasChanged = JSON.stringify(originalChar) !== JSON.stringify(editedCharacter);
    } else {
      hasChanged = true; // New character
    }

    if (hasChanged) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmSave = () => {
    let updatedCharacters;
    if (editingCharacterId) {
      updatedCharacters = characters.map(c => c.id === editingCharacterId ? editedCharacter : c);
    } else {
      updatedCharacters = [...characters, editedCharacter];
    }
    onSave(updatedCharacters);
    setShowConfirm(false);
    onClose();
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-theme-card border border-theme-border rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
          <button
            onClick={() => setShowConfirm(false)}
            className="absolute top-6 right-6 text-theme-muted hover:text-theme-accent transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <h2 className="text-2xl font-bold text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Cảnh báo quan trọng
          </h2>
          <p className="text-theme-muted mb-8">
            Việc thay đổi thông tin nhân vật sẽ làm <strong>xóa toàn bộ kịch bản chi tiết</strong> đã được tạo ở các phân đoạn bên dưới để đảm bảo tính nhất quán của câu chuyện. Bạn có chắc chắn muốn tiếp tục?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-6 py-3 rounded-xl font-bold text-theme-accent hover:bg-theme-btn-sec transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmSave}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all"
            >
              Xác nhận & Reset kịch bản
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card border border-theme-border rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-theme-muted hover:text-theme-accent transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-theme-accent mb-6 flex items-center gap-2 shrink-0">
          {editingCharacterId ? 'Chỉnh sửa nhân vật' : 'Thêm nhân vật mới'}
        </h2>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
          <div className="bg-black/20 p-6 rounded-2xl border border-theme-border relative">
            {editingCharacterId && (
              <button
                onClick={handleRemoveCharacter}
                className="absolute top-4 right-4 p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                title="Xóa nhân vật"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-theme-muted uppercase">Tên nhân vật / Name</label>
                <input
                  type="text"
                  value={editedCharacter.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-theme-muted uppercase">Tuổi / Age</label>
                <input
                  type="text"
                  value={editedCharacter.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-theme-muted uppercase">Vai trò / Role</label>
                <input
                  type="text"
                  value={editedCharacter.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-theme-muted uppercase">Phong cách thiết kế / Style</label>
                <select
                  value={editedCharacter.style || 'Realism'}
                  onChange={(e) => handleChange('style', e.target.value)}
                  className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50"
                >
                  <option value="Realism">Realism</option>
                  <option value="Semi-realism">Semi-realism</option>
                  <option value="3D Animation">3D Animation</option>
                  <option value="2D Animation">2D Animation</option>
                  <option value="Anime">Anime</option>
                  <option value="Oil Painting">Oil Painting</option>
                  <option value="Watercolor">Watercolor</option>
                  <option value="Sketch">Sketch</option>
                  <option value="Pixel Art">Pixel Art</option>
                  <option value="Cinematic">Cinematic</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-theme-muted uppercase">Tính cách / Personality</label>
                <textarea
                  value={editedCharacter.personality}
                  onChange={(e) => handleChange('personality', e.target.value)}
                  className="w-full h-20 bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50 resize-none custom-scrollbar"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-theme-muted uppercase">Mối quan hệ / Relationships</label>
                <textarea
                  value={editedCharacter.relationships}
                  onChange={(e) => handleChange('relationships', e.target.value)}
                  className="w-full h-20 bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50 resize-none custom-scrollbar"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-theme-muted uppercase">Want (Điều nhân vật muốn)</label>
                <textarea
                  value={editedCharacter.want}
                  onChange={(e) => handleChange('want', e.target.value)}
                  className="w-full h-24 bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50 resize-none custom-scrollbar"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-theme-muted uppercase">Need (Điều nhân vật cần)</label>
                <textarea
                  value={editedCharacter.need}
                  onChange={(e) => handleChange('need', e.target.value)}
                  className="w-full h-24 bg-theme-input border border-theme-border rounded-xl p-3 text-theme-text focus:outline-none focus:border-theme-accent/50 resize-none custom-scrollbar"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 shrink-0 pt-6 border-t border-theme-border">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-theme-accent hover:bg-theme-btn-sec transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveClick}
            className="px-6 py-3 bg-theme-accent hover:bg-theme-accent/80 text-theme-accent-text rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            <Save className="w-5 h-5" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
