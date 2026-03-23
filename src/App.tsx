import React, { useState, useEffect, useRef } from 'react';
import { Film, Archive, Plus, Download, Upload, Lightbulb, Sun, Moon } from 'lucide-react';
import CreateFlow from './components/CreateFlow';
import Storage from './components/Storage';
import ProjectEditor from './components/ProjectEditor';
import IdeaBank from './components/IdeaBank';
import { Project, DislikedIdea, LikedIdea } from './types';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'create' | 'storage' | 'idea-bank'>('create');
  const [projects, setProjects] = useState<Project[]>([]);
  const [dislikedIdeas, setDislikedIdeas] = useState<DislikedIdea[]>([]);
  const [likedIdeas, setLikedIdeas] = useState<LikedIdea[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [showZoomToast, setShowZoomToast] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('screenplayer_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    }
    const savedDisliked = localStorage.getItem('screenplayer_disliked_ideas');
    if (savedDisliked) {
      try {
        setDislikedIdeas(JSON.parse(savedDisliked));
      } catch (e) {
        console.error('Failed to load disliked ideas', e);
      }
    }
    const savedLiked = localStorage.getItem('screenplayer_liked_ideas');
    if (savedLiked) {
      try {
        setLikedIdeas(JSON.parse(savedLiked));
      } catch (e) {
        console.error('Failed to load liked ideas', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(prev => {
          let newZoom = prev;
          if (e.deltaY < 0) {
            newZoom = Math.min(prev + 0.1, 3);
          } else {
            newZoom = Math.max(prev - 0.1, 0.5);
          }
          return Number(newZoom.toFixed(1));
        });
        
        setShowZoomToast(true);
        if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = setTimeout(() => setShowZoomToast(false), 1500);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const saveProject = (project: Project) => {
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    let newProjects = [...projects];
    if (existingIndex >= 0) {
      newProjects[existingIndex] = project;
    } else {
      newProjects.push(project);
    }
    setProjects(newProjects);
    try {
      localStorage.setItem('screenplayer_projects', JSON.stringify(newProjects));
    } catch (e) {
      console.error("Failed to save to localStorage, it might be full:", e);
      alert("Lỗi: Không thể lưu dự án. Bộ nhớ trình duyệt (localStorage) có thể đã đầy do chứa quá nhiều ảnh. Vui lòng xóa bớt các dự án cũ hoặc xuất (export) dự án ra file.");
    }
    setCurrentProject(project);
  };

  const handleDeleteProject = (projectId: string) => {
    const newProjects = projects.filter(p => p.id !== projectId);
    setProjects(newProjects);
    localStorage.setItem('screenplayer_projects', JSON.stringify(newProjects));
  };

  const handleCreateNew = () => {
    setCurrentProject(null);
    setActiveTab('create');
  };

  const handleExport = () => {
    const exportData = {
      projects,
      dislikedIdeas,
      likedIdeas
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "script_ai_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setProjects(imported);
          localStorage.setItem('screenplayer_projects', JSON.stringify(imported));
          alert('Đã tải dự án thành công!');
        } else if (imported.projects) {
          setProjects(imported.projects);
          setDislikedIdeas(imported.dislikedIdeas || []);
          setLikedIdeas(imported.likedIdeas || []);
          localStorage.setItem('screenplayer_projects', JSON.stringify(imported.projects));
          localStorage.setItem('screenplayer_disliked_ideas', JSON.stringify(imported.dislikedIdeas || []));
          localStorage.setItem('screenplayer_liked_ideas', JSON.stringify(imported.likedIdeas || []));
          alert('Đã tải dự án thành công!');
        }
      } catch (err) {
        alert('File không hợp lệ!');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDislikeIdea = (idea: DislikedIdea) => {
    const exists = dislikedIdeas.find(i => i.title === idea.title);
    let newDisliked;
    if (exists) {
      newDisliked = dislikedIdeas.filter(i => i.title !== idea.title);
    } else {
      newDisliked = [...dislikedIdeas, idea];
    }
    setDislikedIdeas(newDisliked);
    localStorage.setItem('screenplayer_disliked_ideas', JSON.stringify(newDisliked));
  };

  const handleLikeIdea = (idea: LikedIdea) => {
    const exists = likedIdeas.find(i => i.title === idea.title);
    let newLiked;
    if (exists) {
      newLiked = likedIdeas.filter(i => i.title !== idea.title);
    } else {
      newLiked = [...likedIdeas, idea];
    }
    setLikedIdeas(newLiked);
    localStorage.setItem('screenplayer_liked_ideas', JSON.stringify(newLiked));
  };

  const handleRemoveLikedIdea = (id: string) => {
    const newLiked = likedIdeas.filter(i => i.id !== id);
    setLikedIdeas(newLiked);
    localStorage.setItem('screenplayer_liked_ideas', JSON.stringify(newLiked));
  };

  const handleRemoveDislikedIdea = (title: string) => {
    const newDisliked = dislikedIdeas.filter(i => i.title !== title);
    setDislikedIdeas(newDisliked);
    localStorage.setItem('screenplayer_disliked_ideas', JSON.stringify(newDisliked));
  };

  const handleUseIdea = (idea: LikedIdea) => {
    setActiveTab('create');
    setCurrentProject(null);
    // We will pass this prefilled idea to CreateFlow via props or context
    // For now, we can use a state to pass it
  };

  const [prefilledIdea, setPrefilledIdea] = useState<LikedIdea | null>(null);

  const handleUseIdeaFromBank = (idea: LikedIdea) => {
    setPrefilledIdea(idea);
    setActiveTab('create');
    setCurrentProject(null);
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text font-sans selection:bg-theme-accent/30">
      {/* Zoom Toast */}
      {showZoomToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-theme-card/80 text-theme-text px-4 py-2 rounded-full font-mono text-sm shadow-xl backdrop-blur-sm border border-theme-border transition-opacity duration-300">
          Zoom: {Math.round(zoom * 100)}%
        </div>
      )}

      <nav className="border-b border-theme-border bg-theme-nav/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Film className="w-6 h-6 text-theme-accent" />
              <span className="text-xl font-bold text-theme-text">
                Script AI
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Theme Toggle */}
              <div className="flex items-center bg-theme-btn-sec rounded-full p-1 border border-theme-border">
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    theme === 'light'
                      ? 'bg-theme-bg text-theme-text shadow-sm'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Sáng</span>
                </button>
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-theme-bg text-theme-text shadow-sm'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Tối</span>
                </button>
              </div>

              <div className="w-px h-6 bg-theme-border mx-2"></div>

              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleImport} 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-theme-text-muted hover:bg-theme-btn-sec-hover hover:text-theme-text transition-all"
                title="Mở dự án từ file"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Mở dự án</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-theme-text-muted hover:bg-theme-btn-sec-hover hover:text-theme-text transition-all"
                title="Lưu tất cả dự án ra file"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Lưu dự án</span>
              </button>
              <div className="w-px h-6 bg-theme-border mx-2"></div>
              <button
                onClick={() => {
                  setActiveTab('idea-bank');
                  setCurrentProject(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'idea-bank' && !currentProject
                    ? 'bg-theme-accent text-theme-accent-text shadow-lg shadow-theme-accent/20'
                    : 'text-theme-text-muted hover:bg-theme-btn-sec-hover hover:text-theme-text'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Kho ý tưởng</span>
              </button>
              <button
                onClick={handleCreateNew}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'create' && !currentProject
                    ? 'bg-theme-accent text-theme-accent-text shadow-lg shadow-theme-accent/20'
                    : 'text-theme-text-muted hover:bg-theme-btn-sec-hover hover:text-theme-text'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tạo mới</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('storage');
                  setCurrentProject(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === 'storage' && !currentProject
                    ? 'bg-theme-accent text-theme-accent-text shadow-lg shadow-theme-accent/20'
                    : 'text-theme-text-muted hover:bg-theme-btn-sec-hover hover:text-theme-text'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Lưu trữ</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ zoom: zoom }} className="origin-top transition-transform duration-75">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-4rem)]">
          {currentProject ? (
            <ProjectEditor
              project={currentProject}
              onSave={saveProject}
              onClose={() => setCurrentProject(null)}
            />
          ) : (
            <>
              <div className={activeTab === 'create' ? 'block' : 'hidden'}>
                <CreateFlow 
                  onSaveProject={(p) => {
                    saveProject(p);
                    setActiveTab('storage');
                  }} 
                  dislikedIdeas={dislikedIdeas}
                  onDislikeIdea={handleDislikeIdea}
                  likedIdeas={likedIdeas}
                  onLikeIdea={handleLikeIdea}
                  prefilledIdea={prefilledIdea}
                  onClearPrefilled={() => setPrefilledIdea(null)}
                />
              </div>
              <div className={activeTab === 'storage' ? 'block' : 'hidden'}>
                <Storage 
                  projects={projects} 
                  onOpenProject={setCurrentProject} 
                  onDeleteProject={handleDeleteProject}
                />
              </div>
              <div className={activeTab === 'idea-bank' ? 'block' : 'hidden'}>
                <IdeaBank 
                  likedIdeas={likedIdeas} 
                  dislikedIdeas={dislikedIdeas} 
                  onRemoveLikedIdea={handleRemoveLikedIdea}
                  onRemoveDislikedIdea={handleRemoveDislikedIdea}
                  onUseIdea={handleUseIdeaFromBank}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
