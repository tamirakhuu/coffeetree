import React, { useEffect, useRef } from 'react';
import { ProductCard } from './ProductCard.jsx';
import './ProductRail.css';

export function ProductRail({ items, onOpen, onQuickAdd, wishlist, onToggleWish, label }) {
  const rail = useRef(null);
  const track = useRef(null);
  const interactionUntil = useRef(0);
  const pause = () => { interactionUntil.current = performance.now() + 5000; };
  useEffect(() => {
    const node = rail.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const content = track.current;
    let inView = false, end = 0, hovered = false, focused = false;
    const measure = () => { end = Math.max(0, node.scrollWidth - node.clientWidth); };
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    resize.observe(content);
    const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
    intersection.observe(node);
    const enter = e => { if (e.pointerType === 'mouse') hovered = true; };
    const leave = () => { hovered = false; };
    const focus = () => { focused = true; };
    const blur = e => { focused = node.contains(e.relatedTarget); };
    node.addEventListener('pointerenter', enter);
    node.addEventListener('pointerleave', leave);
    node.addEventListener('focusin', focus);
    node.addEventListener('focusout', blur);
    measure();
    let frame, previous = 0, position = node.scrollLeft, lastWritten = node.scrollLeft;
    const animate = now => {
      const elapsed = Math.min(now - (previous || now), 50);
      previous = now;
      const paused = motion.matches || document.hidden || !inView || hovered || focused || now < interactionUntil.current;
      if (paused) {
        position = node.scrollLeft;
        lastWritten = position;
        content.style.transform = '';
      } else if (end > 1) {
        if (Math.abs(node.scrollLeft - lastWritten) > 1) position = node.scrollLeft;
        position += elapsed * .025;
        if (position >= end) { position = 0; interactionUntil.current = now + 1800; }
        node.scrollLeft = position;
        lastWritten = node.scrollLeft;
        // Scroll offsets may be rounded to physical pixels. Render the fractional
        // remainder on the compositor so slow movement stays visually smooth.
        content.style.transform = `translate3d(${lastWritten - position}px, 0, 0)`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', leave);
      node.removeEventListener('focusin', focus);
      node.removeEventListener('focusout', blur);
      content.style.transform = '';
    };
  }, [items.length]);
  return <div className="product-rail" ref={rail} role="region" aria-label={label} tabIndex={0}
    onPointerDown={pause} onPointerUp={pause} onTouchMove={pause} onWheel={pause}>
    <div className="product-rail-track" ref={track}>{items.map(product => <div className="product-rail-card" key={product.id}>
      <ProductCard product={product} onOpen={onOpen} onQuickAdd={onQuickAdd} isWished={wishlist.includes(product.id)} onToggleWish={onToggleWish} />
    </div>)}</div>
  </div>;
}
