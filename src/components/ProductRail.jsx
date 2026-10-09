import React, { useEffect, useRef } from 'react';
import { ProductCard } from './ProductCard.jsx';
import './ProductRail.css';

export function ProductRail({ items, onOpen, onQuickAdd, wishlist, onToggleWish, label }) {
  const rail = useRef(null);
  const interactionUntil = useRef(0);
  const pause = () => { interactionUntil.current = performance.now() + 5000; };
  useEffect(() => {
    const node = rail.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame, previous = 0, position = node.scrollLeft, lastWritten = node.scrollLeft;
    const animate = now => {
      const elapsed = Math.min(now - (previous || now), 50);
      previous = now;
      const visible = node.getBoundingClientRect();
      const paused = motion.matches || document.hidden || visible.bottom < 0 || visible.top > window.innerHeight ||
        node.matches(':hover') || node.contains(document.activeElement) || now < interactionUntil.current;
      if (paused) {
        position = node.scrollLeft;
        lastWritten = position;
      } else if (node.scrollWidth > node.clientWidth + 1) {
        if (Math.abs(node.scrollLeft - lastWritten) > 1) position = node.scrollLeft;
        position += elapsed * .025;
        const end = node.scrollWidth - node.clientWidth;
        if (position >= end) { position = 0; interactionUntil.current = now + 1800; }
        node.scrollLeft = position;
        lastWritten = node.scrollLeft;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [items.length]);
  return <div className="product-rail" ref={rail} role="region" aria-label={label} tabIndex={0}
    onPointerDown={pause} onPointerUp={pause} onTouchMove={pause} onWheel={pause}>
    {items.map(product => <div className="product-rail-card" key={product.id}>
      <ProductCard product={product} onOpen={onOpen} onQuickAdd={onQuickAdd} isWished={wishlist.includes(product.id)} onToggleWish={onToggleWish} />
    </div>)}
  </div>;
}
