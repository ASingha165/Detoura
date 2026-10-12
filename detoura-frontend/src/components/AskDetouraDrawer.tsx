import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDetoura } from '../DetouraContext';
import { sendChatMessage, calculateHaversineDistance } from '../api';
import type { ChatContext } from '../api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: string;
  timestamp: string;
}

export const AskDetouraDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const routeLocation = useLocation();
  const {
    language,
    t,
    activeIntelligence,
    recommendations,
    userLocation,
    selectedPlaceTypes,
  } = useDetoura();

  // Determine current destination context if on detail page or top recommendation
  const pathParts = routeLocation.pathname.split('/');
  const isDetailPage = pathParts[1] === 'destination' && pathParts[2];
  const detailDestId = isDetailPage ? pathParts[2] : null;

  const currentDest = React.useMemo(() => {
    if (detailDestId) {
      const found = recommendations.find((r) => r.destination_id === detailDestId);
      if (found) return found;
      if (activeIntelligence?.destination?.id === detailDestId) {
        return {
          destination_id: activeIntelligence.destination.id,
          name: activeIntelligence.destination.name,
          district: activeIntelligence.destination.district,
          state: activeIntelligence.destination.state || 'West Bengal',
          category: activeIntelligence.destination.category,
          latitude: activeIntelligence.destination.latitude,
          longitude: activeIntelligence.destination.longitude,
          address: activeIntelligence.destination.address,
          distance_km: activeIntelligence.user_distance?.distance_km,
          match_score: activeIntelligence.destination_intelligence?.match_score,
          ssi: activeIntelligence.destination_intelligence?.ssi,
          underrated_score: activeIntelligence.destination_intelligence?.underrated_score,
          budget_tier: activeIntelligence.destination_intelligence?.budget_tier,
          estimated_daily_inr: activeIntelligence.destination_intelligence?.estimated_daily_inr,
          itinerary: activeIntelligence.itinerary,
          activities: activeIntelligence.activities,
        };
      }
    }
    // Otherwise check active intelligence
    if (activeIntelligence?.destination) {
      return {
        destination_id: activeIntelligence.destination.id,
        name: activeIntelligence.destination.name,
        district: activeIntelligence.destination.district,
        state: activeIntelligence.destination.state || 'West Bengal',
        category: activeIntelligence.destination.category,
        latitude: activeIntelligence.destination.latitude,
        longitude: activeIntelligence.destination.longitude,
        address: activeIntelligence.destination.address,
        distance_km: activeIntelligence.user_distance?.distance_km,
        match_score: activeIntelligence.destination_intelligence?.match_score,
        ssi: activeIntelligence.destination_intelligence?.ssi,
        underrated_score: activeIntelligence.destination_intelligence?.underrated_score,
        budget_tier: activeIntelligence.destination_intelligence?.budget_tier,
        estimated_daily_inr: activeIntelligence.destination_intelligence?.estimated_daily_inr,
        itinerary: activeIntelligence.itinerary,
        activities: activeIntelligence.activities,
      };
    }
    // Fallback to top recommendation
    if (recommendations.length > 0) {
      return recommendations[0];
    }
    return null;
  }, [detailDestId, recommendations, activeIntelligence]);

  // Reset or initialize welcome message when language changes or first opened
  useEffect(() => {
    const welcomeText = t('chatbot.welcomeMessage');
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: welcomeText,
        source: 'gemma',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [language]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isThinking]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isThinking) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsThinking(true);

    // Build strictly verified context payload
    const dist = currentDest
      ? (currentDest.distance_km ??
          (userLocation && currentDest.latitude && currentDest.longitude
            ? Math.round(calculateHaversineDistance(userLocation.latitude, userLocation.longitude, currentDest.latitude, currentDest.longitude) * 10) / 10
            : undefined))
      : undefined;

    const contextPayload: ChatContext = currentDest
      ? {
          destination_name: currentDest.name,
          destination_id: currentDest.destination_id,
          address: currentDest.address || (currentDest.district ? `${currentDest.name}, ${currentDest.district}, West Bengal` : 'West Bengal'),
          district: currentDest.district,
          state: (currentDest as any).state || 'West Bengal',
          category: currentDest.category,
          latitude: currentDest.latitude,
          longitude: currentDest.longitude,
          distance_km: dist,
          match_score: currentDest.match_score,
          ssi: currentDest.ssi,
          underrated_score: currentDest.underrated_score,
          budget_tier: currentDest.budget_tier,
          estimated_daily_inr: (currentDest as any).estimated_daily_inr || (currentDest as any).budget_per_day,
          travel_style: (currentDest as any).travel_style || currentDest.category,
          place_preferences: selectedPlaceTypes,
          itinerary: currentDest.itinerary || (activeIntelligence?.destination?.id === currentDest.destination_id ? activeIntelligence.itinerary : undefined),
          activities: currentDest.activities || (activeIntelligence?.destination?.id === currentDest.destination_id ? activeIntelligence.activities : undefined),
        }
      : {};

    try {
      const reply = await sendChatMessage({
        message: query,
        language: language,
        destination_id: currentDest?.destination_id,
        context: contextPayload,
      });

      const assistantMsg: Message = {
        id: `gemma-${Date.now()}`,
        sender: 'assistant',
        text: reply.response,
        source: reply.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn('Chat notice:', err);
      let fallbackText = 'Sorry, I encountered an issue retrieving an answer. Please try again.';
      if (currentDest) {
        if (language === 'bn') {
          fallbackText = `${currentDest.name} পশ্চিমবঙ্গের ${currentDest.district || 'পশ্চিমবঙ্গ'} জেলায় অবস্থিত একটি অফবিট গন্তব্য। আপনার ট্রাভেল ডিএনএ-র সাথে এর শান্ত প্রাকৃতিক পরিবেশ চমৎকারভাবে মেলে।`;
        } else if (language === 'hi') {
          fallbackText = `${currentDest.name} पश्चिम बंगाल के ${currentDest.district || 'पश्चिम बंगाल'} ज़िले में स्थित है। यह एक सुंदर और शांत ऑफबीট स्थल है।`;
        } else {
          fallbackText = `${currentDest.name} is a verified offbeat destination in ${currentDest.district || 'West Bengal'}, West Bengal, calibrated for low crowds and authentic experiences.`;
        }
      } else {
        if (language === 'bn') {
          fallbackText = 'দুঃখিত, সংযোগ স্থাপন করতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
        } else if (language === 'hi') {
          fallbackText = 'क्षमा करें, कनेक्शन में अस्थायी समस्या आई है। कृपया पुनः प्रयास करें।';
        }
      }
      const errorMsg: Message = {
        id: `offline-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        source: 'grounded_offline',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    t('chatbot.quickPromptActivities'),
    t('chatbot.quickPromptItinerary'),
    t('chatbot.quickPromptDistance'),
  ];

  const isAuthScreen = routeLocation.pathname === '/login' || routeLocation.pathname === '/signup';

  return (
    <>
      {/* Floating Trigger Button (fixed bottom-24 right-6 above bottom navigation) */}
      {!isOpen && (
        <button
          id="ask-detoura-fab"
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-container text-on-primary font-semibold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 backdrop-blur-md"
          aria-label={t('chatbot.title')}
        >
          <span className="material-symbols-outlined text-[20px] animate-pulse">psychology</span>
          <span className="font-label-md text-label-md tracking-wide">
            {t('chatbot.floatingButton')}
          </span>
          {currentDest && (
            <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-secondary"></span>
          )}
        </button>
      )}

      {/* Backdrop: z-30 strictly below drawer (z-40) and BottomNav (z-50) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-scrim/40 backdrop-blur-xs z-30 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Chat Container: Desktop slide-over right drawer, Mobile bottom-sheet */}
      {/* Layering: z-40, positioned strictly above BottomNav (z-50) */}
      {isOpen && (
        <aside
          className="fixed z-40 flex flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out
            /* Desktop / Tablet: Right Drawer */
            md:top-0 md:right-0 md:w-[420px] md:max-w-full md:border-l md:border-outline-variant/30
            /* Mobile: Bottom-sheet Panel */
            max-md:inset-x-0 max-md:max-h-[85vh] max-md:rounded-t-3xl max-md:border-t max-md:border-outline-variant/30"
          style={{
            bottom: isAuthScreen ? 0 : 'var(--bottom-nav-height, calc(5rem + env(safe-area-inset-bottom, 0px)))',
          }}
          aria-label={t('chatbot.title')}
          role="dialog"
          aria-modal="true"
        >
          {/* Drawer Header */}
          <header className="p-4 border-b border-outline-variant/20 bg-surface-container-low/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">psychology</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-headline-sm text-[16px] font-bold text-on-surface leading-tight">
                    {t('chatbot.title')}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Gemma 2B
                  </span>
                </div>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {currentDest ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-primary">location_on</span>
                      <strong className="text-on-surface">{currentDest.name}</strong>
                    </span>
                  ) : (
                    t('chatbot.subtitle')
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              aria-label={t('chatbot.close')}
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </header>

          {/* Quick Suggestion Chips (whenApplicable) */}
          <div className="px-4 py-2 bg-surface-container-lowest/50 border-b border-outline-variant/10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(promptText)}
                disabled={isThinking}
                className="text-[12px] font-medium px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all whitespace-nowrap shrink-0 cursor-pointer border border-outline-variant/20 disabled:opacity-50"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-[14px] leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-primary text-on-primary rounded-br-xs'
                      : 'bg-surface-container text-on-surface rounded-bl-xs border border-outline-variant/20'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-on-surface-variant/70">
                  <span>{msg.timestamp}</span>
                  {msg.source && msg.sender === 'assistant' && (
                    <>
                      <span>•</span>
                      <span className="font-semibold">{msg.source === 'gemma' ? 'Gemma 2B' : 'Detoura Engine'}</span>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking / Loading indicator */}
            {isThinking && (
              <div className="flex flex-col items-start">
                <div className="rounded-2xl rounded-bl-xs p-3 bg-surface-container border border-outline-variant/20 text-on-surface-variant flex items-center gap-2 text-[13px]">
                  <span className="material-symbols-outlined text-[16px] animate-spin text-primary">sync</span>
                  <span className="italic">{t('chatbot.thinking')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Footer Controls */}
          <footer className="p-3 border-t border-outline-variant/20 bg-surface-container-low/70 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chatbot.inputPlaceholder')}
                disabled={isThinking}
                className="flex-1 px-4 py-2.5 text-[14px] rounded-xl bg-surface border border-outline-variant/40 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-[13px] shadow-xs hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 cursor-pointer"
                aria-label={t('chatbot.send')}
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
            <p className="text-[10px] text-on-surface-variant/60 text-center mt-2 px-2 leading-tight">
              {t('chatbot.disclaimer')}
            </p>
          </footer>
        </aside>
      )}
    </>
  );
};

export default AskDetouraDrawer;
