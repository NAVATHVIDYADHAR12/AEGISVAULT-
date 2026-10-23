'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const INTRO_SEEN_KEY = 'aegis-vault-intro-seen';

export default function IntroGate() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);
  const skipButton = useRef(null);

  function finishIntro() {
    if (finished.current) return;
    finished.current = true;
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // The current page still continues when browser storage is unavailable.
    }
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 420);
  }

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(INTRO_SEEN_KEY) === '1') {
        setVisible(false);
        return;
      }
    } catch {
      // Play the intro when browser storage is unavailable.
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishIntro();
      return;
    }

    skipButton.current?.focus({ preventScroll: true });
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`site-intro${leaving ? ' site-intro-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Aegis Vault introduction"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          finishIntro();
        } else if (event.key === 'Tab') {
          event.preventDefault();
          skipButton.current?.focus();
        }
      }}
    >
      <video
        className="site-intro-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/bg.jpg"
        aria-hidden="true"
        onEnded={finishIntro}
        onError={finishIntro}
      >
        <source src="/introVideo.mp4" type="video/mp4" />
      </video>
      <div className="site-intro-vignette" aria-hidden="true" />
      <div className="site-intro-brand" aria-hidden="true">
        <span className="site-intro-mark"><span /></span>
        <span>AEGIS VAULT</span>
        <i />
        <span className="site-intro-label">SECURE DIGITAL TRUST</span>
      </div>
      <button
        ref={skipButton}
        type="button"
        className="site-intro-skip"
        onClick={finishIntro}
      >
        Skip intro <ArrowRight size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
