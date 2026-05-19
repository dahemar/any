export interface Credit {
  role: string;
  name: string;
}

export interface Scene {
  id: string;
  videoUrl: string;
  proxiedVideoUrl?: string;
  thumbnail?: string;
  duration?: number;
}

export interface Work {
  id: string;
  title: string;
  scenes: Scene[];
  credits?: Credit[];
  meta?: Record<string, string>;
  isMusic?: boolean;
}

export interface WorksStats {
  totalWorks: number;
  totalVideos: number;
}