import React from 'react';
import { useDetoura } from '../DetouraContext';
import type { Language } from '../i18n/translations';

interface LanguageSelectorProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  size = 'sm',
}) => {
  const { language, setLanguage } = useDetoura();

  const languages: { code: Language; label: string; title: string }[] = [
    { code: 'en', label: 'EN', title: 'English' },
    { code: 'hi', label: 'हिन्दी', title: 'Hindi (हिन्दी)' },
    { code: 'bn', label: 'বাংলা', title: 'Bengali (বাংলা)' },
  ];

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px]' 
    : 'px-3 py-1 text-[13px]';

  return (
    <div
      role="group"
      aria-label="Language Selector"
      className={`inline-flex items-center bg-surface-container-high/80 backdrop-blur-sm p-0.5 rounded-full border border-outline-variant/40 shadow-2xs ${className}`}
    >
      {languages.map((lang, idx) => {
        const isActive = language === lang.code;
        return (
          <React.Fragment key={lang.code}>
            {idx > 0 && (
              <span className="text-outline-variant/60 text-[10px] select-none mx-0.5">
                |
              </span>
            )}
            <button
              type="button"
              id={`lang-btn-${lang.code}`}
              onClick={() => setLanguage(lang.code)}
              aria-pressed={isActive}
              title={lang.title}
              className={`${sizeClasses} rounded-full font-label-sm font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/60'
              }`}
            >
              {lang.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default LanguageSelector;
