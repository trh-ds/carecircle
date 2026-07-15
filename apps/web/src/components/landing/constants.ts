import { MedsIcon, DocsIcon, TasksIcon } from './icons';

export const NAV_ITEMS = [
  { label: 'How it helps', href: '#problem' },
  { label: 'Features', href: '#features' },
  { label: 'Agents', href: '#agents' },
  { label: 'Open source', href: '#open' },
] as const;

export const PROBLEMS = [
  {
    icon: MedsIcon,
    color: 'accent-red' as const,
    title: 'Nobody knows if Dad took his meds.',
    body: 'Three siblings, three assumptions, zero shared view. A dose is missed, and nobody realizes until the next check-up — or worse.',
  },
  {
    icon: DocsIcon,
    color: 'accent-blue' as const,
    title: 'The lab report that mattered is buried.',
    body: 'Six weeks deep in a WhatsApp chat. The cardiologist asks for the last result, and you\'re scrolling through photos trying to find it.',
  },
  {
    icon: TasksIcon,
    color: 'accent-green' as const,
    title: 'One person carries the mental load.',
    body: 'Booking appointments, tracking symptoms, coordinating with the nurse. It all lands on one exhausted family member until they burn out.',
  },
] as const;

export const FEATURES = [
  { color: 'accent-blue' as const, label: 'Circle & roles', desc: 'Invite siblings as coordinators, the local nurse as a caregiver. Everyone sees what they need to.' },
  { color: 'accent-green' as const, label: 'Medication tracker', desc: 'Log every dose. Know who took what and when. Reminders so nothing slips.' },
  { color: 'accent-red' as const, label: 'Document locker', desc: 'Upload lab reports, prescriptions, discharge summaries. AI extracts the key data — no typing.' },
  { color: 'accent-blue' as const, label: 'Daily check-in', desc: 'A 30-second log from the caregiver or recipient. Pain levels, mood, anything worth noting.' },
  { color: 'accent-green' as const, label: 'Weekly digest', desc: 'Sunday morning, every family member gets a calm summary: adherence, upcoming items, things to flag.' },
  { color: 'accent-red' as const, label: 'Emergency SOS', desc: 'One tap alerts every circle member. Key info — allergies, meds, emergency contact — surfaced instantly.' },
] as const;

export const AGENTS = [
  { color: 'accent-blue' as const, title: 'Document Intelligence', desc: 'Reads every uploaded file. Extracts dates, values, doctor names. Structures what the document says — never interprets what it means.' },
  { color: 'accent-green' as const, title: 'Adherence & Trends', desc: 'Reviews logs on a schedule. Computes adherence rates. Flags patterns — repeated missed doses, a lab value trending — so nothing goes unnoticed.' },
  { color: 'accent-red' as const, title: 'Weekly Digest', desc: 'Synthesizes everything into one calm message every Sunday. Every flagged item ends with "worth raising with your doctor" — never a recommendation.' },
] as const;
