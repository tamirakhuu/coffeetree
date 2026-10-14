import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const positions = new Map();

export function ScrollRestoration() {
  const location = useLocation();
  const navigation = useNavigationType();
  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => { history.scrollRestoration = previous; };
  }, []);
  useLayoutEffect(() => {
    const key = location.key;
    const target = navigation === 'POP' ? positions.get(key) || 0 : 0;
    let restoring = true;
    let lastY = target;
    let frame;
    const started = performance.now();
    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ top: target, left: 0, behavior: 'instant' });
      // Lazy pages and images may not have their final height yet.
      if (Math.abs(window.scrollY - target) < 2 || performance.now() - started > 10000) {
        restoring = false;
        lastY = window.scrollY;
      } else frame = requestAnimationFrame(restore);
    };
    const save = () => { if (!restoring && document.body.style.position !== 'fixed') lastY = window.scrollY; };
    const cancel = () => { restoring = false; lastY = window.scrollY; cancelAnimationFrame(frame); };
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('keydown', cancel);
    restore();
    return () => {
      positions.set(key, lastY);
      if (positions.size > 150) positions.delete(positions.keys().next().value);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', save);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }, [location.key, navigation]);
  return null;
}
