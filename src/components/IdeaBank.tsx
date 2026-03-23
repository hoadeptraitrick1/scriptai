import React from 'react';
import { LikedIdea, DislikedIdea } from '../types';
import { ThumbsUp, ThumbsDown, Trash2, ArrowRight } from 'lucide-react';

interface IdeaBankProps {
  likedIdeas: LikedIdea[];
  dislikedIdeas: DislikedIdea[];
  onRemoveLikedIdea: (id: string) => void;
  onRemoveDislikedIdea: (title: string) => void;
  onUseIdea: (idea: LikedIdea) => void;
}

export default function IdeaBank({ likedIdeas, dislikedIdeas, onRemoveLikedIdea, onRemoveDislikedIdea, onUseIdea }: IdeaBankProps) {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-bold text-theme-text mb-6 flex items-center gap-2">
          <ThumbsUp className="w-6 h-6 text-theme-accent" />
          Ý tưởng yêu thích ({likedIdeas.length})
        </h2>
        {likedIdeas.length === 0 ? (
          <div className="bg-theme-card border border-theme-border rounded-2xl p-8 text-center text-theme-text-muted">
            Chưa có ý tưởng nào được lưu. Hãy thả tim các ý tưởng bạn thích ở phần Tạo mới nhé!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {likedIdeas.map(idea => (
              <div key={idea.id} className="bg-theme-card border border-theme-border rounded-2xl p-6 relative group hover:bg-theme-accent/10 transition-all">
                <button
                  onClick={() => onRemoveLikedIdea(idea.id)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                  title="Xóa khỏi danh sách"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="inline-block px-3 py-1 rounded-full bg-theme-accent/10 text-theme-accent text-xs font-medium mb-3 border border-theme-accent/30">
                  {idea.genre}
                </div>
                <h3 className="text-lg font-bold text-theme-text mb-2 pr-8">{idea.title}</h3>
                {idea.format && (
                  <div className="inline-block px-2 py-1 bg-theme-accent/10 text-theme-accent text-xs rounded border border-theme-accent/30 mb-2">
                    {idea.format}
                  </div>
                )}
                <p className="text-sm text-theme-text-muted mb-2"><span className="font-semibold text-theme-accent">Kể về:</span> {idea.synopsis}</p>
                <p className="text-sm text-theme-text-muted mb-2"><span className="font-semibold text-theme-accent">Kết cục/Cú twist:</span> {idea.twist}</p>
                <p className="text-sm text-theme-text-muted mb-2"><span className="font-semibold text-theme-accent">Tình tiết/Chi tiết đắt giá:</span> {idea.details}</p>
                <p className="text-sm text-theme-text-muted mb-6"><span className="font-semibold text-theme-accent">Bài học rút ra:</span> {idea.lesson}</p>
                <button
                  onClick={() => onUseIdea(idea)}
                  className="w-full py-2.5 bg-theme-accent/20 hover:bg-theme-accent/30 text-theme-accent rounded-xl font-medium flex items-center justify-center gap-2 transition-all border border-theme-accent/30"
                >
                  Phát triển ý tưởng này
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-theme-text mb-6 flex items-center gap-2">
          <ThumbsDown className="w-6 h-6 text-red-400" />
          Ý tưởng đã loại ({dislikedIdeas.length})
        </h2>
        <p className="text-sm text-theme-text-muted mb-4">AI sẽ học từ danh sách này để không tạo ra các ý tưởng tương tự trong tương lai.</p>
        {dislikedIdeas.length === 0 ? (
          <div className="bg-theme-card border border-theme-border rounded-2xl p-8 text-center text-theme-text-muted">
            Chưa có ý tưởng nào bị loại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dislikedIdeas.map((idea, idx) => (
              <div key={idx} className="bg-red-950/10 border border-red-900/30 rounded-2xl p-6 relative group">
                <button
                  onClick={() => onRemoveDislikedIdea(idea.title)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-theme-accent/10 text-theme-accent opacity-0 group-hover:opacity-100 hover:bg-theme-accent/20 transition-all"
                  title="Khôi phục (Xóa khỏi danh sách loại)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="inline-block px-3 py-1 rounded-full bg-red-900/30 text-red-300 text-xs font-medium mb-3 border border-red-800/30">
                  {idea.genre}
                </div>
                <h3 className="text-lg font-bold text-theme-text-muted mb-2 pr-8 line-through decoration-red-500/50">{idea.title}</h3>
                <p className="text-sm text-theme-text-muted/50 mb-2 line-clamp-2">{idea.synopsis}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
