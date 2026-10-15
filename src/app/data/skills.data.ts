import { Skill } from '../core/models/skill.model';

const DEVICON_BASE = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons';

export const SKILLS: Skill[] = [
  {
    id: 1,
    name: 'Angular',
    iconUrl: `${DEVICON_BASE}/angularjs/angularjs-original.svg`,
    description: [
      'MVVM-Pattern-Oberfläche (Tour Planner)',
      'Eigene Komponenten für Touren- und Log-Verwaltung',
      'Validierte CRUD-Formulare',
      'Leaflet-Kartenansicht',
      'Anbindung an Spring-Boot-Backend via HttpClient',
      'Admin-Dashboard zur Verwaltung von Projekten & Skills (myportfolio)',
      'Wiederverwendbare ProjectCard-Komponente',
      'Auth-Interceptor für geschützte Admin-Anfragen',
    ],
    projectTechnologies: [
      'TypeScript',
      'Java',
      'Spring Boot',
      'PostgreSQL',
      'Hibernate/JPA',
      'Leaflet',
      'OpenRouteService API',
      'log4j',
      'JUnit',
    ],
  },
  {
    id: 2,
    name: 'Python',
    iconUrl: `${DEVICON_BASE}/python/python-original.svg`,
    description: [
      'QR-Code-Generator mit Python und Flet entwickelt',
      'Erstellung verschiedener QR-Code-Typen (Text/Telefonnummer u. a.)',
      'Speicherung der Codes in SQLite-Datenbank',
      'Favoriten-/Filter- und Kategorienverwaltung umgesetzt',
      'Such- und Sortierfunktion für gespeicherte QR-Codes implementiert',
    ],
    projectTechnologies: ['Python', 'Flet', 'SQLite'],
  },
  {
    id: 3,
    name: 'Java',
    iconUrl: `${DEVICON_BASE}/java/java-original.svg`,
    description: [
      'Backend für myportfolio mit Spring Boot entwickelt',
      'REST-APIs für Projekte, Skills und Authentifizierung umgesetzt',
      'Schichtenarchitektur mit Presentation-, Business- und Data-Access-Layer aufgebaut',
      'Persistenz über Hibernate/JPA mit PostgreSQL realisiert',
      'Tour-Planner-Backend inkl. OpenRouteService-Anbindung entwickelt',
      'Absicherung mit Spring Security und rollenbasierten Zugriffsrechten',
    ],
    projectTechnologies: ['Java', 'Spring Boot', 'Hibernate', 'PostgreSQL', 'Spring Security'],
  },
  {
    id: 4,
    name: 'Azure',
    iconUrl: `${DEVICON_BASE}/azure/azure-original.svg`,
    description: [
      'KI-Chatbot mit Azure AI Foundry integriert (Zahnarztpraxis) – beantwortet Patientenfragen zu Leistungen & Praxisinformationen',
      'Automatisiertes Deployment auf Azure App Service (CI/CD-Pipeline)',
      'Authentifizierung zwischen GitHub Actions und Azure via OpenID Connect (OIDC) mit Federated Credentials – keine langlebigen Secrets',
      'Vollautomatisierter CI/CD-Workflow: Linting (Flake8) & Tests (Pytest) als Deployment-Gate vor jedem Azure-Rollout',
      'Praxiserfahrung sowohl mit Azure AI Services (Chatbot-Anwendungsfall) als auch klassischem App-Hosting',
    ],
    projectTechnologies: [
      'Azure',
      'AI Foundry',
      'Azure App Service',
      'Azure OIDC / Federated Credentials',
    ],
  },
  {
    id: 5,
    name: 'Power BI',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/New_Power_BI_Logo.svg',
    description: [
      'KPI-Kacheln für Anzahl der Touren/Bewertungen/Gesamtdistanz erstellt',
      'Kreisdiagramm zur prozentualen Verteilung der Transportmittel (Auto/Fahrrad/zu Fuß)',
      'Balkendiagramm zum Vergleich der Tourenanzahl je Transportmittel',
      'Liniendiagramm zur Entwicklung der Gesamtdistanz nach Jahr',
      'Interaktive Filter zur Analyse der Tour-Log-Daten genutzt',
    ],
    projectTechnologies: ['Power BI'],
  },
];
