import { TimelineEntry } from '../core/models/timeline-entry.model';

export const EDUCATION: TimelineEntry[] = [
  {
    id: 'university',
    title: 'FH Technikum Wien',
    organization: 'Bachelorstudium Informatik',
    location: 'Wien',
    period: '2024 – laufend',
    description: [
      'Bachelorstudium Informatik mit Fokus auf Softwareentwicklung und moderne Webtechnologien.',
      'Arbeit mit Angular, Java, Spring Boot, Python, PostgreSQL und weiteren Technologien.',
      'Umsetzung von Teamprojekten von der Planung bis zur Präsentation.',
    ],
  },
  {
    id: 'technical-school',
    title: 'HTL – TGM Technisches Gewerbemuseum',
    organization: 'Technische Ausbildung',
    location: 'Wien',
    period: '2018 – 2023',
    description: [
      'Technische und praxisorientierte Ausbildung mit Schwerpunkt auf Informatik und Softwareentwicklung.',
      'Erste umfangreiche Erfahrungen mit Programmierung, Projektarbeit und technischen Grundlagen.',
    ],
  },
  {
    id: 'secondary-school',
    title: 'BRG – Erich Fried Realgymnasium',
    organization: 'Allgemeinbildende höhere Schule',
    location: 'Wien',
    period: '2014 – 2018',
    description: [
      'Besuch des Realgymnasiums mit allgemeinbildendem Schwerpunkt.',
      'Grundlegende schulische Ausbildung vor dem Wechsel an eine technische Schule.',
    ],
  },
];
