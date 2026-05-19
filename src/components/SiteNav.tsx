import type { SiteSection } from '../lib/types';
import './SiteNav.css';

interface SiteNavProps {
  activeSection: SiteSection;
  onSectionChange: (section: SiteSection) => void;
}

const sections: { id: SiteSection; label: string }[] = [
  { id: 'anyways', label: 'anyways' },
  { id: 'search', label: 'search' },
  { id: 'contact', label: 'contact' },
];

export default function SiteNav({ activeSection, onSectionChange }: SiteNavProps) {
  return (
    <nav className="site-nav-minimal" aria-label="Site sections">
      <ul className="site-nav-list">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className={`site-nav-link ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => onSectionChange(section.id)}
              aria-current={activeSection === section.id ? 'page' : undefined}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
