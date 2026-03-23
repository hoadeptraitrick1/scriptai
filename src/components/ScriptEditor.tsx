import React, { useState, useRef, useEffect } from 'react';
import { Project, Event, ScriptVersion, ScriptElement } from '../types';
import { generateScript, generateMultishotPrompt, MultishotShot, MultishotComplexity } from '../services/ai';
import { ChevronLeft, Loader2, Send, RotateCcw, RotateCw, Save, History, Edit3, X, Film, Copy, Check } from 'lucide-react';
import { SelectionTooltip } from './SelectionTooltip';
import { formatApiError } from '../utils/error';
import { useFakeProgress } from '../hooks/useFakeProgress';

interface ScriptEditorProps {
  project: Project;
  actId: string;
  event: Event;
  onSave: (event: Event) => void;
  onSaveProject: (project: Project) => void;
  onBack: () => void;
}

export default function ScriptEditor({ project, actId, event, onSave, onSaveProject, onBack }: ScriptEditorProps) {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [currentVersionIndex, setCurrentVersionIndex] = useState(event.currentVersionIndex);
  const [versions, setVersions] = useState<ScriptVersion[]>(event.scriptVersions);
  const [selectedText, setSelectedText] = useState('');
  const [multishotLoadingDuration, setMultishotLoadingDuration] = useState<number | null>(null);
  const [multishotShots, setMultishotShots] = useState<MultishotShot[]>([]);
  const [multishotComplexity, setMultishotComplexity] = useState<MultishotComplexity>('medium');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadingProgress = useFakeProgress(loading, 20000);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [versions, currentVersionIndex]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        const text = sel.toString().trim();
        if (text.length > 0) {
          setSelectedText(text);
          return;
        }
      }
      // Don't clear selection immediately when clicking away, so user can type in the prompt box
      // We'll clear it manually or when they click outside the editor area
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleGenerate = async (isEdit: boolean = false, customPrompt?: string, customSelectedText?: string) => {
    setLoading(true);
    try {
      // Gather context
      const fullSummary = project.acts.map(a => `${a.title}: ${a.summary}`).join('\n');
      
      // Gather previous scripts (up to this event)
      let previousScripts = '';
      for (const act of project.acts) {
        for (const ev of act.events) {
          if (ev.id === event.id) break;
          if (ev.scriptVersions.length > 0) {
            const latest = ev.scriptVersions[ev.currentVersionIndex];
            previousScripts += `\n--- Event: ${ev.description} ---\n`;
            previousScripts += latest.content.map(c => c.text).join('\n');
          }
        }
      }

      const elements = await generateScript(
        event.description,
        event.duration,
        fullSummary,
        previousScripts,
        project.scriptLanguage,
        project.dialogueLanguage,
        isEdit ? (customPrompt || prompt) : undefined,
        isEdit ? (customSelectedText || selectedText) : undefined,
        project.globalInstructions,
        event.approvedPrompts,
        project.openingStyle,
        project.endingStyle,
        project.messageStyle
      );

      const newVersion: ScriptVersion = {
        id: `v-${Date.now()}`,
        createdAt: Date.now(),
        content: elements,
        prompt: isEdit ? (customPrompt || prompt) : undefined,
      };

      const newVersions = [...versions.slice(0, currentVersionIndex + 1), newVersion];
      setVersions(newVersions);
      setCurrentVersionIndex(newVersions.length - 1);
      setPrompt('');
      setSelectedText('');
      
      // Auto-save
      onSave({
        ...event,
        scriptVersions: newVersions,
        currentVersionIndex: newVersions.length - 1,
      });

    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo kịch bản. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMultishot = async (duration: number, textToUse?: string, complexity?: MultishotComplexity) => {
    const text = textToUse || selectedText;
    const comp = complexity || multishotComplexity;
    if (!text) return;
    setMultishotLoadingDuration(duration);
    setMultishotShots([]);
    setCopied(false);
    try {
      const shots = await generateMultishotPrompt(text, duration, comp);
      setMultishotShots(shots);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo multishot prompt. ' + formatApiError(err));
    } finally {
      setMultishotLoadingDuration(null);
    }
  };

  const handleCopyMultishot = () => {
    if (multishotShots.length === 0) return;
    
    const textToCopy = multishotShots.map(shot => `Shot ${shot.number} (${shot.duration}s): ${shot.englishPrompt}`).join('\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Không thể copy text');
    });
  };

  const currentScript = currentVersionIndex >= 0 ? versions[currentVersionIndex].content : null;

  const renderScriptElement = (el: ScriptElement, idx: number) => {
    switch (el.type) {
      case 'scene_heading':
        return <div key={idx} className="uppercase font-bold mt-6 mb-2 text-red-500">{el.text}</div>;
      case 'action':
        return <div key={idx} className="mb-4 text-theme-text">{el.text}</div>;
      case 'character':
        return <div key={idx} className="uppercase ml-[20%] mt-4 mb-0 text-theme-text font-bold">{el.text}</div>;
      case 'parenthetical':
        return <div key={idx} className="ml-[15%] mr-[20%] mb-0 text-theme-text-muted italic">({el.text.replace(/^\(|\)$/g, '')})</div>;
      case 'dialogue':
        const parts = el.text.split(' | ');
        if (parts.length > 1) {
          return (
            <div key={idx} className="ml-[10%] mr-[15%] mb-4 text-theme-text relative group cursor-help">
              <span>{parts[0]}</span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-theme-card text-theme-accent text-sm p-3 rounded-lg shadow-xl z-50 whitespace-pre-wrap w-max max-w-md border border-theme-accent/30">
                {parts.slice(1).join(' | ')}
              </div>
            </div>
          );
        }
        return <div key={idx} className="ml-[10%] mr-[15%] mb-4 text-theme-text">{el.text}</div>;
      case 'transition':
        return <div key={idx} className="uppercase text-right mt-4 mb-4 text-theme-text font-bold">{el.text}</div>;
      default:
        return <div key={idx} className="mb-2 text-theme-text">{el.text}</div>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative">
      <SelectionTooltip 
        onEdit={(text, editPrompt) => handleGenerate(true, editPrompt, text)} 
        onMultishot={(text, duration, complexity) => {
          setSelectedText(text);
          setMultishotComplexity(complexity);
          handleGenerateMultishot(duration, text, complexity);
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-theme-accent/10 text-theme-accent rounded-full hover:bg-theme-accent/20 hover:text-theme-text transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-theme-text">Viết kịch bản chi tiết</h2>
            <p className="text-theme-text-muted text-sm mt-1 line-clamp-1">{event.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {versions.length > 0 && (
            <div className="flex items-center bg-theme-card rounded-lg p-1 border border-theme-border">
              <button
                onClick={() => {
                  const newIndex = Math.max(0, currentVersionIndex - 1);
                  setCurrentVersionIndex(newIndex);
                  onSave({ ...event, currentVersionIndex: newIndex });
                }}
                disabled={currentVersionIndex <= 0}
                className="p-1.5 text-theme-accent hover:text-theme-text disabled:opacity-30 transition-colors"
                title="Phiên bản trước"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-theme-accent px-2">
                v{currentVersionIndex + 1}/{versions.length}
              </span>
              <button
                onClick={() => {
                  const newIndex = Math.min(versions.length - 1, currentVersionIndex + 1);
                  setCurrentVersionIndex(newIndex);
                  onSave({ ...event, currentVersionIndex: newIndex });
                }}
                disabled={currentVersionIndex >= versions.length - 1}
                className="p-1.5 text-theme-accent hover:text-theme-text disabled:opacity-30 transition-colors"
                title="Phiên bản sau"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Script Paper View */}
        <div className="flex-1 bg-theme-card/20 rounded-3xl border border-theme-border overflow-hidden flex flex-col relative">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 scroll-smooth"
          >
            {currentScript ? (
              <div className="max-w-3xl mx-auto bg-theme-card text-theme-text p-12 min-h-[800px] shadow-2xl rounded-sm font-mono text-[12pt] leading-tight" style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}>
                {currentScript.map((el, idx) => renderScriptElement(el, idx))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-theme-text-muted/50">
                <History className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg mb-6">Chưa có kịch bản cho sự kiện này.</p>
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={loading}
                  className="px-6 py-3 bg-theme-accent hover:bg-theme-accent/80 text-theme-accent-text rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-theme-accent/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Viết kịch bản ngay
                </button>
              </div>
            )}
          </div>
          
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-theme-card/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <Loader2 className="w-12 h-12 text-theme-accent animate-spin mb-4" />
              <p className="text-theme-text font-medium animate-pulse">AI đang chắp bút viết kịch bản... {loadingProgress}%</p>
            </div>
          )}
        </div>

        {/* Edit Panel */}
        {versions.length > 0 && (
          <div className="w-96 shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pb-4">
            {/* Current Version Info */}
            {versions[currentVersionIndex].prompt && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shrink-0">
                <h3 className="text-sm font-bold text-theme-accent mb-2 uppercase tracking-wider">
                  Yêu cầu của phiên bản này:
                </h3>
                <p className="text-sm text-theme-text italic mb-4">
                  "{versions[currentVersionIndex].prompt}"
                </p>
                
                <label className="flex items-start gap-2 mb-4 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={(event.approvedPrompts || []).includes(versions[currentVersionIndex].prompt!)}
                      onChange={(e) => {
                        const currentPrompt = versions[currentVersionIndex].prompt!;
                        let newApproved = [...(event.approvedPrompts || [])];
                        if (e.target.checked) {
                          if (!newApproved.includes(currentPrompt)) newApproved.push(currentPrompt);
                        } else {
                          newApproved = newApproved.filter(p => p !== currentPrompt);
                        }
                        onSave({ ...event, approvedPrompts: newApproved });
                      }}
                      className="peer appearance-none w-4 h-4 border border-theme-accent/50 rounded bg-black/20 checked:bg-theme-accent checked:border-theme-accent transition-colors cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-theme-accent-text opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-xs text-theme-text-muted group-hover:text-theme-text transition-colors leading-tight">
                    Giữ yêu cầu này cho các lần chỉnh sửa sau của phân đoạn này
                  </span>
                </label>

                <button
                  onClick={() => {
                    const currentPrompt = versions[currentVersionIndex].prompt;
                    if (currentPrompt) {
                      const currentGlobal = project.globalInstructions || [];
                      if (!currentGlobal.includes(currentPrompt)) {
                        const newGlobal = [...currentGlobal, currentPrompt];
                        onSaveProject({ ...project, globalInstructions: newGlobal });
                        alert('Đã thêm vào yêu cầu chung cho tất cả phân đoạn!');
                      } else {
                        alert('Yêu cầu này đã có trong danh sách yêu cầu chung.');
                      }
                    }
                  }}
                  className="w-full py-2 bg-theme-accent/10 hover:bg-theme-accent/20 text-theme-accent text-xs font-medium rounded-lg transition-colors border border-theme-accent/30"
                >
                  Áp dụng yêu cầu này cho tất cả phân đoạn
                </button>
              </div>
            )}

            {/* Approved Prompts for this event */}
            {event.approvedPrompts && event.approvedPrompts.length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shrink-0">
                <h3 className="text-sm font-bold text-theme-accent mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span>Yêu cầu đã lưu (Phân đoạn này)</span>
                  <span className="text-xs bg-theme-accent/10 px-2 py-0.5 rounded-full">{event.approvedPrompts.length}</span>
                </h3>
                <ul className="space-y-2 mb-4">
                  {event.approvedPrompts.map((inst, idx) => (
                    <li key={idx} className="text-xs text-theme-text-muted bg-black/20 p-2 rounded border border-theme-border flex justify-between items-start gap-2">
                      <span className="flex-1 italic">"{inst}"</span>
                      <button
                        onClick={() => {
                          const newApproved = event.approvedPrompts!.filter((_, i) => i !== idx);
                          onSave({ ...event, approvedPrompts: newApproved });
                        }}
                        className="text-red-400 hover:text-red-300 p-0.5"
                        title="Xóa yêu cầu này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-theme-text-muted/60 leading-tight">
                  Các yêu cầu này sẽ được giữ nguyên khi bạn chỉnh sửa phân đoạn này trong tương lai.
                </p>
              </div>
            )}

            {/* Global Instructions */}
            {project.globalInstructions && project.globalInstructions.length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shrink-0">
                <h3 className="text-sm font-bold text-theme-accent mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span>Yêu cầu chung</span>
                  <span className="text-xs bg-theme-accent/10 px-2 py-0.5 rounded-full">{project.globalInstructions.length}</span>
                </h3>
                <ul className="space-y-2 mb-4">
                  {project.globalInstructions.map((inst, idx) => (
                    <li key={idx} className="text-xs text-theme-text-muted bg-black/20 p-2 rounded border border-theme-border flex justify-between items-start gap-2">
                      <span className="flex-1 italic">"{inst}"</span>
                      <button
                        onClick={() => {
                          const newGlobal = project.globalInstructions!.filter((_, i) => i !== idx);
                          onSaveProject({ ...project, globalInstructions: newGlobal });
                        }}
                        className="text-red-400 hover:text-red-300 p-0.5"
                        title="Xóa yêu cầu này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-theme-text-muted/60 leading-tight">
                  Các yêu cầu này sẽ tự động được áp dụng khi bạn tạo hoặc chỉnh sửa bất kỳ phân đoạn nào.
                </p>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col min-h-0 shrink-0">
              <h3 className="text-lg font-bold text-theme-accent mb-4 flex items-center gap-2 shrink-0">
                <Edit3 className="w-5 h-5" />
                Chỉnh sửa kịch bản
              </h3>
              <p className="text-sm text-theme-text-muted mb-4 shrink-0">
                Nhập yêu cầu chỉnh sửa của bạn. AI sẽ đọc lại toàn bộ kịch bản và viết lại phiên bản mới dựa trên yêu cầu này.
              </p>

              {selectedText && (
                <div className="mb-4 bg-theme-accent/10 border border-theme-accent/30 rounded-xl p-3 relative group shrink-0">
                  <div className="text-xs font-bold text-theme-accent mb-1 uppercase tracking-wider">Đoạn văn bản đã chọn:</div>
                  <div className="text-sm text-theme-text line-clamp-3 italic">"{selectedText}"</div>
                  <button
                    onClick={() => setSelectedText('')}
                    className="absolute top-2 right-2 p-1 bg-black/40 hover:bg-black/60 text-theme-accent/70 hover:text-theme-accent rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Bỏ chọn"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Thêm một đoạn hội thoại hài hước giữa hai nhân vật chính..."
                className="w-full bg-theme-input border border-theme-border rounded-xl p-4 text-theme-text placeholder-theme-text-muted/50 focus:outline-none focus:ring-2 focus:ring-theme-accent resize-y transition-all mb-4 min-h-[120px]"
              />
              
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading || !prompt.trim()}
                className="w-full py-4 bg-theme-accent hover:bg-theme-accent/80 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-theme-accent/20 shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Gửi yêu cầu
              </button>

              {selectedText && (
                <div className="mt-6 pt-6 border-t border-white/10 shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-theme-accent flex items-center gap-2">
                      <Film className="w-5 h-5" />
                      Viết Prompt Multishot
                    </h3>
                    {multishotShots.length > 0 && (
                      <button
                        onClick={handleCopyMultishot}
                        className="px-3 py-1.5 bg-theme-accent hover:bg-theme-accent/80 text-theme-accent-text rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Đã copy' : 'Copy All'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-theme-text-muted mb-4">
                    Tạo prompt chi tiết cho AI Video Generator (6-8 shot) dựa trên đoạn văn bản đã chọn.
                  </p>
                  
                  <div className="flex flex-col gap-2 mb-4">
                    <span className="text-xs text-theme-accent">Mức độ điện ảnh:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMultishotComplexity('simple')}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${multishotComplexity === 'simple' ? 'bg-theme-accent border-theme-accent text-theme-accent-text' : 'bg-theme-accent/10 border-theme-border text-theme-accent hover:bg-theme-accent/20'}`}
                      >
                        Đơn giản
                      </button>
                      <button
                        type="button"
                        onClick={() => setMultishotComplexity('medium')}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${multishotComplexity === 'medium' ? 'bg-theme-accent border-theme-accent text-theme-accent-text' : 'bg-theme-accent/10 border-theme-border text-theme-accent hover:bg-theme-accent/20'}`}
                      >
                        Trung bình
                      </button>
                      <button
                        type="button"
                        onClick={() => setMultishotComplexity('complex')}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${multishotComplexity === 'complex' ? 'bg-theme-accent border-theme-accent text-theme-accent-text' : 'bg-theme-accent/10 border-theme-border text-theme-accent hover:bg-theme-accent/20'}`}
                      >
                        Phức tạp
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-4">
                    <span className="text-xs text-theme-accent">Thời lượng:</span>
                    <div className="flex flex-wrap gap-2">
                      {[8, 10, 12, 15].map(duration => (
                        <button
                          key={duration}
                          onClick={() => handleGenerateMultishot(duration)}
                          disabled={multishotLoadingDuration !== null}
                          className="px-4 py-2 bg-theme-accent/10 hover:bg-theme-accent/20 border border-theme-accent/30 rounded-lg text-sm font-medium text-theme-text transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {multishotLoadingDuration === duration ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                          {duration} giây
                        </button>
                      ))}
                    </div>
                  </div>

                  {multishotShots.length > 0 && (
                    <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {multishotShots.map((shot, idx) => (
                        <div key={idx} className="bg-black/40 border border-theme-border rounded-lg p-3 relative group cursor-help overflow-hidden">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-theme-accent">Shot {shot.number}</span>
                            <span className="text-xs font-mono text-theme-text-muted">{shot.duration}s</span>
                          </div>
                          <p className="text-sm text-theme-text">{shot.englishPrompt}</p>
                          
                          {/* Vietnamese translation overlay */}
                          <div className="absolute inset-0 bg-theme-card/95 backdrop-blur-sm p-3 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-theme-accent">Shot {shot.number} (Dịch)</span>
                              <span className="text-xs font-mono text-theme-text-muted">{shot.duration}s</span>
                            </div>
                            <p className="text-sm text-theme-text overflow-y-auto custom-scrollbar">{shot.vietnamesePrompt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
