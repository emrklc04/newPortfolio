import { Project } from '../models/project.model';
import { Skill } from '../models/skill.model';

export function matchSkillProjects(skill: Skill, projects: Project[]): Project[] {
  const skillTechnologies = skill.projectTechnologies.map((tech) => tech.trim().toLowerCase());

  return projects.filter((project) =>
    project.technologies.some((tech) => skillTechnologies.includes(tech.trim().toLowerCase())),
  );
}
