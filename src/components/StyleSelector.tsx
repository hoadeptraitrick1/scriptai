import React, { useState } from 'react';
import { Project } from '../types';
import { Sparkles, Check, Info, RefreshCw, Copy, Edit3, CheckCircle, X } from 'lucide-react';
import { generateGlobalStylePrompt, refineGlobalStylePrompt } from '../services/ai';

interface StyleSelectorProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
}

const STYLE_CATEGORIES = [
  {
    id: 'animation',
    name: 'Hoạt hình',
    subcategories: [
      { id: '2d-anime', name: '2D Anime', tooltip: 'Phù hợp với thể loại hành động, viễn tưởng, lãng mạn.' },
      { id: '2d-cartoon', name: '2D Cartoon', tooltip: 'Phù hợp với thể loại hài hước, thiếu nhi.' },
      { id: '3d-pixar', name: '3D Pixar/Disney', tooltip: 'Phù hợp với thể loại gia đình, phiêu lưu, kỳ ảo.' },
      { id: '3d-realistic', name: '3D Realistic', tooltip: 'Phù hợp với thể loại hành động, sci-fi, game cinematic.' },
      { id: 'semi-realism', name: 'Semi Realism', tooltip: 'Phù hợp với thể loại dark fantasy, nghệ thuật.' },
      { id: 'stop-motion', name: 'Stop Motion', tooltip: 'Phù hợp với thể loại độc đáo, kinh dị nhẹ, nghệ thuật.' },
    ]
  },
  {
    id: 'live-action',
    name: 'Phim người thật',
    subcategories: [
      { id: 'cinematic', name: 'Cinematic', tooltip: 'Phù hợp với phim điện ảnh, drama, hành động.' },
      { id: 'documentary', name: 'Documentary', tooltip: 'Phù hợp với phim tài liệu, phóng sự.' },
      { id: 'vintage', name: 'Vintage/Retro', tooltip: 'Phù hợp với phim bối cảnh xưa, hoài niệm.' },
      { id: 'cyberpunk', name: 'Cyberpunk', tooltip: 'Phù hợp với phim khoa học viễn tưởng tương lai.' },
    ]
  }
];

