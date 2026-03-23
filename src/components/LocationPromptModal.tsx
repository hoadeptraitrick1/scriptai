import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Image as ImageIcon, Loader2, Check, Sparkles, ChevronDown, ChevronUp, RefreshCw, Upload, Download } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { formatApiError } from '../utils/error';
import { useFakeProgress } from '../hooks/useFakeProgress';

export interface LocationData {
  prompts: LocationPrompt[];
  generatedImages: Record<number, string>;
  imageSources?: Record<number, 'ai' | 'upload'>;
  promptHistory?: string[];
}

interface LocationPromptModalProps {
  sceneText: string;
  scriptContext: string;
  globalStylePrompt?: string;
  onClose: () => void;
  initialData?: LocationData;
  onSave?: (data: LocationData) => void;
}

interface PromptDetails {
  subject: string;
  architecture: string;
  interiorExterior: string;
  props: string;
  timeOfDay: string;
  lighting: string;
  atmosphere: string;
  colors: string;
  cameraAngle: string;
  environment: string;
}

interface LocationPrompt {
  nameEn: string;
  nameVi: string;
  detailsEn: PromptDetails;
  detailsVi: PromptDetails;
  rawPrompt: string;
  rawPromptVi: string;
}

export function LocationPromptModal({ sceneText, scriptContext, globalStylePrompt, onClose, initialData, onSave }: LocationPromptModalProps) {
  const [isLoading, setIsLoading] = useState(!initialData);
  const [prompts, setPrompts] = useState<LocationPrompt[]>(initialData?.prompts || []);
  const [drawingPromptIndex, setDrawingPromptIndex] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>(initialData?.generatedImages || {});
  const [imageSources, setImageSources] = useState<Record<number, 'ai' | 'upload'>>(initialData?.imageSources || {});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPromptIndex, setExpandedPromptIndex] = useState<number | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>(initialData?.promptHistory || []);
  const [resettingPromptIndex, setResettingPromptIndex] = useState<number | null>(null);

  const loadingProgress = useFakeProgress(isLoading, 135000);
  const drawingProgress = useFakeProgress(drawingPromptIndex !== null, 25000);

  const onSaveRef = useRef(onSave);
  const promptRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Save data whenever it changes
  useEffect(() => {
    if (prompts.length > 0 && onSaveRef.current) {
      onSaveRef.current({ prompts, generatedImages, imageSources, promptHistory });
    }
  }, [prompts, generatedImages, imageSources, promptHistory]);

  useEffect(() => {
    if (!initialData) {
      generatePrompts();
    }
  }, []);

  const generatePrompts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const promptText = `
        Bạn là một chuyên gia thiết kế bối cảnh (Production Designer) và kỹ sư prompt AI.
        Dựa vào bối cảnh: "${sceneText}"
        Và nội dung kịch bản liên quan:
        """
        ${scriptContext}
        """
        
        LƯU Ý QUAN TRỌNG: Mục đích của prompt này là để tạo ra các bức ảnh THIẾT KẾ KHÔNG GIAN (Location Design / Concept Art) làm tài liệu tham khảo (ingredients). KHÔNG BAO GỒM NGƯỜI HAY NHÂN VẬT trong bối cảnh. Chỉ tập trung vào không gian, kiến trúc, nội/ngoại thất và đạo cụ.

        Hãy viết ra 5 lựa chọn prompt mô tả chi tiết bối cảnh này. Mỗi lựa chọn cần có tên song ngữ, chi tiết 10 mục (Chủ thể (chỉ là không gian/đồ vật, KHÔNG CÓ NGƯỜI), Kiến trúc, Nội/ngoại thất, Đạo cụ, Thời gian, Ánh sáng, Không khí, Màu sắc, Góc máy (BỎ QUA POV. Yêu cầu 6 góc: bên trái, bên phải, từ trên xuống, phía trước, phía sau, từ dưới lên trần nhà), Môi trường) bằng cả tiếng Anh và tiếng Việt, và một đoạn rawPrompt bằng tiếng Anh hoàn chỉnh để đưa vào AI vẽ ảnh, CÙNG VỚI bản dịch rawPromptVi sang tiếng Việt.
        
        CRITICAL: 
        - Các mục chi tiết (đặc biệt là Ánh sáng, Góc máy, Màu sắc, Không khí) PHẢI tập trung vào các thuật ngữ điện ảnh, quay dựng chuyên nghiệp (ví dụ: practical lighting, low key, chiaroscuro, high contrast, dutch angle, tracking shot feel, v.v.) chứ không chỉ mô tả chung chung.
        - Trong rawPrompt phải nhấn mạnh "empty location, no people, no characters, NO POV shots". 
        - Đặc biệt yêu cầu 6 góc máy cụ thể cho 6 tấm ảnh: "1. Left side view, 2. Right side view, 3. Top-down overhead view, 4. Front view, 5. Back view, 6. Bottom-up view looking at the ceiling".
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ["prompts"],
            properties: {
              prompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["nameEn", "nameVi", "detailsEn", "detailsVi", "rawPrompt"],
                  properties: {
                    nameEn: { type: Type.STRING },
                    nameVi: { type: Type.STRING },
                    detailsEn: {
                      type: Type.OBJECT,
                      required: ["subject", "architecture", "interiorExterior", "props", "timeOfDay", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                      properties: {
                        subject: { type: Type.STRING, description: "Subject/Focus" },
                        architecture: { type: Type.STRING, description: "Architecture/Structure" },
                        interiorExterior: { type: Type.STRING, description: "Interior/Exterior details" },
                        props: { type: Type.STRING, description: "Props/Objects" },
                        timeOfDay: { type: Type.STRING, description: "Time of day" },
                        lighting: { type: Type.STRING, description: "Lighting" },
                        atmosphere: { type: Type.STRING, description: "Atmosphere/Mood" },
                        colors: { type: Type.STRING, description: "Color palette" },
                        cameraAngle: { type: Type.STRING, description: "Camera angle/Shot type" },
                        environment: { type: Type.STRING, description: "Environment/Weather" }
                      }
                    },
                    detailsVi: {
                      type: Type.OBJECT,
                      required: ["subject", "architecture", "interiorExterior", "props", "timeOfDay", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                      properties: {
                        subject: { type: Type.STRING, description: "Chủ thể/Trọng tâm" },
                        architecture: { type: Type.STRING, description: "Kiến trúc/Cấu trúc" },
                        interiorExterior: { type: Type.STRING, description: "Chi tiết nội/ngoại thất" },
                        props: { type: Type.STRING, description: "Đạo cụ/Vật thể" },
                        timeOfDay: { type: Type.STRING, description: "Thời gian trong ngày" },
                        lighting: { type: Type.STRING, description: "Ánh sáng" },
                        atmosphere: { type: Type.STRING, description: "Không khí/Cảm xúc" },
                        colors: { type: Type.STRING, description: "Màu sắc" },
                        cameraAngle: { type: Type.STRING, description: "Góc máy" },
                        environment: { type: Type.STRING, description: "Thời tiết/Môi trường" }
                      }
                    },
                    rawPrompt: { type: Type.STRING, description: "Đoạn prompt tiếng Anh hoàn chỉnh gộp các chi tiết trên" },
                    rawPromptVi: { type: Type.STRING, description: "Bản dịch tiếng Việt của rawPrompt" }
                  }
                }
              }
            }
          }
        }
      });

      let jsonStr = response.text || '';
      if (!jsonStr) {
        throw new Error("Không nhận được phản hồi từ AI (có thể do vi phạm chính sách an toàn).");
      }
      
      // Remove markdown formatting if present
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      
      const data = JSON.parse(jsonStr);
      if (data.prompts) {
        setPrompts(data.prompts);
        setPromptHistory(prev => [...new Set([...prev, ...data.prompts.map((p: any) => p.nameEn)])]);
      } else {
        throw new Error("Dữ liệu trả về không hợp lệ: Thiếu prompts");
      }
    } catch (err: any) {
      console.error("Generate Prompts Error:", err);
      setError(formatApiError(err) || "Có lỗi xảy ra khi tạo prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (prompt: LocationPrompt, index: number) => {
    const locationDetails = `Subject: ${prompt.detailsEn.subject}, Architecture: ${prompt.detailsEn.architecture}, Interior/Exterior: ${prompt.detailsEn.interiorExterior}, Props: ${prompt.detailsEn.props}, Time of Day: ${prompt.detailsEn.timeOfDay}, Lighting: ${prompt.detailsEn.lighting}, Atmosphere: ${prompt.detailsEn.atmosphere}, Colors: ${prompt.detailsEn.colors}, Camera Angle: ${prompt.detailsEn.cameraAngle}, Environment: ${prompt.detailsEn.environment}. Raw Prompt: ${prompt.rawPrompt}`;

    let imagePrompt = `A 2x3 grid showing 6 different camera angles of the EXACT SAME EMPTY LOCATION. NO PEOPLE, NO CHARACTERS, NO POV SHOTS. 
    Location details: ${locationDetails}. 
    The image MUST be a grid of 6 panels (2 rows, 3 columns). 
    Each panel MUST show one of these 6 specific angles in order: 
    1. Left side view, 
    2. Right side view, 
    3. Top-down overhead view, 
    4. Front view, 
    5. Back view, 
    6. Bottom-up view looking at the ceiling. 
    Showcase the architecture, interior/exterior, and props from these 6 perspectives.`;

    let textToCopy = imagePrompt;
    if (globalStylePrompt) {
      textToCopy = globalStylePrompt.replace('[A]', imagePrompt);
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExpandPrompt = (idx: number) => {
    if (expandedPromptIndex === idx) {
      setExpandedPromptIndex(null);
    } else {
      setExpandedPromptIndex(idx);
      setTimeout(() => {
        const el = promptRefs.current[idx];
        const container = scrollContainerRef.current;
        if (el && container) {
          const containerTop = container.getBoundingClientRect().top;
          const elTop = el.getBoundingClientRect().top;
          const scrollTop = container.scrollTop + (elTop - containerTop) - 20; // 20px padding
          container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleDraw = async (promptIndex: number) => {
    setViewingImageIndex(promptIndex);
    if (generatedImages[promptIndex] && imageSources[promptIndex] === 'ai') return; // Already generated by AI

    setDrawingPromptIndex(promptIndex);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptData = prompts[promptIndex];

      const locationDetails = `Subject: ${promptData.detailsEn.subject}, Architecture: ${promptData.detailsEn.architecture}, Interior/Exterior: ${promptData.detailsEn.interiorExterior}, Props: ${promptData.detailsEn.props}, Time of Day: ${promptData.detailsEn.timeOfDay}, Lighting: ${promptData.detailsEn.lighting}, Atmosphere: ${promptData.detailsEn.atmosphere}, Colors: ${promptData.detailsEn.colors}, Camera Angle: ${promptData.detailsEn.cameraAngle}, Environment: ${promptData.detailsEn.environment}. Raw Prompt: ${promptData.rawPrompt}`;

      let imagePrompt = `A 2x3 grid showing 6 different camera angles of the EXACT SAME EMPTY LOCATION. NO PEOPLE, NO CHARACTERS, NO POV SHOTS. 
      Location details: ${locationDetails}. 
      The image MUST be a grid of 6 panels (2 rows, 3 columns). 
      Each panel MUST show one of these 6 specific angles in order: 
      1. Left side view, 
      2. Right side view, 
      3. Top-down overhead view, 
      4. Front view, 
      5. Back view, 
      6. Bottom-up view looking at the ceiling. 
      Showcase the architecture, interior/exterior, and props from these 6 perspectives.`;

      if (globalStylePrompt) {
        imagePrompt = globalStylePrompt.replace('[A]', imagePrompt);
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: imagePrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImages(prev => ({ ...prev, [promptIndex]: imageUrl }));
        setImageSources(prev => ({ ...prev, [promptIndex]: 'ai' }));
      } else {
        throw new Error("Không nhận được ảnh từ AI");
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi vẽ ảnh: " + formatApiError(err));
    } finally {
      setDrawingPromptIndex(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, promptIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setGeneratedImages(prev => ({ ...prev, [promptIndex]: base64String }));
        setImageSources(prev => ({ ...prev, [promptIndex]: 'upload' }));
        setViewingImageIndex(promptIndex);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadImage = (promptIndex: number) => {
    const imageUrl = generatedImages[promptIndex];
    if (!imageUrl) return;
    
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `location_prompt_${promptIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePromptChange = (index: number, field: 'rawPrompt' | 'rawPromptVi', value: string) => {
    setPrompts(prev => {
      const newPrompts = [...prev];
      newPrompts[index] = { ...newPrompts[index], [field]: value };
      return newPrompts;
    });
  };

  const resetPrompt = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResettingPromptIndex(index);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const promptText = `
        Bạn là một chuyên gia thiết kế bối cảnh (Production Designer) và kỹ sư prompt AI.
        Dựa vào bối cảnh: "${sceneText}"
        Và nội dung kịch bản liên quan:
        """
        ${scriptContext}
        """
        
        Các lựa chọn bối cảnh hiện tại: ${prompts.map(p => p.nameEn).join(', ')}
        Các lựa chọn bối cảnh đã từng tạo (lịch sử): ${promptHistory.join(', ')}

        LƯU Ý QUAN TRỌNG: Mục đích của prompt này là để tạo ra các bức ảnh THIẾT KẾ KHÔNG GIAN (Location Design / Concept Art) làm tài liệu tham khảo (ingredients). KHÔNG BAO GỒM NGƯỜI HAY NHÂN VẬT trong bối cảnh. Chỉ tập trung vào không gian, kiến trúc, nội/ngoại thất và đạo cụ.

        Hãy viết ra 1 lựa chọn prompt MỚI, KHÁC BIỆT hoàn toàn với các lựa chọn hiện tại và lịch sử ở trên, mô tả chi tiết bối cảnh này. 
        Lựa chọn cần có tên song ngữ, chi tiết 10 mục (Chủ thể (chỉ là không gian/đồ vật, KHÔNG CÓ NGƯỜI), Kiến trúc, Nội/ngoại thất, Đạo cụ, Thời gian, Ánh sáng, Không khí, Màu sắc, Góc máy (BỎ QUA POV. Yêu cầu 6 góc: bên trái, bên phải, từ trên xuống, phía trước, phía sau, từ dưới lên trần nhà), Môi trường) bằng cả tiếng Anh và tiếng Việt, và một đoạn rawPrompt bằng tiếng Anh hoàn chỉnh để đưa vào AI vẽ ảnh, CÙNG VỚI bản dịch rawPromptVi sang tiếng Việt.
        
        CRITICAL: 
        - Các mục chi tiết (đặc biệt là Ánh sáng, Góc máy, Màu sắc, Không khí) PHẢI tập trung vào các thuật ngữ điện ảnh, quay dựng chuyên nghiệp (ví dụ: practical lighting, low key, chiaroscuro, high contrast, dutch angle, tracking shot feel, v.v.) chứ không chỉ mô tả chung chung.
        - Trong rawPrompt phải nhấn mạnh "empty location, no people, no characters, NO POV shots".
        - Đặc biệt yêu cầu 6 góc máy cụ thể cho 6 tấm ảnh: "1. Left side view, 2. Right side view, 3. Top-down overhead view, 4. Front view, 5. Back view, 6. Bottom-up view looking at the ceiling".
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
                  subject: { type: Type.STRING, description: "Subject/Focus" },
                  architecture: { type: Type.STRING, description: "Architecture/Structure" },
                  interiorExterior: { type: Type.STRING, description: "Interior/Exterior details" },
                  props: { type: Type.STRING, description: "Props/Objects" },
                  timeOfDay: { type: Type.STRING, description: "Time of day" },
                  lighting: { type: Type.STRING, description: "Lighting" },
                  atmosphere: { type: Type.STRING, description: "Atmosphere/Mood" },
                  colors: { type: Type.STRING, description: "Color palette" },
                  cameraAngle: { type: Type.STRING, description: "Camera angle/Shot type" },
                  environment: { type: Type.STRING, description: "Environment/Weather" }
                }
              },
              detailsVi: {
                type: Type.OBJECT,
                required: ["subject", "architecture", "interiorExterior", "props", "timeOfDay", "lighting", "atmosphere", "colors", "cameraAngle", "environment"],
                properties: {
                  subject: { type: Type.STRING, description: "Chủ thể/Trọng tâm" },
                  architecture: { type: Type.STRING, description: "Kiến trúc/Cấu trúc" },
                  interiorExterior: { type: Type.STRING, description: "Chi tiết nội/ngoại thất" },
                  props: { type: Type.STRING, description: "Đạo cụ/Vật thể" },
                  timeOfDay: { type: Type.STRING, description: "Thời gian trong ngày" },
                  lighting: { type: Type.STRING, description: "Ánh sáng" },
                  atmosphere: { type: Type.STRING, description: "Không khí/Cảm xúc" },
                  colors: { type: Type.STRING, description: "Màu sắc" },
                  cameraAngle: { type: Type.STRING, description: "Góc máy" },
                  environment: { type: Type.STRING, description: "Thời tiết/Môi trường" }
                }
              },
              rawPrompt: { type: Type.STRING, description: "Đoạn prompt tiếng Anh hoàn chỉnh gộp các chi tiết trên" },
              rawPromptVi: { type: Type.STRING, description: "Bản dịch tiếng Việt của rawPrompt" }
            }
          }
        }
      });

      let jsonStr = response.text || '';
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const newPrompt = JSON.parse(jsonStr);

      setPrompts(prev => {
        const newPrompts = [...prev];
        newPrompts[index] = newPrompt;
        return newPrompts;
      });
      setPromptHistory(prev => [...new Set([...prev, newPrompt.nameEn])]);
      
      // Clear generated image for this prompt if it exists
      setGeneratedImages(prev => {
        const newImages = { ...prev };
        delete newImages[index];
        return newImages;
      });
    } catch (err: any) {
      console.error("Reset Prompt Error:", err);
      alert("Lỗi khi tạo lại bối cảnh: " + formatApiError(err));
    } finally {
      setResettingPromptIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-theme-border bg-black/40">
          <h2 className="text-xl font-bold text-theme-accent flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Phân tích Bối cảnh: {sceneText}
          </h2>
          <button onClick={onClose} className="p-2 text-theme-muted hover:text-theme-text hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-theme-accent gap-4">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="font-medium animate-pulse">Đang phân tích kịch bản và sáng tạo bối cảnh... {loadingProgress}%</p>
            </div>
          ) : error ? (
            <div className="text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-900/50 text-center">
              {error}
              <button onClick={generatePrompts} className="mt-4 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 rounded-lg transition-colors">
                Thử lại
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Prompts Section */}
              <section>
                <h3 className="text-lg font-bold text-theme-text mb-4 flex items-center gap-2">
                  <span className="bg-theme-accent text-theme-accent-text w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Các lựa chọn Bối cảnh
                </h3>
                <div className="space-y-4">
                  {prompts.map((prompt, idx) => (
                    <div 
                      key={idx} 
                      ref={(el) => { promptRefs.current[idx] = el; }}
                      className="bg-black/40 border border-theme-border rounded-xl overflow-hidden transition-all"
                    >
                      <div 
                        onClick={() => handleExpandPrompt(idx)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleExpandPrompt(idx);
                          }
                        }}
                        className="w-full p-4 border-b border-theme-border bg-theme-accent/5 hover:bg-theme-accent/10 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <h4 className="font-bold text-theme-accent text-lg flex items-center gap-2">
                          Option {idx + 1}: {prompt.nameVi} <span className="text-sm font-normal text-theme-muted">| {prompt.nameEn}</span>
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => resetPrompt(idx, e)}
                            disabled={resettingPromptIndex !== null}
                            className="p-1.5 text-theme-muted hover:text-theme-text hover:bg-theme-btn-sec rounded-md transition-colors"
                            title="Tạo lại bối cảnh khác"
                          >
                            {resettingPromptIndex === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </button>
                          {expandedPromptIndex === idx ? <ChevronUp className="w-5 h-5 text-theme-accent" /> : <ChevronDown className="w-5 h-5 text-theme-accent" />}
                        </div>
                      </div>
                      
                      {expandedPromptIndex === idx && (
                        <div className="p-4 flex flex-col gap-6">
                          <div className="flex items-center justify-end gap-2">
                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-btn-sec hover:bg-theme-accent/20 text-theme-text rounded-lg text-sm transition-colors cursor-pointer">
                              <Upload className="w-4 h-4" />
                              Tải ảnh lên
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, idx)} 
                              />
                            </label>
                            <button
                              onClick={() => handleCopy(prompt, idx)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-btn-sec hover:bg-theme-accent/20 text-theme-text rounded-lg text-sm transition-colors"
                            >
                              {copiedIndex === idx ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                              {copiedIndex === idx ? 'Đã copy' : 'Copy Prompt'}
                            </button>
                            <button
                              onClick={() => handleDraw(idx)}
                              disabled={drawingPromptIndex !== null}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent hover:bg-theme-accent/80 disabled:bg-theme-btn-sec disabled:text-theme-muted text-theme-accent-text rounded-lg text-sm font-medium transition-colors"
                            >
                              {drawingPromptIndex === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              {drawingPromptIndex === idx ? `Đang vẽ... ${drawingProgress}%` : generatedImages[idx] ? 'Xem Bối cảnh' : 'Vẽ Bối cảnh'}
                            </button>
                          </div>

                          <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <h5 className="font-bold text-theme-muted border-b border-theme-border pb-2">English Details</h5>
                              <h5 className="font-bold text-theme-muted border-b border-theme-border pb-2 hidden lg:block">Chi tiết Tiếng Việt</h5>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                              {/* Subject */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Subject</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.subject}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Chủ thể</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.subject}</span>
                              </div>

                              {/* Architecture */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Architecture</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.architecture}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Kiến trúc</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.architecture}</span>
                              </div>

                              {/* Interior/Exterior */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Interior/Exterior</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.interiorExterior}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Nội/Ngoại thất</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.interiorExterior}</span>
                              </div>

                              {/* Props */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Props</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.props}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Đạo cụ</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.props}</span>
                              </div>

                              {/* Time of Day */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Time of Day</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.timeOfDay}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Thời gian</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.timeOfDay}</span>
                              </div>

                              {/* Lighting */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Lighting</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.lighting}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Ánh sáng</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.lighting}</span>
                              </div>

                              {/* Atmosphere */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Atmosphere</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.atmosphere}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Không khí</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.atmosphere}</span>
                              </div>

                              {/* Colors */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Colors</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.colors}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Màu sắc</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.colors}</span>
                              </div>

                              {/* Camera Angle */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Camera Angle</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.cameraAngle}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Góc máy</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.cameraAngle}</span>
                              </div>

                              {/* Environment */}
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Environment</span>
                                <span className="text-theme-text font-serif leading-relaxed">{prompt.detailsEn.environment}</span>
                              </div>
                              <div className="bg-theme-input/50 p-3 rounded-lg border border-theme-border flex flex-col h-full">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Môi trường</span>
                                <span className="text-theme-text font-sans leading-relaxed">{prompt.detailsVi.environment}</span>
                              </div>

                              {/* Raw Prompt */}
                              <div className="bg-theme-input p-4 rounded-xl border border-theme-border flex flex-col h-full col-span-1">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Raw Prompt (English) - Có thể chỉnh sửa</span>
                                <textarea 
                                  className="text-theme-text font-mono text-sm leading-relaxed bg-transparent border-none outline-none resize-y min-h-[100px] w-full custom-scrollbar"
                                  value={prompt.rawPrompt}
                                  onChange={(e) => handlePromptChange(idx, 'rawPrompt', e.target.value)}
                                />
                              </div>
                              <div className="bg-theme-input p-4 rounded-xl border border-theme-border flex flex-col h-full col-span-1">
                                <span className="text-theme-accent font-bold text-xs mb-2 uppercase tracking-wider bg-theme-accent/10 px-2 py-1 rounded w-fit">Raw Prompt (Tiếng Việt) - Có thể chỉnh sửa</span>
                                <textarea 
                                  className="text-theme-text font-sans text-sm leading-relaxed bg-transparent border-none outline-none resize-y min-h-[100px] w-full custom-scrollbar"
                                  value={prompt.rawPromptVi || ""}
                                  onChange={(e) => handlePromptChange(idx, 'rawPromptVi', e.target.value)}
                                  placeholder="Đang cập nhật..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Image Generation/Viewing Modal */}
      {viewingImageIndex !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col items-center justify-center">
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              {generatedImages[viewingImageIndex] && (
                <button 
                  onClick={() => handleDownloadImage(viewingImageIndex)} 
                  className="p-2 text-theme-muted hover:text-theme-text bg-theme-card/50 hover:bg-theme-card rounded-full transition-colors"
                  title="Tải ảnh về máy"
                >
                  <Download className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={() => setViewingImageIndex(null)} 
                className="p-2 text-theme-muted hover:text-theme-text bg-theme-card/50 hover:bg-theme-card rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {generatedImages[viewingImageIndex] ? (
              <div className="relative">
                <div className="absolute top-4 left-4 z-10">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${imageSources[viewingImageIndex] === 'upload' ? 'bg-blue-500/90 text-white' : 'bg-theme-accent/90 text-theme-accent-text'}`}>
                    {imageSources[viewingImageIndex] === 'upload' ? 'Ảnh tải lên' : 'AI Tạo'}
                  </span>
                </div>
                <img src={generatedImages[viewingImageIndex]} alt="Location Concept" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
              </div>
            ) : drawingPromptIndex === viewingImageIndex ? (
              <div className="flex flex-col items-center text-theme-accent gap-4 bg-theme-card/50 p-12 rounded-2xl border border-theme-border">
                <Loader2 className="w-16 h-16 animate-spin" />
                <span className="text-xl font-medium animate-pulse">Đang vẽ Bối cảnh (6 góc độ)... {drawingProgress}%</span>
                <p className="text-theme-muted text-sm mt-2">Quá trình này có thể mất vài chục giây.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
