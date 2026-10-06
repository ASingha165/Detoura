import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDetoura } from '../DetouraContext';
import { useAuth } from '../AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import LanguageSelector from '../components/LanguageSelector';

export default function Profile() {
  const navigate = useNavigate();
  const { savedTrips, removeTrip, isLoadingTrips, t } = useDetoura();
  const { user, logout } = useAuth();
  const [travelDna, setTravelDna] = useState<{
    nature?: number;
    relaxation?: number;
    culture?: number;
    adventure?: number;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setTravelDna(null);
      return;
    }

    // Try local storage first
    const storageKey = `detoura_travel_dna_${user.uid}`;
    const local = localStorage.getItem(storageKey);
    if (local) {
      try {
        setTravelDna(JSON.parse(local));
      } catch {}
    }

    // Load from Firestore
    let isMounted = true;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists() && isMounted) {
        const d = snap.data();
        const dna = d.travelDna || d.preferences;
        if (dna) {
          setTravelDna(dna);
          localStorage.setItem(storageKey, JSON.stringify(dna));
        }
      }
    }).catch((err) => {
      console.warn('Firestore profile DNA fetch notice:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Traveler');
  const userEmail = user?.email || 'No email associated';

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full pb-28">
        <div className="px-margin-mobile pt-space-md pb-space-lg flex flex-col gap-space-lg">
          {/* Profile Card */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary-fixed/40 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-start gap-space-md relative z-10">
              <div className="relative">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-surface-container-lowest"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center font-headline-md text-headline-md font-bold shadow-sm ring-2 ring-surface-container-lowest">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[10px] shadow-sm">
                  <span className="material-symbols-outlined text-[11px]" style={{"fontVariationSettings": "'FILL' 1"}}>check</span>
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h1 className="font-headline-sm text-headline-sm text-on-surface truncate">{displayName}</h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[13px]">verified_user</span>
                    {user?.provider === 'google' ? 'Google' : 'Passport'}
                  </span>
                </div>
                <p className="font-label-md text-label-md text-secondary font-medium tracking-wide mt-0.5 truncate">
                  {userEmail}
                </p>
                <div className="flex flex-col gap-1 mt-2 text-on-surface-variant font-label-sm text-label-sm">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-ping opacity-75"></span>
                    <span className="truncate">Firebase Auth ({user?.provider === 'google' ? 'Google' : 'Email/Password'})</span>
                  </div>
                  {user?.uid && (
                    <span className="font-mono text-[11px] text-on-surface-variant/80 truncate">
                      UID: {user.uid}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Trigger */}
            <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between gap-2">
              <span className="text-on-surface-variant font-body-sm text-body-sm">{t('profile.activeSession')}</span>
              <button
                id="profile-logout-btn"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-error/30 text-error hover:bg-error-container hover:text-on-error-container font-label-md text-label-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>{t('common.signOut')}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-space-xs mt-space-md pt-space-xs">
              <div className="bg-surface-container-low p-space-xs rounded-lg flex flex-col items-center justify-center text-center">
                <span className="font-label-lg text-label-lg text-primary font-bold">{savedTrips.length}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t('profile.savedTripsCount')}</span>
              </div>
              <div className="bg-surface-container-low p-space-xs rounded-lg flex flex-col items-center justify-center text-center">
                <span className="font-label-lg text-label-lg text-secondary font-bold">3,420</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t('profile.kmMapped')}</span>
              </div>
              <div className="bg-surface-container-low p-space-xs rounded-lg flex flex-col items-center justify-center text-center">
                <span className="font-label-lg text-label-lg text-tertiary font-bold">
                  {travelDna ? `${Math.round(((travelDna.nature || 85) + (travelDna.relaxation || 90)) / 2)}%` : '96%'}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t('profile.aiAlignment')}</span>
              </div>
            </div>
          </section>

          {/* Language & Interface Localization Section */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
                <span className="material-symbols-outlined text-[20px]">translate</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-label-lg text-label-lg font-bold text-on-surface truncate">
                  {t('profile.languageSettings')}
                </h3>
                <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
                  {t('profile.languageSubtitle')}
                </p>
              </div>
            </div>
            <LanguageSelector size="md" />
          </section>

          {/* Travel DNA Profile Summary */}
          {travelDna && (
            <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">psychology</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Travel DNA</h2>
                </div>
                <Link
                  to="/travel-dna"
                  className="text-primary font-label-sm text-label-sm font-semibold hover:underline flex items-center gap-0.5"
                >
                  <span>Edit DNA</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-surface-container-low text-center">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block">Nature</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-secondary">{travelDna.nature ?? 85}%</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low text-center">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block">Serenity</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-secondary">{travelDna.relaxation ?? 90}%</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low text-center">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block">Culture</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-primary">{travelDna.culture ?? 70}%</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low text-center">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant block">Adventure</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-tertiary">{travelDna.adventure ?? 65}%</span>
                </div>
              </div>
            </section>
          )}

          {/* Main Section: My Trips */}
          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('profile.mySavedTrips')}</h2>
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
                  {savedTrips.length} {t('nav.discover')}
                </span>
              </div>
              {savedTrips.length > 0 && (
                <span className="text-[12px] text-on-surface-variant">{t('common.firestoreSynced')}</span>
              )}
            </div>

            {isLoadingTrips ? (
              <div className="bg-surface-container-low p-space-md rounded-xl text-center flex flex-col items-center justify-center gap-2 py-8">
                <span className="material-symbols-outlined text-[28px] text-primary animate-spin">progress_activity</span>
                <p className="text-on-surface-variant font-body-sm text-body-sm">{t('profile.loadingTrips')}</p>
              </div>
            ) : savedTrips.length === 0 ? (
              <div className="bg-surface-container-low p-space-md rounded-xl text-center py-8">
                <span className="material-symbols-outlined text-[36px] text-on-surface-variant mb-2">bookmark_border</span>
                <p className="text-on-surface font-headline-sm text-headline-sm font-semibold">{t('profile.noTripsTitle')}</p>
                <p className="text-on-surface-variant font-body-sm text-body-sm mt-1 mb-4">
                  {t('profile.noTripsDesc')}
                </p>
                <button 
                  onClick={() => navigate('/travel-dna')}
                  className="px-6 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-full font-label-md font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  {t('profile.discoverDetours')}
                </button>
              </div>
            ) : (
              savedTrips.map(trip => (
                <div key={trip.destination_id} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
                  <div className="flex justify-between items-start gap-space-xs">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {trip.district || 'West Bengal'} &bull; {trip.category || 'Spot'}
                      </span>
                      <h3 className="font-headline-md text-headline-md text-on-surface mt-1 truncate">{trip.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-on-surface-variant font-label-md text-label-md">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                          {trip.recommended_duration_days || 2} {t('common.days')}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-secondary">
                          ₹{trip.estimated_daily_inr ?? trip.budget_per_day ?? 2000}/{t('common.perDay')}
                        </span>
                      </div>
                    </div>
                    <img
                      alt={trip.name}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 ml-2"
                      src={trip.image_url || "https://images.unsplash.com/photo-1598091383021-15ddea10925d?q=80&w=2070&auto=format&fit=crop"}
                    />
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-surface-container pt-3">
                    <button 
                      onClick={() => navigate(`/destination/${trip.destination_id}`)}
                      className="flex-1 py-1.5 px-3 rounded-lg border border-outline font-label-md text-label-md text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      {t('profile.viewItinerary')}
                    </button>
                    <button 
                      onClick={() => removeTrip(trip.destination_id)}
                      className="py-1.5 px-3 rounded-lg text-error hover:bg-error-container hover:text-on-error-container font-label-md text-label-md transition-colors cursor-pointer"
                    >
                      {t('profile.removeSaved')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