export function StyleSelector({ project, onUpdateProject }: StyleSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(project.globalStyleCategory || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localPrompt, setLocalPrompt] = useState<string | null>(project.globalStylePrompt || null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineRequest, setRefineRequest] = useState('');
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePrompt = async () => {
    if (!selectedStyle) return;
    
    setIsGenerating(true);
    try {
      // Extract the full script text to send to AI
      let fullScript = `Tiêu đề: ${project.title}\nÝ tưởng: ${project.idea}\n\n`;
      project.acts.forEach((act, actIndex) => {
        fullScript += `Hồi ${actIndex + 1}: ${act.title}\n`;
        act.events.forEach(ev => {
          if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
            const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
            scriptContent.forEach(el => {
              fullScript += `${el.text}\n`;
            });
          }
        });
      });

      const styleName = STYLE_CATEGORIES.flatMap(c => c.subcategories).find(s => s.id === selectedStyle)?.name || selectedStyle;
      
      const prompt = await generateGlobalStylePrompt(fullScript, styleName);
      setLocalPrompt(prompt);
      
      onUpdateProject({
        ...project,
        globalStyleCategory: selectedStyle,
        globalStylePrompt: prompt,
        isStyleConfirmed: false
      });
    } catch (error) {
      console.error('Failed to generate style prompt:', error);
      alert('Có lỗi xảy ra khi tạo prompt phong cách. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (!localPrompt || !refineRequest.trim()) return;
    setIsRefining(true);
    try {
      const refinedPrompt = await refineGlobalStylePrompt(localPrompt, refineRequest);
      setLocalPrompt(refinedPrompt);
      onUpdateProject({
        ...project,
        globalStylePrompt: refinedPrompt,
        isStyleConfirmed: false
      });
      setShowRefineModal(false);
      setRefineRequest('');
    } catch (error) {
      console.error('Failed to refine style prompt:', error);
      alert('Có lỗi xảy ra khi tinh chỉnh prompt. Vui lòng thử lại.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    if (localPrompt) {
      navigator.clipboard.writeText(localPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmStyle = () => {
    onUpdateProject({
      ...project,
      isStyleConfirmed: true
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-theme-bg custom-scrollbar text-theme-text">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-theme-accent mb-2">Chọn Phong Cách Chung</h2>
        <p className="text-theme-text-muted mb-8">
          Lựa chọn này sẽ được áp dụng làm phong cách mặc định cho tất cả bối cảnh và nhân vật trong dự án.
        </p>

        <div className="space-y-8 mb-8">
          {STYLE_CATEGORIES.map(category => (
            <div key={category.id} className="bg-theme-card rounded-2xl border border-theme-border p-6">
              <h3 className="text-xl font-bold text-theme-accent mb-4 pb-2 border-b border-theme-border">
                {category.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {category.subcategories.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedStyle(sub.id)}
                    className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedStyle === sub.id 
                        ? 'bg-theme-accent/20 border-theme-accent shadow-lg shadow-theme-accent/20' 
                        : 'bg-theme-card border-theme-border/50 hover:border-theme-accent/50 hover:bg-theme-accent/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold ${selectedStyle === sub.id ? 'text-theme-accent' : 'text-theme-text-muted'}`}>
                        {sub.name}
                      </span>
                      {selectedStyle === sub.id && <Check className="w-5 h-5 text-theme-accent" />}
                    </div>
                    
                    <div className="group relative inline-block">
                      <div className="flex items-center text-xs text-theme-text-muted hover:text-theme-accent">
                        <Info className="w-3 h-3 mr-1" />
                        Gợi ý thể loại
                      </div>
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-theme-card border border-theme-border rounded-lg text-xs text-theme-text opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl">
                        {sub.tooltip}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={handleGeneratePrompt}
            disabled={!selectedStyle || isGenerating}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              !selectedStyle 
                ? 'bg-theme-btn-sec text-theme-text-muted cursor-not-allowed' 
                : isGenerating
                  ? 'bg-theme-accent/80 text-theme-accent-text cursor-wait'
                  : 'bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text shadow-lg hover:shadow-theme-accent/20'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Đang phân tích kịch bản & viết prompt...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Viết prompt phong cách
              </>
            )}
          </button>
        </div>

        {localPrompt && (
          <div className="mt-12 bg-theme-card rounded-2xl border border-theme-accent/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-theme-accent flex items-center gap-2">
                <Check className="w-5 h-5" />
                Prompt phong cách đã tạo
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-btn-sec hover:bg-theme-accent/20 text-theme-accent text-sm font-medium transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã copy' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowRefineModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-btn-sec hover:bg-theme-accent/20 text-theme-accent text-sm font-medium transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Tinh chỉnh
                </button>
                <button
                  onClick={handleConfirmStyle}
                  disabled={project.isStyleConfirmed}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    project.isStyleConfirmed
                      ? 'bg-theme-btn-sec text-theme-text-muted cursor-not-allowed'
                      : 'bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text shadow-lg shadow-theme-accent/20'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {project.isStyleConfirmed ? 'Đã chốt phong cách' : 'Chốt phong cách'}
                </button>
              </div>
            </div>
            
            <div className="bg-theme-input p-6 rounded-xl border border-theme-border font-mono text-sm text-theme-text whitespace-pre-wrap min-h-[500px] max-h-[700px] overflow-y-auto custom-scrollbar">
              {localPrompt}
            </div>
          </div>
        )}

        {/* Refine Modal */}
        {showRefineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-theme-card rounded-2xl border border-theme-border p-6 w-full max-w-2xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-theme-accent flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Tinh chỉnh Prompt
                </h3>
                <button
                  onClick={() => setShowRefineModal(false)}
                  className="p-2 text-theme-text-muted hover:text-theme-accent rounded-full hover:bg-theme-accent/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-theme-text-muted text-sm mb-4">
                Nhập yêu cầu chỉnh sửa của bạn (ví dụ: "Đổi tông màu sang u tối hơn", "Thêm chi tiết về ánh sáng neon"). AI sẽ chỉ sửa những phần bạn yêu cầu và giữ nguyên các phần khác.
              </p>
              
              <textarea
                value={refineRequest}
                onChange={(e) => setRefineRequest(e.target.value)}
                placeholder="Nhập yêu cầu tinh chỉnh..."
                className="w-full h-32 bg-theme-input border border-theme-border rounded-xl p-4 text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent/50 resize-none mb-6"
              />
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRefineModal(false)}
                  className="px-4 py-2 rounded-xl font-medium text-theme-text-muted hover:text-theme-accent hover:bg-theme-accent/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRefinePrompt}
                  disabled={!refineRequest.trim() || isRefining}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${
                    !refineRequest.trim() || isRefining
                      ? 'bg-theme-btn-sec text-theme-text-muted cursor-not-allowed'
                      : 'bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text shadow-lg shadow-theme-accent/20'
                  }`}
                >
                  {isRefining ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang tinh chỉnh...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Thực hiện
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
