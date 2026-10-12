import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import WestBengalMap from '../components/WestBengalMap';
import type { MapDestination } from '../components/WestBengalMap';
import { getPublicDestinations } from '../api';
import type { PublicDestination } from '../api';
import { getDestinationImage } from '../services/imageService';
import DestinationImage from '../components/DestinationImage';
import { useTranslation } from '../DetouraContext';
import LanguageSelector from '../components/LanguageSelector';

const CATEGORIES_DEF = [
  { id: 'All', key: 'explore.categoryAll', fallback: 'All Destinations' },
  { id: 'Hill Station', key: 'explore.categoryHills', fallback: 'Hills & Ridges' },
  { id: 'Wildlife', key: 'explore.categoryWild', fallback: 'Nature & Wild' },
  { id: 'Coastal', key: 'explore.categoryCoastal', fallback: 'Coastal & Beaches' },
  { id: 'Heritage', key: 'explore.categoryHeritage', fallback: 'Heritage & Temples' }
];

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    t,
    localizeCategory,
    localizeRegion,
    localizeDestinationName,
    formatPricePerDay
  } = useTranslation();
  const mapSectionRef = useRef<HTMLElement>(null);

  const categories = useMemo(() => 
    CATEGORIES_DEF.map((c) => ({
      id: c.id,
      label: t(c.key, c.fallback)
    })),
    [t]
  );

  const [allDestinations, setAllDestinations] = useState<PublicDestination[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [imagesMap, setImagesMap] = useState<Record<string, string>>({});

  // 1. Load all 515 destinations from master dataset
  useEffect(() => {
    getPublicDestinations().then((data) => {
      setAllDestinations(data);
      if (data.length > 0 && !selectedDestinationId) {
        setSelectedDestinationId(data[0].destination_id);
      }
    });
  }, []);

  const handleBuildDetoura = () => {
    if (user) {
      navigate('/travel-dna');
    } else {
      navigate('/login', { state: { from: { pathname: '/travel-dna' } } });
    }
  };

  // 2. Filter destinations dynamically for map and listings
  const filteredDestinations: MapDestination[] = useMemo(() => {
    return allDestinations
      .filter((dest) => {
        const matchesCategory =
          selectedCategory === 'All' ||
          dest.category.toLowerCase().includes(selectedCategory.toLowerCase());
        const matchesSearch =
          !searchQuery.trim() ||
          dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dest.category.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesSearch;
      })
      .map((d) => ({
        destination_id: d.destination_id,
        name: d.name,
        district: d.district,
        category: d.category,
        latitude: d.latitude,
        longitude: d.longitude,
        budget_tier: d.budget_tier,
        estimated_daily_inr: d.estimated_daily_inr,
        detoura_score: 1.0 + (d.underrated_score || 0.5),
        underrated_score: d.underrated_score,
        crowd_pressure_index: d.crowd_pressure_index
      }));
  }, [allDestinations, selectedCategory, searchQuery]);

  // 4. Safe selection update if current selected destination is filtered out
  useEffect(() => {
    if (selectedDestinationId && !filteredDestinations.some((d) => d.destination_id === selectedDestinationId)) {
      setSelectedDestinationId(filteredDestinations.length > 0 ? filteredDestinations[0].destination_id : null);
    }
  }, [filteredDestinations, selectedDestinationId]);

  // 5. State-driven active selected destination
  const selectedDestination = useMemo(() => {
    if (selectedDestinationId) {
      const found = allDestinations.find((d) => d.destination_id === selectedDestinationId);
      if (found) return found;
    }
    return filteredDestinations[0] || allDestinations[0] || null;
  }, [selectedDestinationId, allDestinations, filteredDestinations]);

  // 6. Curated Highlights: Top recommendations from the active filter
  const curatedList = useMemo(() => {
    if (!filteredDestinations.length) return [];
    const items = [...filteredDestinations];
    items.sort((a, b) => (b.detoura_score || 0) - (a.detoura_score || 0));
    return items.slice(0, 10);
  }, [filteredDestinations]);

  // 7. Hidden gems from the real 515 dataset (highest underrated scores)
  const hiddenGems = useMemo(() => {
    return [...allDestinations]
      .filter((d) => (d.underrated_score || 0) >= 0.75)
      .sort((a, b) => (b.underrated_score || 0) - (a.underrated_score || 0))
      .slice(0, 4);
  }, [allDestinations]);

  // 8. Preload images lazily for visible cards
  useEffect(() => {
    const toFetch = [...curatedList.slice(0, 8), ...hiddenGems];
    if (selectedDestination) {
      toFetch.push(selectedDestination);
    }

    toFetch.forEach((dest) => {
      if (!imagesMap[dest.destination_id]) {
        getDestinationImage(dest.name, dest.district, dest.category).then((img) => {
          setImagesMap((prev) => ({ ...prev, [dest.destination_id]: img }));
        });
      }
    });
  }, [curatedList, hiddenGems, selectedDestination]);

  // Center/View pin handler
  const handleViewPin = (destId: string) => {
    setSelectedDestinationId(destId);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full pb-8">
        {/* Top Greeting & Contextual Status */}
        <section className="px-margin-mobile pt-3 pb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                {t('explore.aiEngineReady')}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <LanguageSelector />
              {user ? (
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold hover:bg-primary-fixed-dim transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">account_circle</span>
                  <span className="truncate max-w-[95px]">{user.displayName || user.email?.split('@')[0]}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/login"
                    id="explore-login-btn"
                    className="px-3 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold transition-colors"
                  >
                    {t('common.signIn')}
                  </Link>
                  <Link
                    to="/signup"
                    id="explore-signup-btn"
                    className="px-3 py-1 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold transition-colors shadow-xs"
                  >
                    {t('common.signUp')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">
              {user ? `${t('explore.goodMorning')}, ${user.displayName || user.email?.split('@')[0]}` : t('explore.discoverBengal')}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {user ? t('explore.whereDetourToday') : t('explore.curatedRegionalIntel')}
            </p>
          </div>

          {/* Hero Build My Detoura Gateway Card */}
          <div className="mt-1 p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-surface-container-high to-secondary/15 border border-primary/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-primary font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                <span>{t('nav.travelDna')}</span>
              </div>
              <h3 className="font-headline-sm text-[15px] font-semibold text-on-surface mt-0.5 leading-tight">
                {t('explore.heroHeadline')}
              </h3>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5 line-clamp-1">
                {t('explore.heroSubhead')}
              </p>
            </div>
            <button
              id="home-build-detoura-btn"
              onClick={handleBuildDetoura}
              className="shrink-0 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-container active:scale-95 text-on-primary font-label-md text-label-md font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('explore.startDnaQuiz')}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Smart Search Bar */}
          <div className="mt-2 relative flex items-center shadow-sm">
            <div className="absolute left-3.5 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-12 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-sm font-body-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              placeholder={t('common.search')}
              type="text"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </section>

        {/* Interactive Map Section — Focused Strictly on West Bengal */}
        <section ref={mapSectionRef} className="mt-4 px-margin-mobile flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">map</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('explore.topographicNavigator')}</h2>
            </div>
            <span className="font-label-md text-label-md text-secondary font-semibold uppercase tracking-wider">
              {t('regions.westBengal')} ({filteredDestinations.length})
            </span>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>


          {/* Interactive Leaflet Map Container Restricted to West Bengal Bounds */}
          <WestBengalMap
            destinations={filteredDestinations}
            selectedDestinationId={selectedDestinationId}
            onSelectDestination={(dest) => setSelectedDestinationId(dest.destination_id)}
            height="340px"
          />

          {/* Fully State-Driven Selected Destination Card */}
          {selectedDestination ? (
            <div className="mt-2 rounded-2xl bg-surface-container-lowest p-4 border-2 border-primary/40 shadow-md flex flex-col sm:flex-row items-stretch gap-4 animate-fadeIn">
              <div className="relative w-full sm:w-44 h-40 rounded-xl overflow-hidden shrink-0 bg-surface-container-highest">
                <DestinationImage
                  src={imagesMap[selectedDestination.destination_id]}
                  alt={selectedDestination.name}
                  name={selectedDestination.name}
                  district={selectedDestination.district}
                  category={selectedDestination.category}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-[10px] font-bold uppercase tracking-wider shadow-xs">
                  {t('explore.activeSelection')}
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white font-label-sm text-[10px]">
                  {localizeRegion(selectedDestination.district)}
                </div>
              </div>

              <div className="flex flex-col flex-1 justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider truncate">
                      {localizeCategory(selectedDestination.category)}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      ID: {selectedDestination.destination_id}
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-[18px] font-bold text-on-surface mt-1 leading-tight">
                    {localizeDestinationName(selectedDestination.name)}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                    {localizeRegion(selectedDestination.district)} • {t('recommendations.tierLabel')} {selectedDestination.budget_tier} • {t('recommendations.offbeatLabel')}: {Math.round((selectedDestination.underrated_score || 0.5) * 100)}% • {t('recommendations.crowdPressureLabel')}: {Math.round((selectedDestination.crowd_pressure_index || 0.4) * 100)}%
                  </p>
                </div>

                <div className="pt-3 mt-2 border-t border-surface-container flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      {formatPricePerDay(selectedDestination.estimated_daily_inr || 1800)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="selected-view-pin-btn"
                      onClick={() => handleViewPin(selectedDestination.destination_id)}
                      className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-colors active:scale-95 shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      <span>{t('explore.viewPin')}</span>
                    </button>
                    <button
                      onClick={handleBuildDetoura}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold transition-colors active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('explore.planTrip')}</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant mb-1">travel_explore</span>
              <p className="font-body-md text-on-surface font-medium">{t('explore.noDestMatchCategory')}</p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-1.5 rounded-xl bg-secondary text-on-secondary font-label-md font-semibold cursor-pointer"
              >
                {t('explore.resetFilter')}
              </button>
            </div>
          )}
        </section>

        {/* Section: Recommended for you (Horizontal Carousel with real 515-destination data) */}
        <section className="mt-6 flex flex-col gap-3">
          <div className="px-margin-mobile flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('explore.offbeatHighlights')}</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('explore.offbeatSubhead')}
              </p>
            </div>
            <button
              onClick={handleBuildDetoura}
              className="font-label-md text-label-md text-primary font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              {t('explore.tuneDna')} <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          {/* Dynamic Carousel Container */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-margin-mobile py-1">
            {curatedList.map((dest) => {
              const isSelected = selectedDestinationId === dest.destination_id;
              const imgUrl = imagesMap[dest.destination_id];

              return (
                <article
                  key={dest.destination_id}
                  id={`explore-card-${dest.destination_id}`}
                  onClick={() => setSelectedDestinationId(dest.destination_id)}
                  className={`min-w-[280px] max-w-[300px] shrink-0 rounded-2xl bg-surface-container-lowest overflow-hidden shadow-md flex flex-col cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2 scale-[1.01]' : 'hover:shadow-lg'
                  }`}
                >
                  <div className="relative h-44 w-full overflow-hidden bg-surface-container-highest">
                    <DestinationImage
                      src={imgUrl}
                      alt={dest.name}
                      name={dest.name}
                      district={dest.district}
                      category={dest.category}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-bold uppercase tracking-wider">
                        {Math.min(Math.max(Math.round(((dest.detoura_score || 1.2) / 2.5) * 100), 50), 99)}% {t('common.match')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface font-label-sm text-label-sm font-medium">
                        {localizeRegion(dest.district)}
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-on-primary">
                      <span className="font-label-sm text-label-sm flex items-center gap-1 opacity-90 truncate">
                        <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                        <span>{localizeRegion(dest.district)}</span>
                      </span>
                      <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-xs text-primary-fixed-dim shrink-0">
                        {localizeCategory(dest.category)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                        {localizeDestinationName(dest.name)}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                        {t('explore.authenticDestinationIn')} {localizeRegion(dest.district)}.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-surface-container flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                          {formatPricePerDay(dest.estimated_daily_inr || 1800)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPin(dest.destination_id);
                        }}
                        className={`px-3 py-1 rounded-lg font-label-md text-label-md font-semibold transition-colors active:scale-95 flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                        }`}
                      >
                        <span>{t('explore.viewPin')}</span>
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Section: Hidden Gems of Bengal (Dynamic State-Driven Stack) */}
        <section className="mt-6 px-margin-mobile flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-tertiary text-[20px]">diamond</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('explore.hiddenGemsTitle')}</h2>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              {t('explore.realData')} ({hiddenGems.length})
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {hiddenGems.map((gem) => {
              const isSelected = selectedDestinationId === gem.destination_id;
              const imgUrl = imagesMap[gem.destination_id];

              return (
                <div
                  key={gem.destination_id}
                  onClick={() => setSelectedDestinationId(gem.destination_id)}
                  className={`rounded-xl bg-surface-container-lowest p-3 shadow-sm hover:shadow-md transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected ? 'border-2 border-primary ring-1 ring-primary' : 'border border-outline-variant/30'
                  }`}
                >
                  <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden relative bg-surface-container-highest">
                    <DestinationImage
                      src={imgUrl}
                      alt={gem.name}
                      name={gem.name}
                      district={gem.district}
                      category={gem.category}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/60 text-white font-label-sm text-[8px] font-bold">
                      {localizeCategory(gem.category?.split(' ')[0])}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider truncate">
                        {localizeRegion(gem.district)}
                      </span>
                      <span className="font-label-sm text-[11px] font-semibold text-primary">
                        {formatPricePerDay(gem.estimated_daily_inr || 1600)}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-[15px] leading-snug text-on-surface font-semibold truncate mt-0.5">
                      {localizeDestinationName(gem.name)}
                    </h3>
                    <p className="font-body-sm text-[12px] text-on-surface-variant line-clamp-1 mt-0.5">
                      {t('explore.tranquilityQuotient')} • {Math.round((gem.underrated_score || 0.8) * 100)}% {localizeRegion(gem.district)}.
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-on-surface-variant font-label-sm text-[11px]">
                      <span className="flex items-center gap-0.5 truncate">
                        <span className="material-symbols-outlined text-[13px] text-primary">pin_drop</span>
                        {localizeRegion(gem.district)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPin(gem.destination_id);
                        }}
                        className="text-primary font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{t('explore.pinOnMap')}</span>
                        <span className="material-symbols-outlined text-[13px]">my_location</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick AI Generator Detour Prompt Drawer Trigger */}
        <section className="mt-6 px-margin-mobile">
          <div className="rounded-2xl p-4 bg-gradient-to-br from-surface-container-high via-surface-container to-secondary-container/30 flex items-center justify-between gap-3 shadow-sm border border-outline-variant/30">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wide">{t('explore.customBengalDetour')}</span>
              </div>
              <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold mt-0.5">{t('explore.got3Days')}</h4>
              <p className="font-body-sm text-[13px] text-on-surface-variant mt-0.5">{t('explore.letAiCalibrate')}</p>
            </div>
            <button 
              id="drawer-build-detoura-btn"
              onClick={handleBuildDetoura}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-semibold hover:bg-secondary-fixed-variant transition-transform active:scale-95 shadow-sm cursor-pointer"
            >
              {t('explore.craftTrip')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
