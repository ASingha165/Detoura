import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../DetouraContext';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const { t } = useTranslation();

  // Do not render BottomNav on authentication screens
  if (path === '/login' || path === '/signup') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex justify-around items-center h-20 px-margin-mobile">
        <Link 
          to="/" 
          id="nav-explore"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors ${path === '/' || path === '/explore' ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[22px]">explore</span>
          <span className="font-label-sm text-label-sm tracking-wide truncate max-w-[70px] text-center">
            {t('nav.explore')}
          </span>
        </Link>
        <Link 
          to="/travel-dna" 
          id="nav-travel-dna"
          className={`flex flex-col items-center justify-center gap-1 w-20 h-14 transition-colors ${path === '/travel-dna' ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[22px]">psychology</span>
          <span className="font-label-sm text-label-sm tracking-wide truncate max-w-[80px] text-center">
            {t('nav.travelDna')}
          </span>
        </Link>
        <Link 
          to="/recommendations" 
          id="nav-discover"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors ${path === '/recommendations' ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
          <span className="font-label-sm text-label-sm tracking-wide truncate max-w-[70px] text-center">
            {t('nav.discover')}
          </span>
        </Link>
        <Link 
          to="/profile" 
          id="nav-profile"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors ${path === '/profile' ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[22px]">account_circle</span>
          <span className="font-label-sm text-label-sm tracking-wide truncate max-w-[70px] text-center">
            {t('nav.profile')}
          </span>
        </Link>
      </div>
    </nav>
  );
}
