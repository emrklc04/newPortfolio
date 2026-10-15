import { Project } from '../core/models/project.model';

export const PROJECTS: Project[] = [
  {
    id: 7,
    slug: 'smart-home-assistant',
    title: 'Smart Home Assistant',
    shortDescription:
      'Persönlicher KI-Sprachassistent zur Steuerung von Smart-Home-Geräten mit lokaler Spracherkennung, KI-gestützten Antworten, natürlicher Sprachausgabe und einer eigenen Desktop-Oberfläche.',
    fullDescription:
      'Der Smart Home Assistant ist eine Desktop-Anwendung, die Sprachbefehle entgegennimmt, lokal per Whisper in Text umwandelt und über ein Azure-AI-Foundry-Chat-Modell mit Function-Calling verarbeitet. Nutzer können per Sprache smarte Lampen einzeln oder zusammen schalten sowie ihre Helligkeit exakt oder relativ anpassen, während Antworten per Azure Speech Service vorgelesen und zusätzlich in einer Chat-Oberfläche angezeigt werden. Die Anwendung wurde mit Python entwickelt und steuert die Geräte lokal über das Tuya-Protokoll, ganz ohne Cloud-Abhängigkeit zur Laufzeit.',
    imageUrl: '/images/projects/smarthome/logo.png',
    screenshots: [
      '/images/projects/smarthome/screenshot-0.jpg',
      '/images/projects/smarthome/screenshot-1.jpg',
      '/images/projects/smarthome/screenshot-2.jpg',
    ],
    technologies: ['Python', 'Azure', 'OpenAI', 'Whisper', 'Custom Tkinter', 'Tuya'],
    githubUrl: 'https://github.com/emrklc04/smarthome',
    videoUrl: '/videos/projects/smarthome.mp4',
    featured: false,
  },
  {
    id: 6,
    slug: 'ci-cd-pipeline',
    title: 'CI/CD-Pipeline',
    shortDescription:
      'Eine automatisierte Build-, Test- und Deployment-Pipeline für eine Python-Webanwendung, die bei jedem Push vollautomatisch auf Azure App Service ausgerollt wird.',
    fullDescription:
      'Die Pipeline wurde mit GitHub Actions und Azure App Service umgesetzt und demonstriert einen vollständigen CI/CD-Workflow: Bei jedem Push wird der Code automatisch gelintet (Flake8) und getestet (Pytest), bevor ein Deployment überhaupt stattfindet. Nur wenn alle Prüfungen erfolgreich durchlaufen, wird die Anwendung automatisch auf Azure App Service deployed. Die Authentifizierung zwischen GitHub und Azure erfolgt über OpenID Connect (OIDC) mit Federated Credentials statt über klassische Secrets – es gibt also keine langlebigen Zugangsdaten, die ablaufen oder geleakt werden könnten. Die Demo-Anwendung selbst ist bewusst schlank gehalten (Flask-App mit Health-Check-Endpoint), da der Fokus auf der Pipeline-Architektur liegt, nicht auf der Anwendungslogik.',
    imageUrl: '/images/projects/ci-cd/logo.png',
    screenshots: [
      '/images/projects/ci-cd/screenshot-0.jpg',
      '/images/projects/ci-cd/screenshot-1.jpg',
      '/images/projects/ci-cd/screenshot-2.jpg',
    ],
    technologies: [
      'Python',
      'Flask',
      'GitHub Actions',
      'Azure App Service',
      'OIDC/Azure AD',
      'Pytest',
    ],
    githubUrl: 'https://github.com/emrklc04/azure-ci-cd',
    featured: false,
  },
  {
    id: 1,
    slug: 'tour-planner',
    title: 'Tour-Planner',
    shortDescription:
      'Moderne Tour-Planungsanwendung zur Erstellung, Verwaltung und Analyse von Reiserouten mit automatischer Routenberechnung, Kartenansicht und Tour-Logs.',
    fullDescription:
      'Der TourPlanner ist eine Full-Stack-Webanwendung zur Planung und Verwaltung von Touren mit automatischer Routenberechnung, Kartenansicht und Tour-Logs. Nutzer können Touren erstellen, bearbeiten und analysieren sowie Popularität und Kinderfreundlichkeit anhand der Tour-Logs berechnen lassen. Die Anwendung wurde mit Angular, Spring Boot und PostgreSQL entwickelt und nutzt externe APIs für Geocoding und Routenberechnung.',
    imageUrl: '/images/projects/tour-planner/logo.png',
    screenshots: [
      '/images/projects/tour-planner/screenshot-0.jpg',
      '/images/projects/tour-planner/screenshot-1.jpg',
      '/images/projects/tour-planner/screenshot-2.jpg',
      '/images/projects/tour-planner/screenshot-3.jpg',
      '/images/projects/tour-planner/pbi.jpg',
    ],
    technologies: ['Angular', 'TypeScript', 'Java', 'Spring Boot', 'Power BI'],
    githubUrl: 'https://github.com/emrklc04/SWEN_2_Group_8',
    videoUrl: '/videos/projects/tour-planner.mp4',
    featured: false,
  },
  {
    id: 5,
    slug: 'zahnarztpraxis',
    title: 'Zahnarztpraxis',
    shortDescription:
      'Eine moderne Website für eine Zahnarztpraxis mit KI-Chatbot, Online-Terminbuchung und Admin-Bereich zur Terminverwaltung.',
    fullDescription:
      'Die Zahnarztpraxis-Website wurde mit Angular und Spring Boot entwickelt und bietet Patient:innen eine öffentliche Terminbuchung mit Echtzeit-Verfügbarkeit: Freie Zeitslots werden anhand der Öffnungszeiten und bestehender Buchungen berechnet und lassen sich direkt online reservieren. Ein in die Seite integrierter KI-Chatbot (Azure AI Foundry) beantwortet Fragen zu Leistungen und Praxisinformationen. Im geschützten Admin-Bereich können Termine eingesehen und verwaltet werden, abgesichert durch Login und Rate-Limiting gegen Missbrauch.',
    imageUrl: '/images/projects/zp/logo.png',
    screenshots: [
      '/images/projects/zp/screenshot-0.jpg',
      '/images/projects/zp/screenshot-1.jpg',
      '/images/projects/zp/screenshot-2.jpg',
    ],
    technologies: ['Angular', 'Spring Boot', 'PostgreSQL', 'Flyway', 'Azure'],
    githubUrl: 'https://github.com/emrklc04/Zahnarztpraxis',
    videoUrl: '/videos/projects/zp.mp4',
    featured: false,
  },
  {
    id: 4,
    slug: 'media-rating-platform',
    title: 'Media-Rating-Platform',
    shortDescription:
      'Eine Webanwendung zur Bewertung und Verwaltung von Filmen, Serien und Spielen mit Community-Bewertungen, Leaderboard, Empfehlungen und Favoriten-Funktion.',
    fullDescription:
      'Die Media Rating Platform wurde mit Angular und Spring Boot entwickelt und ermöglicht es Nutzern, Medieneinträge wie Filme, Serien oder Spiele mit Titel, Beschreibung, Genre und Coverbild anzulegen und diese mit Sternebewertungen und Kommentaren zu bewerten. In der Übersicht lassen sich alle Medien durchsuchen, filtern, favorisieren und im Leaderboard vergleichen. Ein Empfehlungssystem schlägt passende Medien vor, während im Profilbereich die eigenen Bewertungen und Favoriten verwaltet werden.',
    imageUrl: '/images/projects/mrp/logo.svg',
    screenshots: [
      '/images/projects/mrp/screenshot-0.jpg',
      '/images/projects/mrp/screenshot-1.jpg',
      '/images/projects/mrp/screenshot-2.jpg',
      '/images/projects/mrp/screenshot-3.jpg',
    ],
    technologies: ['Angular', 'TypeScript', 'Java'],
    githubUrl: 'https://github.com/emrklc04/SWEN_Project',
    videoUrl: '/videos/projects/mrp.mp4',
    featured: false,
  },
  {
    id: 2,
    slug: 'qr-code-generator',
    title: 'QR-Code-Generator',
    shortDescription:
      'Eine moderne QR-Code-Generator-Anwendung zur Erstellung, Speicherung und Verwaltung verschiedener QR-Codes mit Favoriten-, Filter- und Suchfunktion.',
    fullDescription:
      'Der QR-Code Generator wurde mit Python und Flet entwickelt und ermöglicht das Erstellen unterschiedlicher QR-Code-Typen, zum Beispiel für Texte oder Telefonnummern. Generierte Codes können gespeichert, geteilt, als Favorit markiert und in Kategorien organisiert werden. In der Übersicht lassen sich alle gespeicherten QR-Codes durchsuchen, filtern, sortieren, anzeigen und löschen.',
    imageUrl: '/images/projects/qr-generator/logo.svg',
    screenshots: [
      '/images/projects/qr-generator/screenshot-0.jpg',
      '/images/projects/qr-generator/screenshot-1.jpg',
      '/images/projects/qr-generator/screenshot-2.jpg',
      '/images/projects/qr-generator/screenshot-3.jpg',
    ],
    technologies: ['Python', 'Flet', 'SQLite'],
    githubUrl: 'https://github.com/lukifi1/Flet',
    videoUrl: '/videos/projects/qr-generator.mp4',
    featured: true,
  },
];
