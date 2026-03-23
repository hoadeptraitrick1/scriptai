import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Save, Sparkles, RefreshCw, PenLine, ThumbsDown, ThumbsUp, X, ArrowLeftRight } from 'lucide-react';
import { generateQuestions, generateDirections, generateStoryStyles, StyleOption, generateActs, generateRandomIdeas, regenerateQuestionOptions, regenerateDirections, regenerateActs, regenerateActWithNote, regenerateEventWithNote } from '../services/ai';
import { Project, Question, Act, RandomIdea, DislikedIdea, LikedIdea, Character } from '../types';
import { BilingualText } from './BilingualText';
import { CharacterEditorModal } from './CharacterEditorModal';
import { formatApiError } from '../utils/error';
import { useFakeProgress } from '../hooks/useFakeProgress';

interface CreateFlowProps {
  onSaveProject: (project: Project) => void;
  dislikedIdeas: DislikedIdea[];
  onDislikeIdea: (idea: DislikedIdea) => void;
  likedIdeas: LikedIdea[];
  onLikeIdea: (idea: LikedIdea) => void;
  prefilledIdea: LikedIdea | null;
  onClearPrefilled: () => void;
}

export default function CreateFlow({ onSaveProject, dislikedIdeas, onDislikeIdea, likedIdeas, onLikeIdea, prefilledIdea, onClearPrefilled }: CreateFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Idea generation state
  const [hasIdea, setHasIdea] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('Action / Hành động');
  const [extraRequirement, setExtraRequirement] = useState('');
  const [generatedIdeas, setGeneratedIdeas] = useState<RandomIdea[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const genres = [
    'Action / Hành động',
    'Adventure / Phiêu lưu',
    'Comedy / Hài hước',
    'Dark Comedy / Hài đen',
    'Drama / Chính kịch',
    'Horror / Kinh dị',
    'Sci-Fi / Khoa học viễn tưởng',
    'Cyberpunk',
    'Post-Apocalyptic / Hậu tận thế',
    'Romance / Lãng mạn',
    'Thriller / Giật gân',
    'Mystery / Bí ẩn - Trinh thám',
    'Psychological / Tâm lý',
    'Crime / Tội phạm',
    'Fantasy / Kỳ ảo',
    'Historical / Lịch sử - Cổ trang',
    'Family / Gia đình',
    'Musical / Âm nhạc',
    'Slice of Life / Đời thường'
  ];

  const predefinedRequirements = [
    'Twist chồng Twist',
    'Kết thúc mở',
    'Không có plot armor',
    'Tâm lý học tội phạm',
    'Hài đen (Dark Comedy)'
  ];

  // Step 1 data
  const [idea, setIdea] = useState('');
  const [duration, setDuration] = useState(15);
  const [scriptLanguage, setScriptLanguage] = useState('Tiếng Việt');
  const [dialogueLanguageType, setDialogueLanguageType] = useState('Tiếng Việt');
  const [dialogueLanguageOther, setDialogueLanguageOther] = useState('');

  // Step 2 data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [showNoteFor, setShowNoteFor] = useState<number | null>(null);
  const [regeneratingQuestionIndex, setRegeneratingQuestionIndex] = useState<number | null>(null);
  const [customAnswerSelected, setCustomAnswerSelected] = useState<boolean[]>([]);

  // Step 3 data
  const [directions, setDirections] = useState<string[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<string>('');
  const [regeneratingDirections, setRegeneratingDirections] = useState(false);

  // Step 3.5 data (Story Styles)
  const [openingStyles, setOpeningStyles] = useState<StyleOption[]>([]);
  const [selectedOpeningStyle, setSelectedOpeningStyle] = useState<string>('');
  const [endingStyles, setEndingStyles] = useState<StyleOption[]>([]);
  const [selectedEndingStyle, setSelectedEndingStyle] = useState<string>('');
  const [messageStyles, setMessageStyles] = useState<StyleOption[]>([]);
  const [selectedMessageStyle, setSelectedMessageStyle] = useState<string>('');
  
  // Step 4 data
  const [characters, setCharacters] = useState<Character[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [previousCharacters, setPreviousCharacters] = useState<Character[] | null>(null);
  const [previousActs, setPreviousActs] = useState<Act[] | null>(null);
  const [regeneratingActs, setRegeneratingActs] = useState(false);
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingActData, setEditingActData] = useState<Act | null>(null);
  const [aiNoteTarget, setAiNoteTarget] = useState<{ type: 'act' | 'event', actId: string, eventId?: string } | null>(null);
  const [aiNoteContent, setAiNoteContent] = useState('');
  const [isAiRegenerating, setIsAiRegenerating] = useState(false);
  const [isEditingCharacters, setIsEditingCharacters] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);

  // Step 5 data
  const [projectName, setProjectName] = useState('');

  const loadingProgress = useFakeProgress(loading, 15000);
  const generatingIdeasProgress = useFakeProgress(generatingIdeas, 10000);
  const regeneratingDirectionsProgress = useFakeProgress(regeneratingDirections, 10000);
  const regeneratingActsProgress = useFakeProgress(regeneratingActs, 15000);
  const aiRegeneratingProgress = useFakeProgress(isAiRegenerating, 15000);

  useEffect(() => {
    if (prefilledIdea) {
      setHasIdea(true);
      setIdea(`${prefilledIdea.title} - Kể về: ${prefilledIdea.synopsis} - Kết cục/Cú twist/Sự thật là: ${prefilledIdea.twist} - Tình tiết/Chi tiết đắt giá: ${prefilledIdea.details} - Bài học rút ra: ${prefilledIdea.lesson}`);
      setSelectedGenre(prefilledIdea.genre);
      onClearPrefilled();
    }
  }, [prefilledIdea, onClearPrefilled]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || duration <= 0) return;
    if (dialogueLanguageType === 'Khác' && !dialogueLanguageOther.trim()) {
      alert('Vui lòng nhập ngôn ngữ thoại.');
      return;
    }

    if (questions.length > 0) {
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const q = await generateQuestions(idea, duration, selectedGenre);
      setQuestions(q);
      setAnswers(new Array(q.length).fill(''));
      setNotes(new Array(q.length).fill(''));
      setCustomAnswerSelected(new Array(q.length).fill(false));
      setStep(2);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo câu hỏi. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQuestions = async () => {
    if (!idea.trim() || duration <= 0) return;
    setLoading(true);
    try {
      const q = await generateQuestions(idea, duration, selectedGenre);
      setQuestions(q);
      setAnswers(new Array(q.length).fill(''));
      setNotes(new Array(q.length).fill(''));
      setCustomAnswerSelected(new Array(q.length).fill(false));
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo lại câu hỏi. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setGeneratingIdeas(true);
    try {
      const genreDisliked = dislikedIdeas.filter(d => d.genre === selectedGenre);
      const ideas = await generateRandomIdeas(selectedGenre, duration, extraRequirement, genreDisliked);
      setGeneratedIdeas(ideas);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo ý tưởng. ' + formatApiError(err));
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleGenerateVariations = async (baseIdeaText: string) => {
    if (!baseIdeaText.trim()) return;
    setGeneratingIdeas(true);
    try {
      const genreDisliked = dislikedIdeas.filter(d => d.genre === selectedGenre);
      const ideas = await generateRandomIdeas(selectedGenre, duration, extraRequirement, genreDisliked, baseIdeaText);
      setGeneratedIdeas(ideas);
      setHasIdea(false); // Switch to the view showing generated ideas
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo biến thể ý tưởng. ' + formatApiError(err));
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleDislike = (e: React.MouseEvent, idea: RandomIdea) => {
    e.stopPropagation();
    onDislikeIdea({ ...idea, genre: selectedGenre });
    // If it was liked, remove the like
    if (likedIdeas.some(i => i.title === idea.title)) {
      onLikeIdea({ ...idea, id: '', genre: selectedGenre, createdAt: 0 });
    }
  };

  const handleLike = (e: React.MouseEvent, idea: RandomIdea) => {
    e.stopPropagation();
    onLikeIdea({ ...idea, id: `liked-${Date.now()}`, genre: selectedGenre, createdAt: Date.now() });
    // If it was disliked, remove the dislike
    if (dislikedIdeas.some(i => i.title === idea.title)) {
      onDislikeIdea({ ...idea, genre: selectedGenre });
    }
  };

  const handleRegenerateOptions = async (index: number) => {
    setRegeneratingQuestionIndex(index);
    try {
      const q = questions[index];
      const newOptions = await regenerateQuestionOptions(idea, duration, selectedGenre, q.question, q.options);
      const newQuestions = [...questions];
      newQuestions[index] = { ...q, options: newOptions };
      setQuestions(newQuestions);
      
      // Clear the answer for this question if it was selected
      const newAnswers = [...answers];
      newAnswers[index] = '';
      setAnswers(newAnswers);
      
      const newCustomSelected = [...customAnswerSelected];
      newCustomSelected[index] = false;
      setCustomAnswerSelected(newCustomSelected);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo lại đáp án. ' + formatApiError(err));
    } finally {
      setRegeneratingQuestionIndex(null);
    }
  };

  const handleStep2Submit = async () => {
    if (answers.some((a) => !a)) {
      alert('Vui lòng trả lời tất cả các câu hỏi.');
      return;
    }

    if (directions.length > 0) {
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      const d = await generateDirections(idea, duration, answers, notes);
      setDirections(d);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo hướng đi. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateDirections = async () => {
    setRegeneratingDirections(true);
    try {
      const newDirections = await regenerateDirections(idea, duration, answers, notes, directions);
      setDirections(newDirections);
      setSelectedDirection(''); // Clear selected direction
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo lại hướng đi. ' + formatApiError(err));
    } finally {
      setRegeneratingDirections(false);
    }
  };

  const handleStep3Submit = async () => {
    if (!selectedDirection) {
      alert('Vui lòng chọn một hướng đi.');
      return;
    }

    if (openingStyles.length > 0) {
      setStep(4);
      return;
    }

    setLoading(true);
    try {
      const styles = await generateStoryStyles(idea, duration, answers, notes, selectedDirection);
      setOpeningStyles(styles.openingStyles || []);
      setEndingStyles(styles.endingStyles || []);
      setMessageStyles(styles.messageStyles || []);
      setStep(4);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo phong cách kể chuyện. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateStyles = async () => {
    if (!selectedDirection) return;
    setLoading(true);
    try {
      const styles = await generateStoryStyles(idea, duration, answers, notes, selectedDirection);
      setOpeningStyles(styles.openingStyles || []);
      setEndingStyles(styles.endingStyles || []);
      setMessageStyles(styles.messageStyles || []);
      setSelectedOpeningStyle('');
      setSelectedEndingStyle('');
      setSelectedMessageStyle('');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo lại phong cách kể chuyện. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStep4Submit = async () => {
    if (!selectedOpeningStyle || !selectedEndingStyle || !selectedMessageStyle) {
      alert('Vui lòng chọn đầy đủ hướng mở đầu, kết thúc và cách truyền tải thông điệp.');
      return;
    }

    if (acts.length > 0) {
      setStep(5);
      return;
    }

    setLoading(true);
    try {
      const result = await generateActs(idea, duration, answers, notes, selectedDirection, selectedOpeningStyle, selectedEndingStyle, selectedMessageStyle);
      
      // Add IDs to characters
      const processedCharacters = result.characters.map((char: any, i: number) => ({
        ...char,
        id: `char-${Date.now()}-${i}`,
      }));
      setCharacters(processedCharacters);

      // Add IDs to acts and events
      const processedActs = result.acts.map((act: any, i: number) => ({
        ...act,
        id: `act-${Date.now()}-${i}`,
        events: act.events.map((ev: any, j: number) => ({
          ...ev,
          id: `event-${Date.now()}-${i}-${j}`,
          scriptVersions: [],
          currentVersionIndex: -1,
        })),
      }));
      setActs(processedActs);
      setPreviousCharacters(null);
      setPreviousActs(null);
      setStep(5);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi phân chia hồi. ' + formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateActs = async () => {
    setRegeneratingActs(true);
    try {
      // Save current state for undo
      setPreviousCharacters(characters);
      setPreviousActs(acts);

      const result = await regenerateActs(idea, duration, answers, notes, selectedDirection, selectedOpeningStyle, selectedEndingStyle, selectedMessageStyle, characters, acts);
      
      // Add IDs to characters
      const processedCharacters = result.characters.map((char: any, i: number) => ({
        ...char,
        id: `char-${Date.now()}-${i}`,
      }));
      setCharacters(processedCharacters);

      // Add IDs to acts and events
      const processedActs = result.acts.map((act: any, i: number) => ({
        ...act,
        id: `act-${Date.now()}-${i}`,
        events: act.events.map((ev: any, j: number) => ({
          ...ev,
          id: `event-${Date.now()}-${i}-${j}`,
          scriptVersions: [],
          currentVersionIndex: -1,
        })),
      }));
      setActs(processedActs);
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo lại hồi. ' + formatApiError(err));
    } finally {
      setRegeneratingActs(false);
    }
  };

  const handleAiRegenerate = async () => {
    if (!aiNoteTarget || !aiNoteContent.trim()) return;
    setIsAiRegenerating(true);
    
    try {
      // Save current state for undo
      setPreviousCharacters(characters);
      setPreviousActs(acts);

      if (aiNoteTarget.type === 'act') {
        const result = await regenerateActWithNote(
          idea, duration, answers, notes, selectedDirection,
          selectedOpeningStyle, selectedEndingStyle, selectedMessageStyle,
          characters, acts, aiNoteTarget.actId, aiNoteContent
        );
        
        const newActs = acts.map(act => {
          if (act.id === aiNoteTarget.actId) {
            return {
              ...act,
              title: result.title,
              summary: result.summary,
              events: result.events.map((ev: any, j: number) => ({
                ...ev,
                id: `event-${Date.now()}-${j}`,
                scriptVersions: [],
                currentVersionIndex: -1,
              })),
            };
          }
          return act;
        });
        setActs(newActs);
      } else if (aiNoteTarget.type === 'event' && aiNoteTarget.eventId) {
        const result = await regenerateEventWithNote(
          idea, duration, answers, notes, selectedDirection,
          selectedOpeningStyle, selectedEndingStyle, selectedMessageStyle,
          characters, acts, aiNoteTarget.actId, aiNoteTarget.eventId, aiNoteContent
        );
        
        const newActs = acts.map(act => {
          if (act.id === aiNoteTarget.actId) {
            return {
              ...act,
              events: act.events.map(ev => {
                if (ev.id === aiNoteTarget.eventId) {
                  return {
                    ...ev,
                    description: result.description,
                    duration: result.duration,
                  };
                }
                return ev;
              })
            };
          }
          return act;
        });
        setActs(newActs);
      }
      
      setAiNoteTarget(null);
      setAiNoteContent('');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi tạo lại. ' + formatApiError(err));
    } finally {
      setIsAiRegenerating(false);
    }
  };

  const handleUndoActs = () => {
    if (previousCharacters && previousActs) {
      setCharacters(previousCharacters);
      setActs(previousActs);
      setPreviousCharacters(null);
      setPreviousActs(null);
    }
  };

  const handleSaveCharacters = (updatedCharacters: Character[]) => {
    setCharacters(updatedCharacters);
    setIsEditingCharacters(false);
  };

  const handleStep5Submit = () => {
    setStep(6);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = () => {
    if (!projectName.trim()) {
      alert('Vui lòng nhập tên dự án.');
      return;
    }
    const project: Project = {
      id: `proj-${Date.now()}`,
      title: projectName,
      idea,
      duration,
      scriptLanguage,
      dialogueLanguage: dialogueLanguageType === 'Khác' ? dialogueLanguageOther : dialogueLanguageType,
      direction: selectedDirection,
      openingStyle: selectedOpeningStyle,
      endingStyle: selectedEndingStyle,
      messageStyle: selectedMessageStyle,
      characters,
      acts,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveProject(project);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-theme-btn-sec -translate-y-1/2 rounded-full"></div>
        <div
          className="absolute top-1/2 left-0 h-1 bg-theme-accent -translate-y-1/2 rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / 5) * 100}%` }}
        ></div>
        <div className="relative flex justify-between">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s <= step ? 'bg-theme-accent text-theme-accent-text shadow-lg shadow-theme-accent/30' : 'bg-theme-btn-sec text-theme-text-muted'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-theme-card/50 backdrop-blur-xl border border-theme-border rounded-3xl p-8 shadow-2xl"
      >
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <h2 className="text-2xl font-bold text-theme-text mb-6 flex items-center justify-between">
              <span>Bước 1: Ý tưởng kịch bản</span>
              <button
                type="button"
                onClick={() => setHasIdea(!hasIdea)}
                className="text-sm font-medium text-theme-accent hover:text-theme-accent/80 flex items-center gap-1 bg-theme-btn-sec px-3 py-1.5 rounded-full transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {hasIdea ? 'Tôi chưa có ý tưởng' : 'Tôi đã có ý tưởng'}
              </button>
            </h2>

            <div>
              <label className="block text-sm font-medium text-theme-accent mb-2">Thể loại chính (Genre)</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-theme-input border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all appearance-none"
              >
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {hasIdea ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-accent mb-2">Ý tưởng của bạn (Idea)</label>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    className="w-full h-32 bg-theme-input border border-theme-border rounded-xl p-4 text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-accent focus:border-transparent transition-all"
                    placeholder="Một nhóm bạn trẻ phát hiện ra một cỗ máy thời gian..."
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateVariations(idea)}
                  disabled={generatingIdeas || !idea.trim()}
                  className="w-full py-3 bg-theme-accent/20 hover:bg-theme-accent/30 text-theme-accent border border-theme-accent/30 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {generatingIdeas ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  {generatingIdeas ? `Đang tạo... ${generatingIdeasProgress}%` : 'Random 10 biến thể từ ý tưởng này'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-theme-accent mb-2">Yêu cầu thêm (Tùy chọn)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {predefinedRequirements.map(req => (
                        <button
                          key={req}
                          type="button"
                          onClick={() => {
                            if (extraRequirement.includes(req)) {
                              setExtraRequirement(extraRequirement.replace(req, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim());
                            } else {
                              setExtraRequirement(extraRequirement ? `${extraRequirement}, ${req}` : req);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                            extraRequirement.includes(req)
                              ? 'bg-theme-accent/20 border-theme-accent text-theme-accent'
                              : 'bg-theme-card border-theme-border text-theme-text-muted hover:bg-theme-btn-sec hover:text-theme-accent'
                          }`}
                        >
                          {req}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={extraRequirement}
                      onChange={(e) => setExtraRequirement(e.target.value)}
                      placeholder="Nhập yêu cầu khác (VD: Bối cảnh Cyberpunk, Nhân vật chính bị mù...)"
                      className="w-full bg-theme-input border border-theme-border rounded-xl p-4 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateIdeas}
                    disabled={generatingIdeas}
                    className="px-6 h-[60px] bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0"
                  >
                    {generatingIdeas ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    {generatingIdeas ? `Đang tạo... ${generatingIdeasProgress}%` : 'Random'}
                  </button>
                </div>
                
                {generatedIdeas.length > 0 && (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {generatedIdeas.map((genIdea, idx) => {
                      const isLiked = likedIdeas.some(i => i.title === genIdea.title);
                      const isDisliked = dislikedIdeas.some(i => i.title === genIdea.title);
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => setIdea(`${genIdea.title} - Kể về: ${genIdea.synopsis} - Kết cục/Cú twist/Sự thật là: ${genIdea.twist} - Tình tiết/Chi tiết đắt giá: ${genIdea.details} - Bài học rút ra: ${genIdea.lesson}${genIdea.format ? ` - Hình thức: ${genIdea.format}` : ''}`)}
                          className={`group relative p-4 rounded-xl border cursor-pointer transition-all text-sm leading-relaxed ${
                            idea.includes(genIdea.title)
                              ? 'bg-theme-accent/20 border-theme-accent text-theme-text'
                              : isDisliked
                                ? 'bg-red-950/10 border-red-900/30 text-theme-text-muted/50 hover:bg-red-900/20'
                                : 'bg-theme-card border-theme-border text-theme-text hover:bg-theme-btn-sec'
                          }`}
                        >
                          <div className={`absolute top-4 right-4 flex gap-2 transition-all ${isLiked || isDisliked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateVariations(`${genIdea.title} - Kể về: ${genIdea.synopsis} - Kết cục/Cú twist/Sự thật là: ${genIdea.twist} - Tình tiết/Chi tiết đắt giá: ${genIdea.details} - Bài học rút ra: ${genIdea.lesson}${genIdea.format ? ` - Hình thức: ${genIdea.format}` : ''}`);
                              }}
                              className="p-2 rounded-lg bg-theme-accent/10 text-theme-accent hover:bg-theme-accent/20 transition-all"
                              title="Random 10 phiên bản tương tự"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleLike(e, genIdea)}
                              className={`p-2 rounded-lg transition-all ${
                                isLiked 
                                  ? 'bg-theme-accent text-theme-accent-text shadow-lg shadow-theme-accent/20' 
                                  : 'bg-theme-accent/10 text-theme-accent hover:bg-theme-accent/20'
                              }`}
                              title={isLiked ? "Bỏ lưu ý tưởng" : "Lưu vào Kho ý tưởng"}
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDislike(e, genIdea)}
                              className={`p-2 rounded-lg transition-all ${
                                isDisliked 
                                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              }`}
                              title={isDisliked ? "Bỏ không thích" : "Không thích ý tưởng này"}
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                          <h4 className={`font-bold text-base mb-1 pr-20 ${isDisliked ? 'text-theme-text-muted/50 line-through' : 'text-theme-accent'}`}>
                            {genIdea.title}
                          </h4>
                          {genIdea.format && (
                            <div className="inline-block px-2 py-1 bg-theme-btn-sec text-theme-accent text-xs rounded border border-theme-border mb-2">
                              {genIdea.format}
                            </div>
                          )}
                          <p className="mb-2"><span className={`font-semibold ${isDisliked ? 'text-theme-accent/50' : 'text-theme-accent'}`}>Kể về:</span> {genIdea.synopsis}</p>
                          <p className="mb-2"><span className={`font-semibold ${isDisliked ? 'text-theme-accent/50' : 'text-theme-accent'}`}>Kết cục/Cú twist/Sự thật là:</span> {genIdea.twist}</p>
                          <p className="mb-2"><span className={`font-semibold ${isDisliked ? 'text-theme-accent/50' : 'text-theme-accent'}`}>Tình tiết/Chi tiết đắt giá:</span> {genIdea.details}</p>
                          <p><span className={`font-semibold ${isDisliked ? 'text-theme-accent/50' : 'text-theme-accent'}`}>Bài học rút ra:</span> {genIdea.lesson}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-theme-accent mb-2">Độ dài (phút)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="1"
                className="w-full bg-theme-input border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-accent mb-2">Ngôn ngữ kịch bản</label>
                <select
                  value={scriptLanguage}
                  onChange={(e) => setScriptLanguage(e.target.value)}
                  className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all appearance-none"
                >
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="Tiếng Anh">Tiếng Anh (Song ngữ)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-accent mb-2">Ngôn ngữ thoại</label>
                <div className="flex gap-2">
                  <select
                    value={dialogueLanguageType}
                    onChange={(e) => setDialogueLanguageType(e.target.value)}
                    className="flex-1 bg-theme-input border border-theme-border rounded-xl p-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all appearance-none"
                  >
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Khác">Khác</option>
                  </select>
                  {dialogueLanguageType === 'Khác' && (
                    <input
                      type="text"
                      value={dialogueLanguageOther}
                      onChange={(e) => setDialogueLanguageOther(e.target.value)}
                      placeholder="Nhập..."
                      className="w-24 bg-theme-input border border-theme-border rounded-xl p-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all"
                      required
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-theme-text-muted mt-[-8px]">
              Lời thoại sẽ luôn được giữ nguyên gốc tiếng bạn chọn dù ngôn ngữ kịch bản là gì.
            </p>

            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className="w-full py-4 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? `Đang xử lý... ${loadingProgress}%` : 'Tiếp tục'}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="bg-theme-card border border-theme-border rounded-2xl p-4 mb-6">
              <h4 className="text-theme-accent font-medium mb-2 text-sm">Thông tin đã chọn:</h4>
              <p className="text-theme-text text-sm line-clamp-2"><span className="text-theme-accent/70">Ý tưởng:</span> {idea}</p>
              <p className="text-theme-text text-sm"><span className="text-theme-accent/70">Độ dài:</span> {duration} phút | <span className="text-theme-accent/70">Kịch bản:</span> {scriptLanguage} | <span className="text-theme-accent/70">Thoại:</span> {dialogueLanguageType === 'Khác' ? dialogueLanguageOther : dialogueLanguageType}</p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-theme-text">Bước 2: Trả lời câu hỏi</h2>
              <button
                type="button"
                onClick={handleRegenerateQuestions}
                disabled={loading}
                className="text-sm font-medium text-theme-accent hover:text-theme-accent/80 flex items-center gap-1.5 bg-theme-btn-sec px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Tạo lại toàn bộ câu hỏi
              </button>
            </div>
            <p className="text-theme-text-muted">Để kịch bản chi tiết hơn, vui lòng trả lời các câu hỏi sau:</p>
            {questions.map((q, i) => (
              <div key={i} className="space-y-4 bg-theme-card p-6 rounded-2xl border border-theme-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="font-medium text-theme-text text-lg flex-1"><BilingualText text={q.question} /></div>
                  <button
                    onClick={() => setShowNoteFor(showNoteFor === i ? null : i)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      notes[i] || showNoteFor === i
                        ? 'bg-theme-accent/20 text-theme-accent border border-theme-accent/30'
                        : 'bg-theme-btn-sec text-theme-text-muted hover:bg-theme-btn-sec/80 hover:text-theme-accent'
                    }`}
                  >
                    <PenLine className="w-4 h-4" />
                    Take note
                  </button>
                </div>
                
                {showNoteFor === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={notes[i]}
                      onChange={(e) => {
                        const newNotes = [...notes];
                        newNotes[i] = e.target.value;
                        setNotes(newNotes);
                      }}
                      placeholder="Ghi chú thêm yêu cầu của bạn cho câu hỏi này..."
                      className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-accent transition-all"
                      rows={2}
                    />
                  </motion.div>
                )}

                <div className="space-y-2 mt-4">
                  {[...q.options, 'Không có phần này trong kịch bản / This part is not in the script'].map((opt, j) => (
                    <label
                      key={j}
                      className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                        answers[i] === opt && !customAnswerSelected[i]
                          ? 'bg-theme-accent/20 border-theme-accent text-theme-text'
                          : 'bg-theme-card border-theme-border text-theme-text-muted hover:bg-theme-btn-sec'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${i}`}
                        value={opt}
                        checked={answers[i] === opt && !customAnswerSelected[i]}
                        onChange={() => {
                          const newAnswers = [...answers];
                          newAnswers[i] = opt;
                          setAnswers(newAnswers);
                          
                          const newCustomSelected = [...customAnswerSelected];
                          newCustomSelected[i] = false;
                          setCustomAnswerSelected(newCustomSelected);
                        }}
                        className="hidden"
                      />
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 shrink-0 mt-0.5 ${
                        answers[i] === opt && !customAnswerSelected[i] ? 'border-theme-accent' : 'border-theme-border'
                      }`}>
                        {answers[i] === opt && !customAnswerSelected[i] && <div className="w-2.5 h-2.5 bg-theme-accent rounded-full" />}
                      </div>
                      <div className="flex-1 leading-relaxed"><BilingualText text={opt} /></div>
                    </label>
                  ))}

                  {/* Custom Answer Option */}
                  <label
                    className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                      customAnswerSelected[i]
                        ? 'bg-theme-accent/20 border-theme-accent text-theme-text'
                        : 'bg-theme-card border-theme-border text-theme-text-muted hover:bg-theme-btn-sec'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${i}-custom`}
                      checked={customAnswerSelected[i]}
                      onChange={() => {
                        const newCustomSelected = [...customAnswerSelected];
                        newCustomSelected[i] = true;
                        setCustomAnswerSelected(newCustomSelected);
                        
                        // Clear the answer so they have to type something
                        const newAnswers = [...answers];
                        newAnswers[i] = '';
                        setAnswers(newAnswers);
                      }}
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 shrink-0 mt-0.5 ${
                      customAnswerSelected[i] ? 'border-theme-accent' : 'border-theme-border'
                    }`}>
                      {customAnswerSelected[i] && <div className="w-2.5 h-2.5 bg-theme-accent rounded-full" />}
                    </div>
                    <div className="flex-1 leading-relaxed"><BilingualText text="Đáp án khác | Other" /></div>
                  </label>

                  {customAnswerSelected[i] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="overflow-hidden mt-2"
                    >
                      <input
                        type="text"
                        value={answers[i]}
                        onChange={(e) => {
                          const newAnswers = [...answers];
                          newAnswers[i] = e.target.value;
                          setAnswers(newAnswers);
                        }}
                        placeholder="Nhập đáp án của bạn..."
                        className="w-full bg-theme-input border border-theme-border rounded-xl p-4 text-sm text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-accent transition-all"
                        autoFocus
                      />
                    </motion.div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRegenerateOptions(i)}
                    disabled={regeneratingQuestionIndex === i}
                    className="text-sm font-medium text-theme-accent hover:text-theme-accent/80 flex items-center gap-1.5 bg-theme-btn-sec px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {regeneratingQuestionIndex === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Random lại các đáp án khác
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={handleBack}
                className="w-[30%] py-4 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-text-muted hover:text-theme-accent border border-theme-border rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Quay lại
              </button>
              <button
                onClick={handleStep2Submit}
                disabled={loading}
                className="w-[70%] py-4 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? `Đang phân tích... ${loadingProgress}%` : 'Phân tích hướng đi'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="bg-theme-card border border-theme-border rounded-2xl p-4 mb-6">
              <h4 className="text-theme-accent font-medium mb-2 text-sm">Thông tin đã chọn:</h4>
              <p className="text-theme-text text-sm line-clamp-1"><span className="text-theme-accent/70">Ý tưởng:</span> {idea}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Đã trả lời:</span> {answers.filter(a => a).length}/{questions.length} câu hỏi</p>
            </div>

            <h2 className="text-2xl font-bold text-theme-text mb-6">Bước 3: Chọn hướng đi</h2>
            <div className="space-y-4">
              {[...directions, 'Tuân theo kịch bản người dùng nhập hoặc chọn ở bước 1 | Follow the idea entered or selected in step 1'].map((dir, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedDirection(dir)}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                    selectedDirection === dir
                      ? 'bg-theme-accent/20 border-theme-accent shadow-lg shadow-theme-accent/10'
                      : 'bg-theme-card border-theme-border hover:bg-theme-btn-sec'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 shrink-0 ${selectedDirection === dir ? 'text-theme-accent' : 'text-theme-border'}`}>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-theme-text leading-relaxed"><BilingualText text={dir} /></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleRegenerateDirections}
                disabled={regeneratingDirections}
                className="text-sm font-medium text-theme-accent hover:text-theme-accent/80 flex items-center gap-1.5 bg-theme-btn-sec px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {regeneratingDirections ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {regeneratingDirections ? `Đang tạo lại... ${regeneratingDirectionsProgress}%` : 'Random lại các hướng đi khác'}
              </button>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={handleBack}
                className="w-[30%] py-4 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-text-muted hover:text-theme-accent border border-theme-border rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Quay lại
              </button>
              <button
                onClick={handleStep3Submit}
                disabled={loading || !selectedDirection}
                className="w-[70%] py-4 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? `Đang xử lý... ${loadingProgress}%` : 'Chọn hướng mở đầu'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <div className="bg-theme-card border border-theme-border rounded-2xl p-4 mb-6">
              <h4 className="text-theme-accent font-medium mb-2 text-sm">Thông tin đã chọn:</h4>
              <p className="text-theme-text text-sm line-clamp-1"><span className="text-theme-accent/70">Ý tưởng:</span> {idea}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Hướng đi:</span> {selectedDirection}</p>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-theme-text">Bước 4: Chọn phong cách kể chuyện</h2>
              <button
                type="button"
                onClick={handleRegenerateStyles}
                disabled={loading}
                className="text-sm font-medium text-theme-accent hover:text-theme-accent/80 flex items-center gap-1.5 bg-theme-btn-sec px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Tạo lại các phong cách
              </button>
            </div>
            
            <div className="space-y-8">
              {/* Opening Styles */}
              <div>
                <h3 className="text-xl font-bold text-theme-accent mb-4">1. Hướng mở đầu (Opening Style)</h3>
                <div className="space-y-4">
                  {openingStyles.map((style, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedOpeningStyle(style.name)}
                      className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                        selectedOpeningStyle === style.name
                          ? 'bg-theme-accent/20 border-theme-accent shadow-lg shadow-theme-accent/10'
                          : 'bg-theme-card border-theme-border hover:bg-theme-btn-sec'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 shrink-0 ${selectedOpeningStyle === style.name ? 'text-theme-accent' : 'text-theme-border'}`}>
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-theme-accent"><BilingualText text={style.name} /></h3>
                            <span className="text-sm font-mono text-theme-accent/80 bg-theme-bg/50 px-2 py-1 rounded">Độ phù hợp: {style.suitabilityScore}%</span>
                          </div>
                          <div className="text-theme-text-muted text-sm mb-3"><BilingualText text={style.description} /></div>
                          <div className="text-theme-accent/70 text-sm italic border-l-2 border-theme-border pl-3"><BilingualText text={style.reasoning} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ending Styles */}
              <div>
                <h3 className="text-xl font-bold text-theme-accent mb-4">2. Hướng kết thúc (Ending Style)</h3>
                <div className="space-y-4">
                  {endingStyles.map((style, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedEndingStyle(style.name)}
                      className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                        selectedEndingStyle === style.name
                          ? 'bg-theme-accent/20 border-theme-accent shadow-lg shadow-theme-accent/10'
                          : 'bg-theme-card border-theme-border hover:bg-theme-btn-sec'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 shrink-0 ${selectedEndingStyle === style.name ? 'text-theme-accent' : 'text-theme-border'}`}>
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-theme-accent"><BilingualText text={style.name} /></h3>
                            <span className="text-sm font-mono text-theme-accent/80 bg-theme-bg/50 px-2 py-1 rounded">Độ phù hợp: {style.suitabilityScore}%</span>
                          </div>
                          <div className="text-theme-text-muted text-sm mb-3"><BilingualText text={style.description} /></div>
                          <div className="text-theme-accent/70 text-sm italic border-l-2 border-theme-border pl-3"><BilingualText text={style.reasoning} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Styles */}
              <div>
                <h3 className="text-xl font-bold text-theme-accent mb-4">3. Cách truyền tải thông điệp (Message Delivery)</h3>
                <div className="space-y-4">
                  {messageStyles.map((style, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedMessageStyle(style.name)}
                      className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                        selectedMessageStyle === style.name
                          ? 'bg-theme-accent/20 border-theme-accent shadow-lg shadow-theme-accent/10'
                          : 'bg-theme-card border-theme-border hover:bg-theme-btn-sec'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 shrink-0 ${selectedMessageStyle === style.name ? 'text-theme-accent' : 'text-theme-border'}`}>
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-theme-accent"><BilingualText text={style.name} /></h3>
                            <span className="text-sm font-mono text-theme-accent/80 bg-theme-bg/50 px-2 py-1 rounded">Độ phù hợp: {style.suitabilityScore}%</span>
                          </div>
                          <div className="text-theme-text-muted text-sm mb-3"><BilingualText text={style.description} /></div>
                          <div className="text-theme-accent/70 text-sm italic border-l-2 border-theme-border pl-3"><BilingualText text={style.reasoning} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={handleBack}
                className="w-[30%] py-4 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-text-muted hover:text-theme-accent border border-theme-border rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Quay lại
              </button>
              <button
                onClick={handleStep4Submit}
                disabled={loading || !selectedOpeningStyle || !selectedEndingStyle || !selectedMessageStyle}
                className="w-[70%] py-4 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? `Đang chia hồi... ${loadingProgress}%` : 'Chia hồi kịch bản'}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <div className="bg-theme-card border border-theme-border rounded-2xl p-4 mb-6">
              <h4 className="text-theme-accent font-medium mb-2 text-sm">Thông tin đã chọn:</h4>
              <p className="text-theme-text text-sm line-clamp-1"><span className="text-theme-accent/70">Ý tưởng:</span> {idea}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Hướng đi:</span> {selectedDirection}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Mở đầu:</span> {selectedOpeningStyle}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Kết thúc:</span> {selectedEndingStyle}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Thông điệp:</span> {selectedMessageStyle}</p>
            </div>

            <h2 className="text-2xl font-bold text-theme-text mb-6">Bước 5: Cấu trúc kịch bản</h2>
            <div className="space-y-6">
              {characters && characters.length > 0 && (
                <div className="bg-theme-card border border-theme-border rounded-2xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-theme-accent">Khắc họa nhân vật / Character Profiles</h3>
                    <button
                      onClick={() => {
                        setEditingCharacterId(null);
                        setIsEditingCharacters(true);
                      }}
                      className="px-4 py-2 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-accent rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Thêm nhân vật
                    </button>
                  </div>
                  <div className="space-y-4">
                    {characters.map((char, i) => (
                      <div key={i} className="bg-theme-bg/50 p-4 rounded-xl border border-theme-border relative group">
                        <button
                          onClick={() => {
                            setEditingCharacterId(char.id);
                            setIsEditingCharacters(true);
                          }}
                          className="absolute top-4 right-4 p-2 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-accent rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Chỉnh sửa nhân vật này"
                        >
                          <PenLine className="w-4 h-4" />
                        </button>
                        <h4 className="text-lg font-bold text-theme-accent mb-2 pr-10"><BilingualText text={char.name} /> <span className="text-theme-accent/70 text-sm font-normal">({char.age})</span></h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-theme-accent/70 mb-1">Vai trò / Role:</p>
                            <div className="text-theme-text"><BilingualText text={char.role} /></div>
                          </div>
                          <div>
                            <p className="text-theme-accent/70 mb-1">Tính cách / Personality:</p>
                            <div className="text-theme-text"><BilingualText text={char.personality} /></div>
                          </div>
                          <div>
                            <p className="text-theme-accent/70 mb-1">Mối quan hệ / Relationships:</p>
                            <div className="text-theme-text"><BilingualText text={char.relationships} /></div>
                          </div>
                          <div>
                            <p className="text-theme-accent/70 mb-1">Want & Need:</p>
                            <div className="text-theme-text mb-1"><span className="text-theme-accent">Want:</span> <BilingualText text={char.want} /></div>
                            <div className="text-theme-text"><span className="text-theme-accent">Need:</span> <BilingualText text={char.need} /></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {acts.map((act, i) => (
                <div key={i} className="bg-theme-card border border-theme-border rounded-2xl p-6">
                  {editingActId === act.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-theme-accent">Chỉnh sửa Hồi</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const newActs = acts.map(a => a.id === editingActId ? editingActData! : a);
                              setActs(newActs);
                              setEditingActId(null);
                              setEditingActData(null);
                            }}
                            className="px-3 py-1.5 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text text-sm font-medium rounded-lg transition-colors"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => {
                              setEditingActId(null);
                              setEditingActData(null);
                            }}
                            className="px-3 py-1.5 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-accent text-sm font-medium rounded-lg transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-theme-accent/70 mb-1">Tiêu đề (Title)</label>
                        <input
                          type="text"
                          value={editingActData?.title || ''}
                          onChange={(e) => setEditingActData(prev => prev ? { ...prev, title: e.target.value } : null)}
                          className="w-full bg-theme-input border border-theme-border rounded-lg p-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-theme-accent/70 mb-1">Tóm tắt (Summary)</label>
                        <textarea
                          value={editingActData?.summary || ''}
                          onChange={(e) => setEditingActData(prev => prev ? { ...prev, summary: e.target.value } : null)}
                          className="w-full bg-theme-input border border-theme-border rounded-lg p-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent min-h-[80px]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-theme-accent/70 mb-2">Sự kiện (Events)</label>
                        <div className="space-y-3">
                          {editingActData?.events.map((ev, j) => (
                            <div key={j} className="flex gap-3 items-start">
                              <textarea
                                value={ev.description}
                                onChange={(e) => {
                                  const newEvents = [...(editingActData?.events || [])];
                                  newEvents[j] = { ...newEvents[j], description: e.target.value };
                                  setEditingActData(prev => prev ? { ...prev, events: newEvents } : null);
                                }}
                                className="flex-1 bg-theme-input border border-theme-border rounded-lg p-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent min-h-[60px]"
                              />
                              <div className="w-20 shrink-0">
                                <input
                                  type="number"
                                  value={ev.duration}
                                  onChange={(e) => {
                                    const newEvents = [...(editingActData?.events || [])];
                                    newEvents[j] = { ...newEvents[j], duration: Number(e.target.value) };
                                    setEditingActData(prev => prev ? { ...prev, events: newEvents } : null);
                                  }}
                                  className="w-full bg-theme-input border border-theme-border rounded-lg p-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent"
                                />
                                <span className="text-xs text-theme-accent/50 block mt-1 text-center">phút</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-theme-accent"><BilingualText text={act.title} /></h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setAiNoteTarget({ type: 'act', actId: act.id });
                              setAiNoteContent('');
                            }}
                            className="p-1.5 text-theme-accent hover:text-theme-accent/80 hover:bg-theme-btn-sec rounded-lg transition-colors flex items-center gap-1.5"
                            title="Yêu cầu AI viết lại hồi này"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-medium">AI Note</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingActId(act.id);
                              setEditingActData(act);
                            }}
                            className="p-1.5 text-theme-accent hover:text-theme-accent/80 hover:bg-theme-btn-sec rounded-lg transition-colors"
                            title="Chỉnh sửa hồi này"
                          >
                            <PenLine className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {aiNoteTarget?.type === 'act' && aiNoteTarget.actId === act.id && (
                        <div className="mb-4 bg-theme-accent/10 border border-theme-accent/30 p-4 rounded-xl">
                          <label className="block text-sm font-medium text-theme-accent mb-2">Note cho AI để viết lại hồi này:</label>
                          <textarea
                            value={aiNoteContent}
                            onChange={(e) => setAiNoteContent(e.target.value)}
                            placeholder="Ví dụ: Thêm một cảnh hành động ở cuối hồi, làm cho nhân vật chính do dự hơn..."
                            className="w-full bg-theme-input border border-theme-border rounded-lg p-3 text-sm text-theme-text focus:outline-none focus:border-theme-accent min-h-[80px] mb-3"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setAiNoteTarget(null)}
                              className="px-3 py-1.5 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-accent text-sm font-medium rounded-lg transition-colors"
                              disabled={isAiRegenerating}
                            >
                              Hủy
                            </button>
                            <button
                              onClick={handleAiRegenerate}
                              disabled={isAiRegenerating || !aiNoteContent.trim()}
                              className="px-3 py-1.5 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isAiRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              {isAiRegenerating ? `Đang viết... ${aiRegeneratingProgress}%` : 'Viết lại'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="text-theme-text-muted mb-4 text-sm"><BilingualText text={act.summary} /></div>
                      <div className="space-y-2">
                        {act.events.map((ev, j) => (
                          <div key={j} className="flex flex-col bg-theme-bg/50 p-3 rounded-lg border border-theme-border">
                            <div className="flex items-start justify-between">
                              <div className="text-theme-text flex-1 pr-4"><BilingualText text={ev.description} /></div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="text-theme-accent font-mono text-sm bg-theme-bg/50 px-2 py-1 rounded">
                                  {ev.duration}p
                                </span>
                                <button
                                  onClick={() => {
                                    setAiNoteTarget({ type: 'event', actId: act.id, eventId: ev.id });
                                    setAiNoteContent('');
                                  }}
                                  className="text-theme-accent hover:text-theme-accent/80 transition-colors"
                                  title="Yêu cầu AI viết lại sự kiện này"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {aiNoteTarget?.type === 'event' && aiNoteTarget.eventId === ev.id && (
                              <div className="mt-3 pt-3 border-t border-theme-border">
                                <label className="block text-xs font-medium text-theme-accent mb-2">Note cho AI để viết lại sự kiện này:</label>
                                <textarea
                                  value={aiNoteContent}
                                  onChange={(e) => setAiNoteContent(e.target.value)}
                                  placeholder="Ví dụ: Đổi bối cảnh sang ban đêm, thêm chi tiết nhân vật bị thương..."
                                  className="w-full bg-theme-input border border-theme-border rounded-lg p-2.5 text-sm text-theme-text focus:outline-none focus:border-theme-accent min-h-[60px] mb-2"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setAiNoteTarget(null)}
                                    className="px-3 py-1.5 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-accent text-xs font-medium rounded-lg transition-colors"
                                    disabled={isAiRegenerating}
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    onClick={handleAiRegenerate}
                                    disabled={isAiRegenerating || !aiNoteContent.trim()}
                                    className="px-3 py-1.5 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {isAiRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    {isAiRegenerating ? `Đang viết... ${aiRegeneratingProgress}%` : 'Viết lại'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              {previousActs && (
                <button
                  type="button"
                  onClick={handleUndoActs}
                  disabled={regeneratingActs}
                  className="text-sm font-medium text-theme-accent hover:text-theme-accent/80 flex items-center gap-1.5 bg-theme-btn-sec px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Hoàn tác (Undo)
                </button>
              )}
              <button
                type="button"
                onClick={handleRegenerateActs}
                disabled={regeneratingActs}
                className="text-sm font-medium text-theme-accent hover:text-theme-accent/80 flex items-center gap-1.5 bg-theme-btn-sec px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {regeneratingActs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {regeneratingActs ? `Đang tạo lại... ${regeneratingActsProgress}%` : 'Random lại toàn bộ hồi'}
              </button>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={handleBack}
                disabled={regeneratingActs}
                className="w-[30%] py-4 bg-theme-btn-sec hover:bg-theme-btn-sec/80 text-theme-text-muted hover:text-theme-accent border border-theme-border rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <ArrowLeft className="w-5 h-5" />
                Quay lại
              </button>
              <button
                onClick={handleStep5Submit}
                disabled={regeneratingActs}
                className="w-[70%] py-4 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                Tiếp tục lưu dự án
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8">
            <div className="bg-theme-card border border-theme-border rounded-2xl p-4 mb-6">
              <h4 className="text-theme-accent font-medium mb-2 text-sm">Thông tin đã chọn:</h4>
              <p className="text-theme-text text-sm line-clamp-1"><span className="text-theme-accent/70">Ý tưởng:</span> {idea}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Hướng đi:</span> {selectedDirection}</p>
              <p className="text-theme-text text-sm mt-1 line-clamp-1"><span className="text-theme-accent/70">Mở đầu:</span> {selectedOpeningStyle}</p>
              <p className="text-theme-text text-sm mt-1"><span className="text-theme-accent/70">Cấu trúc:</span> {acts.length} hồi, {acts.reduce((acc, act) => acc + act.events.length, 0)} sự kiện</p>
            </div>

            <h2 className="text-2xl font-bold text-theme-text mb-6">Bước 6: Lưu dự án</h2>
            <div>
              <label className="block text-sm font-medium text-theme-text-muted mb-2">Tên phim / Dự án</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-theme-input border border-theme-border rounded-xl p-4 text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent transition-all"
                placeholder="Nhập tên phim..."
                required
              />
            </div>
            
            <div className="bg-theme-card border border-theme-border rounded-2xl p-6">
              <h4 className="text-theme-accent font-medium mb-4">Tổng quan</h4>
              <ul className="space-y-2 text-theme-text text-sm">
                <li><span className="text-theme-accent/70">Độ dài:</span> {duration} phút</li>
                <li><span className="text-theme-accent/70">Số hồi:</span> {acts.length} hồi</li>
                <li><span className="text-theme-accent/70">Số sự kiện:</span> {acts.reduce((acc, act) => acc + act.events.length, 0)} sự kiện</li>
              </ul>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-4 bg-theme-accent hover:bg-theme-accent/90 text-theme-accent-text rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-theme-accent/20"
            >
              <Save className="w-5 h-5" />
              Lưu dự án & Bắt đầu viết
            </button>
          </div>
        )}
      </motion.div>

      <CharacterEditorModal
        isOpen={isEditingCharacters}
        characters={characters}
        editingCharacterId={editingCharacterId}
        onClose={() => setIsEditingCharacters(false)}
        onSave={handleSaveCharacters}
      />
    </div>
  );
}
