export interface Credit {
  role: string;
  name: string;
}

export interface Scene {
  id: string;
  videoUrl: string;
  proxiedVideoUrl?: string;
  thumbnail?: string;
  audioUrl?: string;
  duration?: number;
}

export interface WorksStats {
  totalWorks: number;
  totalVideos: number;
}

export interface Work {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  scenes: Scene[];
  credits?: Credit[];
  meta?: Record<string, string>;
  isMusic?: boolean;
}

export type SiteSection = 'anyways' | 'search' | 'contact';

export interface TagDefinition {
  id: string;
  label: string;
  category: 'mood' | 'instrument';
}
