import { BookOpen, Mail, Users } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="pg-footer">
      <div className="pg-footer-brand">
        <strong>PyGrassReal-Ai</strong>
        <span>Node-based 3D design with AI acceleration.</span>
      </div>
      <div className="pg-footer-links">
        <button type="button" onClick={() => onNavigate('/docs')}>
          <BookOpen size={15} />
          <span>Docs</span>
        </button>
        <a href="https://github.com" target="_blank" rel="noreferrer">
          <Users size={15} />
          <span>Community</span>
        </a>
        <a href="mailto:contact@pygrassreal.ai">
          <Mail size={15} />
          <span>Contact</span>
        </a>
      </div>
      <small>© {new Date().getFullYear()} PyGrassReal-Ai. All rights reserved.</small>
    </footer>
  );
}
