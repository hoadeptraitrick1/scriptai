import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ScriptElement, Event } from '../types';
import { ChevronLeft, FileText, Edit3, Download, Menu, List, MapPin, Sparkles, RefreshCw, Users, Palette } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { formatApiError } from '../utils/error';
import { SelectionTooltip } from './SelectionTooltip';
import { BilingualText } from './BilingualText';
import { LocationPromptModal } from './LocationPromptModal';
import { CharacterPromptModal, CharacterPromptData } from './CharacterPromptModal';
import { StyleSelector } from './StyleSelector';
import { useFakeProgress } from '../hooks/useFakeProgress';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface FullScriptViewerProps {
  project: Project;
  onClose: () => void;
  onEditEvent?: (actId: string, event: Event) => void;
  onUpdateProject?: (project: Project) => void;
}

type RenderItem = {
  id: string;
  type: 'act_heading' | 'event_placeholder' | 'script_element' | 'page_break';
  content: React.ReactNode;
  pageNumber?: number;
  actId?: string;
  eventId?: string;
  elementIndex?: number;
  isSceneHeading?: boolean;
  text?: string;
  hasLocationData?: boolean;
};

export default function FullScriptViewer({ project, onClose, onEditEvent, onUpdateProject }: FullScriptViewerProps) {
  const [activeActId, setActiveActId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'style' | 'scenes' | 'characters'>('toc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeLocationPrompt, setActiveLocationPrompt] = useState<{ actId: string, eventId: string, elementIndex: number, text: string, reset?: boolean } | null>(null);
  const [activeCharacterPrompt, setActiveCharacterPrompt] = useState<any | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const downloadingProgress = useFakeProgress(isDownloading, 5000);

  const allCharacters = useMemo(() => {
    const chars = new Map<string, any>();
    
    // Add characters from project creation
    project.characters.forEach(c => {
      chars.set(c.name.toLowerCase(), {
        id: c.id,
        name: c.name,
        relationship: c.relationships || '',
        description: `${c.role}. ${c.personality}. ${c.want}. ${c.need}`,
        isMain: true,
        promptData: project.scriptCharacters?.find(sc => sc.name.toLowerCase() === c.name.toLowerCase())?.promptData
      });
    });

    // Extract characters from script
    project.acts.forEach(act => {
      act.events.forEach(ev => {
        if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
          const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
          scriptContent.forEach(el => {
            if (el.type === 'character') {
              const name = el.text.replace(/\s*\(.*?\)\s*/g, '').trim(); // Remove parentheticals like (V.O.) or (O.S.)
              const lowerName = name.toLowerCase();
              if (!chars.has(lowerName)) {
                chars.set(lowerName, {
                  id: `char-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  name: name,
                  relationship: 'Nhân vật phụ / Cameo',
                  description: 'Nhân vật xuất hiện trong kịch bản',
                  isMain: false,
                  promptData: project.scriptCharacters?.find(sc => sc.name.toLowerCase() === lowerName)?.promptData
                });
              }
            }
          });
        }
      });
    });

    return Array.from(chars.values());
  }, [project]);

  const locations = useMemo(() => {
    const locMap = new Map<string, any>();

    project.acts.forEach((act) => {
      act.events.forEach((event) => {
        const version = event.scriptVersions?.[event.currentVersionIndex];
        if (version) {
          version.content.forEach((el, elIdx) => {
            if (el.type === 'scene_heading' && el.text) {
              const heading = el.text.trim();
              const upperHeading = heading.toUpperCase();
              
              // Robust regex for INT./EXT. prefixes (English and Vietnamese)
              const typeMatch = upperHeading.match(/^(INT\.\/EXT\.|INT\.|EXT\.|NỘI\/NGOẠI\.|NỘI\.|NGOẠI\.)/);
              const type = typeMatch ? typeMatch[1].replace(/\.$/, '') : 'INT';
              
              // Extract time (usually after a dash at the end)
              const parts = heading.split(/\s+-\s+/);
              let name = heading;
              let time = 'DAY';
              
              if (parts.length > 1) {
                time = parts[parts.length - 1].trim();
                name = parts.slice(0, -1).join(' - ').trim();
              }
              
              // Remove the prefix from the name if it exists
              if (typeMatch) {
                name = name.substring(typeMatch[0].length).trim();
              }
              
              // Fallback if name becomes empty
              if (!name) name = heading;
              
              const id = name.toLowerCase();
              
              if (!locMap.has(id)) {
                locMap.set(id, {
                  id,
                  name,
                  type,
                  instances: []
                });
              }
              
              const loc = locMap.get(id);
              loc.instances.push({
                actId: act.id,
                eventId: event.id,
                elementIndex: elIdx,
                heading,
                time,
                type,
                locationData: el.locationData,
                actTitle: act.title,
                eventDescription: event.description,
                sceneId: `scene-${act.id}-${event.id}-${elIdx}`
              });
            }
          });
        }
      });
    });

    return Array.from(locMap.values()).map(loc => {
      // Find the first instance with locationData to use as the "primary" data
      const primaryInstance = loc.instances.find((inst: any) => inst.locationData);
      const locationData = primaryInstance?.locationData;
      
      // Extract summary/description
      const description = locationData?.prompts?.[0]?.detailsVi?.atmosphere || 
                         locationData?.prompts?.[0]?.rawPromptVi || 
                         "Chưa có mô tả chi tiết cho bối cảnh này. Nhấn nút Sparkles để tạo bằng AI.";
      
      const mood = locationData?.prompts?.[0]?.detailsVi?.atmosphere || "";
      const visualCues = locationData?.prompts?.[0]?.detailsVi?.props || "";

      return {
        ...loc,
        description,
        mood,
        visualCues,
        locationData
      };
    });
  }, [project]);

  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return locations;
    const s = searchTerm.toLowerCase();
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(s) || 
      loc.description.toLowerCase().includes(s)
    );
  }, [locations, searchTerm]);

  // Auto-select first location if none selected
  useEffect(() => {
    if (sidebarTab === 'scenes' && !selectedLocationId && filteredLocations.length > 0) {
      setSelectedLocationId(filteredLocations[0].id);
    }
  }, [sidebarTab, filteredLocations, selectedLocationId]);

  const selectedLocation = useMemo(() => {
    return locations.find(l => l.id === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  const handleRegenerateLocation = async (locationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateProject) return;
    
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return;

    setIsRegenerating(locationId);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const context = loc.instances.map((inst: any) => inst.eventDescription).join('\n');
      const promptText = `
        Bạn là một chuyên gia thiết kế bối cảnh (Production Designer).
        Hãy tạo một mô tả bối cảnh mới, sáng tạo và điện ảnh cho địa điểm: "${loc.name}"
        Dựa trên các sự kiện diễn ra tại đây:
        """
        ${context}
        """
        
        Yêu cầu:
        - Tạo ra 1 lựa chọn prompt bối cảnh duy nhất.
        - Bao gồm tên song ngữ, chi tiết 10 mục (Chủ thể, Kiến trúc, Nội/ngoại thất, Đạo cụ, Thời gian, Ánh sáng, Không khí, Màu sắc, Góc máy, Môi trường) bằng cả tiếng Anh và tiếng Việt.
        - Một đoạn rawPrompt bằng tiếng Anh hoàn chỉnh.
        - Bản dịch rawPromptVi sang tiếng Việt.
        - Tập trung vào sự khác biệt, độc đáo so với các mô tả thông thường.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ["nameEn", "nameVi", "detailsEn", "detailsVi", "rawPrompt", "rawPromptVi"],
            properties: {
              nameEn: { type: Type.STRING },
              nameVi: { type: Type.STRING },
              detailsEn: {
                type: Type.OBJECT,
                required: ["subject", "architecture", "interiorExterior", "props", "timeOfDay", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                properties: {
                  subject: { type: Type.STRING },
                  architecture: { type: Type.STRING },
                  interiorExterior: { type: Type.STRING },
                  props: { type: Type.STRING },
                  timeOfDay: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  atmosphere: { type: Type.STRING },
                  colors: { type: Type.STRING },
                  cameraAngle: { type: Type.STRING },
                  environment: { type: Type.STRING }
                }
              },
              detailsVi: {
                type: Type.OBJECT,
                required: ["subject", "architecture", "interiorExterior", "props", "timeOfDay", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                properties: {
                  subject: { type: Type.STRING },
                  architecture: { type: Type.STRING },
                  interiorExterior: { type: Type.STRING },
                  props: { type: Type.STRING },
                  timeOfDay: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  atmosphere: { type: Type.STRING },
                  colors: { type: Type.STRING },
                  cameraAngle: { type: Type.STRING },
                  environment: { type: Type.STRING }
                }
              },
              rawPrompt: { type: Type.STRING },
              rawPromptVi: { type: Type.STRING }
            }
          }
        }
      });

      let jsonStr = response.text || '';
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const newPrompt = JSON.parse(jsonStr);

      const newLocationData = {
        prompts: [newPrompt],
        generatedImages: {},
        imageSources: {},
        promptHistory: [newPrompt.nameEn]
      };

      // Update all instances of this location in the project
      const newProject = JSON.parse(JSON.stringify(project)) as Project;
      loc.instances.forEach((inst: any) => {
        const act = newProject.acts.find(a => a.id === inst.actId);
        const event = act?.events.find(e => e.id === inst.eventId);
        const version = event?.scriptVersions?.[event.currentVersionIndex];
        if (version && version.content[inst.elementIndex]) {
          version.content[inst.elementIndex].locationData = newLocationData;
        }
      });

      onUpdateProject(newProject);
    } catch (err) {
      console.error("Regenerate Location Error:", err);
      alert("Lỗi khi tạo lại bối cảnh: " + formatApiError(err));
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleJumpToScene = (sceneId: string) => {
    setSidebarTab('toc');
    setTimeout(() => {
      scrollToElement(sceneId);
    }, 100);
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    setIsDownloading(true);
    
    const opt = {
      margin:       15,
      filename:     `${project.title || 'Kich_ban'}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(printRef.current).save().then(() => {
      setIsDownloading(false);
    });
  };

  const handleDownloadTXT = (actId?: string) => {
    let content = '';

    if (actId) {
      const act = project.acts.find(a => a.id === actId);
      if (act) {
        content += `${act.title.toUpperCase()}\n\n`;
        act.events.forEach(ev => {
          if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
            const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
            scriptContent.forEach(el => {
              if (el.type === 'scene_heading') content += `\n${el.text.toUpperCase()}\n\n`;
              else if (el.type === 'character') content += `\n          ${el.text.toUpperCase()}\n`;
              else if (el.type === 'parenthetical') content += `          (${el.text.replace(/^\(|\)$/g, '')})\n`;
              else if (el.type === 'dialogue') {
                const parts = el.text.split(' | ');
                content += `          ${parts[0]}\n`;
              }
              else if (el.type === 'transition') content += `\n                                        ${el.text.toUpperCase()}\n`;
              else content += `${el.text}\n\n`;
            });
          }
        });
      }
    } else {
      content += `${project.title.toUpperCase()}\n\n`;
      project.acts.forEach(act => {
        content += `\n${act.title.toUpperCase()}\n\n`;
        act.events.forEach(ev => {
          if (ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0) {
            const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
            scriptContent.forEach(el => {
              if (el.type === 'scene_heading') content += `\n${el.text.toUpperCase()}\n\n`;
              else if (el.type === 'character') content += `\n          ${el.text.toUpperCase()}\n`;
              else if (el.type === 'parenthetical') content += `          (${el.text.replace(/^\(|\)$/g, '')})\n`;
              else if (el.type === 'dialogue') {
                const parts = el.text.split(' | ');
                content += `          ${parts[0]}\n`;
              }
              else if (el.type === 'transition') content += `\n                                        ${el.text.toUpperCase()}\n`;
              else content += `${el.text}\n\n`;
            });
          }
        });
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = actId 
      ? `${project.title}_${project.acts.find(a => a.id === actId)?.title}.txt`
      : `${project.title}_Full.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderScriptElement = (el: ScriptElement, idx: number, id?: string) => {
    switch (el.type) {
      case 'scene_heading':
        return <div key={idx} id={id} className="uppercase font-bold mt-8 mb-4 text-red-500">{el.text}</div>;
      case 'action':
        return <div key={idx} id={id} className="mb-4 text-theme-text leading-relaxed">{el.text}</div>;
      case 'character':
        return <div key={idx} id={id} className="uppercase ml-[20%] mt-6 mb-0 text-theme-text font-bold tracking-wide">{el.text}</div>;
      case 'parenthetical':
        return <div key={idx} id={id} className="ml-[15%] mr-[20%] mb-0 text-theme-text-muted italic">({el.text.replace(/^\(|\)$/g, '')})</div>;
      case 'dialogue':
        const parts = el.text.split(' | ');
        if (parts.length > 1) {
          return (
            <div key={idx} id={id} className="ml-[10%] mr-[15%] mb-4 text-theme-text leading-relaxed relative group cursor-help">
              <span>{parts[0]}</span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-theme-card text-theme-accent text-sm p-3 rounded-lg shadow-xl z-50 whitespace-pre-wrap w-max max-w-md border border-theme-accent/30">
                {parts.slice(1).join(' | ')}
              </div>
            </div>
          );
        }
        return <div key={idx} id={id} className="ml-[10%] mr-[15%] mb-4 text-theme-text leading-relaxed">{el.text}</div>;
      case 'transition':
        return <div key={idx} id={id} className="uppercase text-right mt-6 mb-6 text-theme-text font-bold">{el.text}</div>;
      default:
        return <div key={idx} id={id} className="mb-2 text-theme-text">{el.text}</div>;
    }
  };

  const items = useMemo(() => {
    const result: RenderItem[] = [];
    let currentDuration = 0;
    let currentPage = 1;

    const checkPageBreak = () => {
      while (currentDuration >= currentPage) {
        currentPage++;
        result.push({
          id: `page-break-${currentPage}`,
          type: 'page_break',
          pageNumber: currentPage,
          content: (
            <div className="flex items-center gap-4 my-12 opacity-50 select-none">
              <div className="flex-1 h-px bg-theme-border"></div>
              <div className="text-theme-text-dim font-mono text-sm">Trang {currentPage} (~{currentPage} phút)</div>
              <div className="flex-1 h-px bg-theme-border"></div>
            </div>
          )
        });
      }
    };

    project.acts.forEach((act, actIndex) => {
      result.push({
        id: act.id,
        type: 'act_heading',
        actId: act.id,
        content: (
          <div className="text-center mb-12 mt-8" id={act.id}>
            <div className="text-3xl font-bold text-theme-text uppercase border-b-2 border-theme-border pb-4 inline-block">
              Hồi {actIndex + 1}: <BilingualText text={act.title} secondaryClassName="text-theme-text-dim" />
            </div>
          </div>
        )
      });

      act.events.forEach((ev) => {
        const hasScript = ev.scriptVersions && ev.scriptVersions.length > 0 && ev.currentVersionIndex >= 0;
        if (!hasScript) {
          result.push({
            id: `placeholder-${ev.id}`,
            type: 'event_placeholder',
            actId: act.id,
            eventId: ev.id,
            content: (
              <div className="bg-theme-card/50 border border-theme-border p-6 rounded-xl text-center mb-8">
                <p className="text-theme-text-dim italic mb-2">[Chưa có kịch bản cho sự kiện này]</p>
                <div className="text-theme-text-muted text-sm"><BilingualText text={ev.description} secondaryClassName="text-theme-text-dim" /></div>
              </div>
            )
          });
          currentDuration += ev.duration;
          checkPageBreak();
        } else {
          const scriptContent = ev.scriptVersions[ev.currentVersionIndex].content;
          
          let totalLines = 0;
          const elementLines = scriptContent.map(el => {
            let lines = 1;
            switch (el.type) {
              case 'scene_heading': lines = 3; break;
              case 'action': lines = Math.ceil(el.text.length / 60) + 1; break;
              case 'character': lines = 2; break;
              case 'parenthetical': lines = 1; break;
              case 'dialogue': lines = Math.ceil(el.text.length / 35) + 1; break;
              case 'transition': lines = 2; break;
            }
            totalLines += lines;
            return lines;
          });

          scriptContent.forEach((el, idx) => {
            const isSceneHeading = el.type === 'scene_heading';
            const elId = isSceneHeading ? `scene-${act.id}-${ev.id}-${idx}` : `el-${act.id}-${ev.id}-${idx}`;
            
            result.push({
              id: elId,
              type: 'script_element',
              actId: act.id,
              eventId: ev.id,
              elementIndex: idx,
              isSceneHeading,
              text: el.text,
              hasLocationData: !!el.locationData,
              content: renderScriptElement(el, idx, elId)
            });

            const durationFraction = totalLines > 0 ? (elementLines[idx] / totalLines) * ev.duration : 0;
            currentDuration += durationFraction;
            checkPageBreak();
          });
        }
      });
    });

    return result;
  }, [project]);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const containerTop = contentRef.current.getBoundingClientRect().top;
      const scrollPosition = containerTop + 150; // Offset for header
      
      let currentActId = '';
      for (const act of project.acts) {
        const element = document.getElementById(act.id);
        if (element && element.getBoundingClientRect().top <= scrollPosition) {
          currentActId = act.id;
        }
      }
      
      if (currentActId && currentActId !== activeActId) {
        setActiveActId(currentActId);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      // Trigger once to set initial state
      handleScroll();
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [project.acts, activeActId]);

  const scrollToElement = (id: string) => {
    const element = document.getElementById(id);
    if (element && contentRef.current) {
      const containerTop = contentRef.current.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      contentRef.current.scrollTo({
        top: contentRef.current.scrollTop + (elementTop - containerTop) - 40,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative">
      <SelectionTooltip />
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 bg-theme-btn-sec text-theme-accent rounded-full hover:bg-theme-accent hover:text-theme-accent-text transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-full transition-colors ${isSidebarOpen ? 'bg-theme-accent text-theme-accent-text' : 'bg-theme-btn-sec text-theme-accent hover:bg-theme-accent hover:text-theme-accent-text'}`}
            title="Ẩn/Hiện mục lục"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-theme-text flex items-center gap-2">
              <FileText className="w-6 h-6 text-theme-accent" />
              Toàn bộ kịch bản: {project.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadTXT()}
            className="flex items-center gap-2 px-4 py-2 bg-theme-btn-sec hover:bg-theme-accent/20 text-theme-accent font-medium rounded-xl transition-colors shadow-lg shadow-theme-accent/20"
          >
            <Download className="w-5 h-5" />
            Tải TXT
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-theme-accent hover:bg-theme-accent/80 text-theme-accent-text font-medium rounded-xl transition-colors shadow-lg shadow-theme-accent/20 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isDownloading ? `Đang tạo PDF... ${downloadingProgress}%` : 'Tải PDF'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 bg-theme-bg/40 rounded-2xl border border-theme-border overflow-hidden">
        {/* Sidebar TOC */}
        {isSidebarOpen && (
          <div className="w-80 border-r border-theme-border bg-theme-card/20 flex flex-col shrink-0">
            <div className="flex border-b border-theme-border">
              <button
                onClick={() => setSidebarTab('toc')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${sidebarTab === 'toc' ? 'bg-theme-accent/20 text-theme-accent border-b-2 border-theme-accent' : 'text-theme-muted hover:text-theme-accent hover:bg-theme-btn-sec'}`}
              >
                <List className="w-4 h-4" />
                Mục lục
              </button>
              <button
                onClick={() => setSidebarTab('style')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${sidebarTab === 'style' ? 'bg-theme-accent/20 text-theme-accent border-b-2 border-theme-accent' : 'text-theme-muted hover:text-theme-accent hover:bg-theme-btn-sec'}`}
              >
                <Palette className="w-4 h-4" />
                Style
              </button>
              <button
                onClick={() => setSidebarTab('scenes')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  sidebarTab === 'scenes' ? 'bg-theme-accent/20 text-theme-accent border-b-2 border-theme-accent' : 'text-theme-muted hover:text-theme-accent hover:bg-theme-btn-sec'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Bối cảnh
              </button>
              <button
                onClick={() => setSidebarTab('characters')}
                className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                  sidebarTab === 'characters' ? 'bg-theme-accent/20 text-theme-accent border-b-2 border-theme-accent' : 'text-theme-muted hover:text-theme-accent hover:bg-theme-btn-sec'
                }`}
              >
                <Users className="w-4 h-4" />
                Nhân vật
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 custom-scrollbar">
              {sidebarTab === 'toc' && (
                <div className="flex flex-col gap-1">
                  {project.acts.map((act, index) => (
                    <div key={act.id} className="mb-4">
                      <div className="flex items-center justify-between group">
                        <div
                          onClick={() => scrollToElement(act.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              scrollToElement(act.id);
                            }
                          }}
                          className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                            activeActId === act.id
                              ? 'bg-theme-accent text-theme-accent-text font-medium shadow-lg shadow-theme-accent/20'
                              : 'text-theme-muted hover:bg-theme-btn-sec hover:text-theme-accent'
                          }`}
                        >
                          <div className="font-bold mb-1">Hồi {index + 1}</div>
                          <div className="text-xs opacity-80 break-words"><BilingualText text={act.title} /></div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadTXT(act.id);
                          }}
                          className="p-2 text-theme-muted hover:text-theme-accent opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Tải TXT hồi này"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="mt-2 ml-4 flex flex-col gap-2 border-l border-theme-border pl-3">
                        {act.events.map((ev, j) => (
                          <div key={ev.id} className="group flex items-start justify-between gap-2">
                            <div
                              onClick={() => scrollToElement(ev.scriptVersions?.length ? `el-${act.id}-${ev.id}-0` : `placeholder-${ev.id}`)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  scrollToElement(ev.scriptVersions?.length ? `el-${act.id}-${ev.id}-0` : `placeholder-${ev.id}`);
                                }
                              }}
                              className="text-left py-1 rounded text-xs text-theme-muted hover:text-theme-accent transition-colors break-words flex-1 cursor-pointer"
                            >
                              <BilingualText text={ev.description} prefix={<span className="font-bold mr-1">{j + 1}.</span>} />
                            </div>
                            {onEditEvent && ev.scriptVersions?.length > 0 && (
                              <button
                                onClick={() => onEditEvent(act.id, ev)}
                                className="p-1 opacity-0 group-hover:opacity-100 text-theme-accent hover:text-theme-accent/80 hover:bg-theme-btn-sec rounded transition-all shrink-0 mt-0.5"
                                title="Chỉnh sửa sự kiện này"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === 'scenes' && (
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="p-2 mb-2">
                    <div className="relative">
                      <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                      <input
                        type="text"
                        placeholder="Tìm bối cảnh..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-theme-input border border-theme-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-theme-accent/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {filteredLocations.length === 0 ? (
                      <div className="text-center py-8 text-theme-muted italic text-xs">
                        Không tìm thấy bối cảnh.
                      </div>
                    ) : (
                      filteredLocations.map((loc) => (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedLocationId(loc.id)}
                          className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedLocationId === loc.id
                              ? 'bg-theme-accent/10 border-theme-accent'
                              : 'bg-theme-card/30 border-theme-border hover:border-theme-accent/50 hover:bg-theme-card/50'
                          }`}
                        >
                          <button
                            onClick={(e) => handleRegenerateLocation(loc.id, e)}
                            disabled={isRegenerating === loc.id}
                            className={`absolute top-2 right-2 p-1 bg-theme-btn-sec text-theme-muted hover:text-theme-accent rounded transition-all ${selectedLocationId === loc.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            title="Tạo lại bằng AI"
                          >
                            {isRegenerating === loc.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                          </button>
                          
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 bg-theme-accent/20 text-theme-accent text-[8px] font-bold rounded uppercase tracking-wider">
                              {loc.type}
                            </span>
                            <h4 className="font-bold text-theme-text text-xs truncate pr-5">{loc.name}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[9px] text-theme-text-dim">
                            <span className="flex items-center gap-1">
                              <FileText className="w-2.5 h-2.5" />
                              {loc.instances.length} cảnh
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {loc.instances[0]?.time}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {sidebarTab === 'characters' && (
                <div className="flex flex-col gap-3">
                  {allCharacters.map((char) => (
                    <div key={char.id} className="bg-theme-card/30 border border-theme-border rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-theme-accent text-sm">{char.name}</div>
                          <div className="text-xs text-theme-muted mt-0.5">{char.relationship}</div>
                        </div>
                        <div className="flex items-center">
                          {char.promptData && (
                            <button
                              onClick={() => setActiveCharacterPrompt({ character: char, reset: true })}
                              className="p-1.5 text-theme-accent hover:text-theme-accent/80 hover:bg-theme-btn-sec rounded transition-all shrink-0 ml-1"
                              title="Tạo lại Nhân vật (Reset)"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setActiveCharacterPrompt({ character: char })}
                            className="p-1.5 text-theme-accent hover:text-theme-accent/80 hover:bg-theme-btn-sec rounded transition-all shrink-0 ml-1"
                            title={char.promptData ? "Xem Nhân vật" : "Tạo Prompt Nhân vật"}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === 'style' && (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-theme-muted">
                  <Palette className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm italic">Sử dụng bảng bên phải để điều chỉnh phong cách kịch bản.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarTab === 'style' && (
            <StyleSelector project={project} onUpdateProject={onUpdateProject} />
          )}
          
          {sidebarTab === 'scenes' && (
            <div className="flex-1 overflow-y-auto bg-theme-bg custom-scrollbar">
              {selectedLocation ? (
                <div className="p-8 md:p-12 max-w-4xl mx-auto">
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-theme-accent text-theme-accent-text text-xs font-bold rounded-lg uppercase tracking-widest">
                        {selectedLocation.type}
                      </span>
                      <h2 className="text-4xl font-bold text-theme-text tracking-tight">{selectedLocation.name}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                      <div className="space-y-8">
                        <section>
                          <h3 className="text-xs font-bold text-theme-accent uppercase tracking-widest mb-4 border-b border-theme-border pb-2">
                            Mô tả bối cảnh
                          </h3>
                          <p className="text-theme-text leading-relaxed text-lg font-serif">
                            {selectedLocation.description}
                          </p>
                        </section>

                        {selectedLocation.mood && (
                          <section>
                            <h3 className="text-xs font-bold text-theme-accent uppercase tracking-widest mb-4 border-b border-theme-border pb-2">
                              Không khí & Cảm xúc
                            </h3>
                            <p className="text-theme-text-muted leading-relaxed italic">
                              {selectedLocation.mood}
                            </p>
                          </section>
                        )}

                        {selectedLocation.visualCues && (
                          <section>
                            <h3 className="text-xs font-bold text-theme-accent uppercase tracking-widest mb-4 border-b border-theme-border pb-2">
                              Chi tiết hình ảnh / Đạo cụ
                            </h3>
                            <p className="text-theme-text-muted leading-relaxed">
                              {selectedLocation.visualCues}
                            </p>
                          </section>
                        )}
                      </div>

                      <div className="space-y-8">
                        <section>
                          <h3 className="text-xs font-bold text-theme-accent uppercase tracking-widest mb-4 border-b border-theme-border pb-2">
                            Các cảnh liên quan ({selectedLocation.instances.length})
                          </h3>
                          <div className="space-y-3">
                            {selectedLocation.instances.map((inst: any, idx: number) => (
                              <div
                                key={idx}
                                onClick={() => handleJumpToScene(inst.sceneId)}
                                className="group p-4 bg-theme-card/30 border border-theme-border rounded-2xl hover:border-theme-accent/50 hover:bg-theme-card/50 transition-all cursor-pointer"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-theme-accent uppercase tracking-wider">
                                    {inst.actTitle}
                                  </span>
                                  <span className="text-[10px] text-theme-text-dim font-mono">
                                    {inst.time}
                                  </span>
                                </div>
                                <p className="text-xs text-theme-text font-medium line-clamp-2 group-hover:text-theme-accent transition-colors">
                                  {inst.eventDescription}
                                </p>
                                <div className="mt-3 flex items-center gap-1 text-[10px] text-theme-accent font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                  Xem trong kịch bản
                                  <ChevronLeft className="w-3 h-3 rotate-180" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-theme-muted p-12 text-center">
                  <div className="w-24 h-24 bg-theme-card/30 rounded-full flex items-center justify-center mb-6 border border-theme-border">
                    <MapPin className="w-10 h-10 opacity-20" />
                  </div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">Chọn một bối cảnh</h3>
                  <p className="max-w-xs text-sm leading-relaxed">
                    Chọn một địa điểm từ danh sách bên trái để xem chi tiết, mô tả hình ảnh và các cảnh quay liên quan.
                  </p>
                </div>
              )}
            </div>
          )}

          {(sidebarTab === 'toc' || sidebarTab === 'characters') && (
            <div 
              ref={contentRef}
              className="flex-1 overflow-y-auto p-8 md:p-12 bg-theme-bg relative custom-scrollbar"
            >
              <div ref={printRef} className="max-w-3xl mx-auto font-mono text-lg bg-theme-card text-theme-text p-12 min-h-[800px] shadow-2xl rounded-sm leading-tight" style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}>
                {/* Title Page */}
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center mb-24 border-b border-theme-border pb-24">
                  <h1 className="text-5xl font-bold text-theme-text mb-8 uppercase tracking-widest">{project.title}</h1>
                  <div className="text-theme-text-muted mb-12">
                    <p>Kịch bản được tạo bởi AI Studio</p>
                    <p>Thời lượng dự kiến: {project.duration} phút</p>
                  </div>
                </div>

                {/* Script Content */}
                <div className="script-content">
                  {items.map((item) => (
                    <React.Fragment key={item.id}>
                      {item.content}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeLocationPrompt && (() => {
        const act = project.acts.find(a => a.id === activeLocationPrompt.actId);
        const event = act?.events.find(e => e.id === activeLocationPrompt.eventId);
        const version = event?.scriptVersions[event.currentVersionIndex];
        const initialData = activeLocationPrompt.reset ? undefined : version?.content[activeLocationPrompt.elementIndex]?.locationData;

        return (
          <LocationPromptModal
            sceneText={activeLocationPrompt.text}
            scriptContext={project.acts.map(act => act.events.map(ev => ev.description).join('\n')).join('\n')}
            globalStylePrompt={project.globalStylePrompt}
            onClose={() => setActiveLocationPrompt(null)}
            initialData={initialData}
            onSave={(locationData) => {
              if (!onUpdateProject) return;
              
              // Create a deep copy of the project to ensure React detects the change
              const newProject = JSON.parse(JSON.stringify(project)) as Project;
              const newAct = newProject.acts.find(a => a.id === activeLocationPrompt.actId);
              if (!newAct) return;
              const newEvent = newAct.events.find(e => e.id === activeLocationPrompt.eventId);
              if (!newEvent) return;
              const newVersion = newEvent.scriptVersions[newEvent.currentVersionIndex];
              if (!newVersion) return;
              
              newVersion.content[activeLocationPrompt.elementIndex].locationData = locationData;
              
              onUpdateProject(newProject);
            }}
          />
        );
      })()}

      {activeCharacterPrompt && (
        <CharacterPromptModal
          character={activeCharacterPrompt.character}
          scriptContext={project.acts.map(act => act.events.map(ev => ev.description).join('\n')).join('\n')}
          globalStylePrompt={project.globalStylePrompt}
          onClose={() => setActiveCharacterPrompt(null)}
          initialData={activeCharacterPrompt.reset ? undefined : activeCharacterPrompt.character.promptData}
          onSave={(promptData) => {
            if (!onUpdateProject) return;
            
            const newProject = JSON.parse(JSON.stringify(project)) as Project;
            
            // Initialize scriptCharacters array if it doesn't exist
            if (!newProject.scriptCharacters) {
              newProject.scriptCharacters = [];
            }
            
            const charNameLower = activeCharacterPrompt.character.name.toLowerCase();
            const existingCharIndex = newProject.scriptCharacters.findIndex(
              sc => sc.name.toLowerCase() === charNameLower
            );
            
            if (existingCharIndex >= 0) {
              newProject.scriptCharacters[existingCharIndex].promptData = promptData;
            } else {
              newProject.scriptCharacters.push({
                ...activeCharacterPrompt.character,
                promptData
              });
            }
            
            onUpdateProject(newProject);
          }}
        />
      )}
    </div>
  );
}
