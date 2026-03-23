import React, { useEffect, useState, useRef } from 'react';
import { Send, X, Edit3, Film } from 'lucide-react';
import { MultishotComplexity } from '../services/ai';

interface SelectionTooltipProps {
  onEdit?: (text: string, prompt: string) => void;
  onMultishot?: (text: string, duration: number, complexity: MultishotComplexity) => void;
}

export function SelectionTooltip({ onEdit, onMultishot }: SelectionTooltipProps) {
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isMultishot, setIsMultishot] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState<MultishotComplexity>('medium');
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      
      if (tooltipRef.current && tooltipRef.current.contains(document.activeElement)) {
        return;
      }

      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const text = sel.toString().trim();
        if (text.length > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelection({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
          setIsEditing(false);
          setIsMultishot(false);
          setPrompt('');
          return;
        }
      }
      setSelection(null);
      setIsEditing(false);
      setIsMultishot(false);
      setPrompt('');
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  if (!selection) return null;

  const lines = selection.text.split('\n').reduce((acc, line) => {
    return acc + Math.ceil(line.length / 50) + 1;
  }, 0);
  
  const minutes = lines / 55;
  const seconds = Math.round(minutes * 60);

  let displayTime = '';
  if (seconds < 60) {
    displayTime = `~${seconds} giây`;
  } else {
    displayTime = `~${minutes.toFixed(1)} phút`;
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsMultishot(false);
  };

  const handleMultishotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMultishot(true);
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && onEdit) {
      onEdit(selection.text, prompt);
      setSelection(null);
      setIsEditing(false);
      setIsMultishot(false);
      setPrompt('');
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleMultishotSelect = (duration: number) => {
    if (onMultishot) {
      onMultishot(selection.text, duration, selectedComplexity);
      setSelection(null);
      setIsEditing(false);
      setIsMultishot(false);
      setPrompt('');
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleClose = () => {
    setSelection(null);
    setIsEditing(false);
    setIsMultishot(false);
    setPrompt('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      ref={tooltipRef}
      onMouseDown={(e) => { if (!isEditing && !isMultishot) e.preventDefault(); }}
      className={`fixed z-50 bg-theme-card/95 text-theme-text rounded-xl shadow-2xl text-sm font-medium transform -translate-x-1/2 -translate-y-full backdrop-blur-md border border-theme-accent/30 transition-all ${(isEditing || isMultishot) ? 'w-80 p-4' : 'px-3 py-1.5 pointer-events-auto'}`}
      style={{ left: selection.x, top: selection.y }}
    >
      {(!isEditing && !isMultishot) ? (
        <div className="flex items-center gap-2">
          <span>{displayTime}</span>
          {onEdit && (
            <button onClick={handleEditClick} className="text-theme-accent/70 hover:text-theme-accent text-xs border-l border-theme-accent/30 pl-2 flex items-center gap-1 cursor-pointer">
              <Edit3 className="w-3 h-3" /> Sửa
            </button>
          )}
          {onMultishot && (
            <button onClick={handleMultishotClick} className="text-theme-accent/70 hover:text-theme-accent text-xs border-l border-theme-accent/30 pl-2 flex items-center gap-1 cursor-pointer">
              <Film className="w-3 h-3" /> Multishot
            </button>
          )}
        </div>
      ) : isEditing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-theme-accent uppercase tracking-wider">Yêu cầu chỉnh sửa</span>
            <button type="button" onClick={handleClose} className="text-theme-text-muted/50 hover:text-theme-accent">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-theme-text-muted line-clamp-2 italic bg-black/20 p-2 rounded border border-theme-border">
            "{selection.text}"
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: Làm đoạn này hài hước hơn..."
            className="w-full bg-black/40 border border-theme-border rounded-lg p-2 text-theme-text placeholder-theme-text-muted/50 focus:outline-none focus:border-theme-accent resize-none h-20 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="w-full py-2 bg-theme-accent hover:bg-theme-accent/80 text-theme-accent-text rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Gửi yêu cầu
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-theme-accent uppercase tracking-wider">Tạo Multishot</span>
            <button type="button" onClick={handleClose} className="text-theme-text-muted/50 hover:text-theme-accent">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-theme-text-muted line-clamp-2 italic bg-black/20 p-2 rounded border border-theme-border">
            "{selection.text}"
          </div>
          
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs text-theme-accent">Mức độ điện ảnh:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedComplexity('simple')}
                className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${selectedComplexity === 'simple' ? 'bg-theme-accent border-theme-accent text-theme-accent-text' : 'bg-theme-accent/10 border-theme-border text-theme-accent hover:bg-theme-accent/20'}`}
              >
                Đơn giản
              </button>
              <button
                type="button"
                onClick={() => setSelectedComplexity('medium')}
                className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${selectedComplexity === 'medium' ? 'bg-theme-accent border-theme-accent text-theme-accent-text' : 'bg-theme-accent/10 border-theme-border text-theme-accent hover:bg-theme-accent/20'}`}
              >
                Trung bình
              </button>
              <button
                type="button"
                onClick={() => setSelectedComplexity('complex')}
                className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${selectedComplexity === 'complex' ? 'bg-theme-accent border-theme-accent text-theme-accent-text' : 'bg-theme-accent/10 border-theme-border text-theme-accent hover:bg-theme-accent/20'}`}
              >
                Phức tạp
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs text-theme-accent">Thời lượng:</span>
            <div className="grid grid-cols-2 gap-2">
              {[8, 10, 12, 15].map(duration => (
                <button
                  key={duration}
                  onClick={() => handleMultishotSelect(duration)}
                  className="py-2 bg-theme-accent/10 hover:bg-theme-accent/20 border border-theme-accent/30 rounded-lg text-sm font-medium text-theme-text transition-colors flex items-center justify-center gap-2"
                >
                  <Film className="w-4 h-4" />
                  {duration} giây
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
