import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from '../DetouraContext';
import LanguageSelector from '../components/LanguageSelector';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, signup, loginWithGoogle, loading, error, clearError } = useAuth();
  const { t } = useTranslation();
  
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as any)?.from?.pathname;
  const targetDestination = fromPath && fromPath !== '/' ? fromPath : '/travel-dna';

  useEffect(() => {
    if (!loading && user) {
      navigate(targetDestination, { replace: true });
    }
  }, [user, loading, navigate, targetDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim()) {
      setFormError(t('auth.errorEnterEmail'));
      return;
    }
    if (!password) {
      setFormError(t('auth.errorEnterPassword'));
      return;
    }
    if (password.length < 6) {
      setFormError(t('auth.errorPasswordShort'));
      return;
    }
    if (password !== confirmPassword) {
      setFormError(t('auth.errorPasswordsMismatch'));
      return;
    }

    try {
      await signup(email.trim(), password, name.trim());
      navigate(targetDestination, { replace: true });
    } catch {
      // Error is tracked in AuthContext
    }
  };

  const handleGoogleSignUp = async () => {
    setFormError(null);
    clearError();
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(targetDestination, { replace: true });
    } catch {
      // Error is caught and surfaced through AuthContext.error
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-24">
      {/* Top Header */}
      <section className="px-margin-mobile pt-space-md pb-space-xs">
        <div className="flex items-center justify-between gap-space-sm mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-semibold">
              <span className="material-symbols-outlined text-[14px]">person_add</span>
            </span>
            <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-semibold">{t('auth.joinDetoura')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
              <span>Firebase Auth</span>
            </div>
          </div>
        </div>

        {/* Step Progress Accent */}
        <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden mb-space-md">
          <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out w-full"></div>
        </div>

        <div className="space-y-1">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">
            {t('auth.createPassport')}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('auth.createPassportSubtitle')}
          </p>
        </div>
      </section>

      {/* Main Sign Up Card */}
      <section className="px-margin-mobile py-space-sm flex-1">
        <div className="bg-surface-container-low rounded-2xl p-space-md shadow-sm border border-outline-variant/30 space-y-space-md">
          {/* Error Banner */}
          {(formError || error) && (
            <div id="signup-error-banner" className="p-space-sm rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
              <div className="flex-1">
                <span>{formError || error}</span>
              </div>
            </div>
          )}

          {/* Google Sign-In Primary Action */}
          <button
            id="google-signup-btn"
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || googleLoading}
            className="w-full py-3 px-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 text-on-surface font-label-lg text-label-lg font-semibold flex items-center justify-center gap-3 shadow-xs hover:shadow-sm active:scale-[0.99] transition-all"
          >
            {googleLoading ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-secondary border-t-transparent animate-spin"></div>
                <span>{t('auth.connectingWithGoogle')}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{t('auth.continueWithGoogle')}</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-outline-variant/40 w-full"></div>
            <span className="bg-surface-container-low px-3 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-medium">
              {t('auth.orWithEmail')}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-space-md">
            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="block font-label-md text-label-md text-on-surface font-semibold" htmlFor="signup-name">
                {t('auth.fullNameLabel')} <span className="text-on-surface-variant font-normal">({t('auth.optional')})</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px]">badge</span>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-surface-container-lowest border border-outline/20 text-on-surface placeholder:text-on-surface-variant/50 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block font-label-md text-label-md text-on-surface font-semibold" htmlFor="signup-email">
                {t('auth.emailLabel')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px]">mail</span>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-surface-container-lowest border border-outline/20 text-on-surface placeholder:text-on-surface-variant/50 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block font-label-md text-label-md text-on-surface font-semibold" htmlFor="signup-password">
                {t('auth.passwordLabel')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px]">lock</span>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-container-lowest border border-outline/20 text-on-surface placeholder:text-on-surface-variant/50 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="block font-label-md text-label-md text-on-surface font-semibold" htmlFor="signup-confirm-password">
                {t('auth.confirmPasswordLabel')}
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-[20px]">lock_reset</span>
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-surface-container-lowest border border-outline/20 text-on-surface placeholder:text-on-surface-variant/50 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-space-md rounded-xl bg-primary hover:bg-primary-container active:scale-[0.99] text-on-primary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-md transition-all mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>{t('auth.creatingAccount')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.signUpButton')}</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="pt-2 text-center border-t border-surface-container-high flex flex-col items-center gap-2">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" state={location.state} id="switch-to-login-btn" className="text-primary font-semibold hover:underline">
                {t('auth.signInLink')}
              </Link>
            </p>

            {/* Guest Entry Option */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-secondary font-label-sm text-label-sm hover:underline flex items-center gap-1 mt-1"
            >
              <span>{t('auth.exploreAsGuest')}</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
