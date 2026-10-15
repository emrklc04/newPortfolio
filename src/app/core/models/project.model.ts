export interface Project {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  screenshots: string[];
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  videoUrl?: string;
  featured: boolean;
}
