export interface Character {
  id: string;
  name: string;
  age: string;
  role: string;
  relationships: string;
  personality: string;
  want: string;
  need: string;
  style?: string;
}

export interface ScriptCharacter {
  id: string;
  name: string;
  relationship: string;
  description: string;
  isMain: boolean;
  promptData?: any;
}

export interface Project {
  id: string;
  title: string;
  idea: string;
  duration: number;
  scriptLanguage: string;
  dialogueLanguage: string;
  direction: string;
  openingStyle?: string;
  endingStyle?: string;
  messageStyle?: string;
  characters: Character[];
  scriptCharacters?: ScriptCharacter[];
  acts: Act[];
  createdAt: number;
  updatedAt: number;
  globalInstructions?: string[];
  globalStyleCategory?: string;
  globalStylePrompt?: string;
  isStyleConfirmed?: boolean;
}

export interface RandomIdea {
  title: string;
  synopsis: string;
  twist: string;
  details: string;
  lesson: string;
  format?: string;
}

export interface DislikedIdea extends RandomIdea {
  genre: string;
}

export interface LikedIdea extends RandomIdea {
  id: string;
  genre: string;
  createdAt: number;
}

export interface Act {
  id: string;
  title: string;
  summary: string;
  events: Event[];
}

export interface Event {
  id: string;
  description: string;
  duration: number;
  scriptVersions: ScriptVersion[];
  currentVersionIndex: number;
  isNew?: boolean;
  approvedPrompts?: string[];
}

export interface ScriptVersion {
  id: string;
  createdAt: number;
  content: ScriptElement[];
  prompt?: string;
}

export type ScriptElementType = 'scene_heading' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition';

export interface ScriptElement {
  type: ScriptElementType;
  text: string;
  locationData?: any;
}

export interface Question {
  question: string;
  options: string[];
}
