import { useState, useEffect } from 'react';
import { getFallbackImage, sanitizeWikimediaUrl, getDestinationImage } from '../services/imageService';

interface DestinationImageProps {
  src?: string | null;
  alt: string;
  name?: string;
  district?: string;
  category?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function DestinationImage({
  src,
  alt,
  name,
  district,
  category,
  className = '',
  loading = 'lazy'
}: DestinationImageProps) {
  const fallbackUrl = getFallbackImage(category, name);
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    return src ? sanitizeWikimediaUrl(src) : fallbackUrl;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (src) {
      setCurrentSrc(sanitizeWikimediaUrl(src));
      setHasError(false);
    } else if (name) {
      // Auto-resolve real photography if not passed directly
      setCurrentSrc(fallbackUrl);
      getDestinationImage(name, district, category)
        .then((resolved) => {
          if (isMounted && resolved) {
            setCurrentSrc(sanitizeWikimediaUrl(resolved));
          }
        })
        .catch(() => {
          if (isMounted) {
            setCurrentSrc(fallbackUrl);
          }
        });
    } else {
      setCurrentSrc(fallbackUrl);
    }

    return () => {
      isMounted = false;
    };
  }, [src, name, district, category, fallbackUrl]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(fallbackUrl);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt || name || 'Bengal Destination'}
      loading={loading}
      decoding="async"
      onError={handleError}
      className={`${className} transition-opacity duration-300`}
    />
  );
}
