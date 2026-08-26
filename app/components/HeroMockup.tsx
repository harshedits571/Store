'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore } from '../context/StoreContext';

/**
 * HeroMockup — 3D Convex Arch Carousel
 */
export default function HeroMockup() {
  const { products } = useStore();

  const wrapRef   = useRef<HTMLDivElement>(null);
  const trackRef  = useRef<HTMLDivElement>(null);
  const cardRefs  = useRef<(HTMLDivElement | null)[]>([]);

  const posRef         = useRef(0);
  const velocityRef    = useRef(0);
  const isDraggingRef  = useRef(false);
  const didDragRef     = useRef(false);
  const dragStartX     = useRef(0);
  const dragStartPos   = useRef(0);
  const lastX          = useRef(0);
  const lastTime       = useRef(0);
  const isHoveredRef   = useRef(false);
  const rafRef         = useRef(0);

  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing'>('grab');

  /* ── Card Dimensions ── */
  const CARD_WIDTH  = 250;
  const CARD_HEIGHT = 250;
  const GAP         = 10;
  const STEP        = CARD_WIDTH + GAP;
  const AUTO_SPEED  = 0.55;

  /* ── Product Items ── */
  const items = products
    .filter(p => {
      const src = p.imageUrls?.[0] || p.imageUrl || '';
      return src.trim() !== '';
    })
    .map(p => ({
      id:   p.id,
      name: p.name,
      src:  p.imageUrls?.[0] || p.imageUrl || '',
    }));

  const loopItems = items.length > 0
    ? [...items, ...items, ...items, ...items, ...items]
    : Array.from({ length: 25 }, (_, i) => ({ id: `sk-${i}`, name: '', src: '' }));

  const singleSetW = items.length > 0 ? STEP * items.length : STEP * 5;

  /* ── Center on mount ── */
  useEffect(() => {
    if (wrapRef.current && items.length > 0) {
      const stageCenter = wrapRef.current.offsetWidth / 2;
      const centerIdx   = Math.floor(loopItems.length / 2);
      posRef.current    = stageCenter - (centerIdx * STEP + CARD_WIDTH / 2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  /* ── RAF Animation Loop ── */
  useEffect(() => {
    const wrap  = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const tick = () => {
      if (!isDraggingRef.current) {
        if (Math.abs(velocityRef.current) > 0.05) {
          posRef.current    += velocityRef.current;
          velocityRef.current *= 0.93;
        } else {
          velocityRef.current = 0;
          if (!isHoveredRef.current) posRef.current -= AUTO_SPEED;
        }

        /* Infinite wrap */
        const totalW = singleSetW * 5;
        if (posRef.current > 0)
          posRef.current -= singleSetW * 2;
        else if (Math.abs(posRef.current) > totalW - wrap.offsetWidth)
          posRef.current += singleSetW * 2;
      }

      track.style.transform = `translateX(${posRef.current}px)`;

      const stageCenter = wrap.offsetWidth / 2;

      cardRefs.current.forEach((card, i) => {
        if (!card) return;

        const cardLeft   = posRef.current + i * STEP;
        const cardCenter = cardLeft + CARD_WIDTH / 2;
        const dist       = cardCenter - stageCenter;
        const norm       = dist / (CARD_WIDTH * 1.05);
        const clamped    = Math.max(-4, Math.min(4, norm));
        const absC       = Math.abs(clamped);

        /* ── Convex 3D Cylinder Arch ── */
        const translateY = Math.pow(clamped, 2) * 10.5;
        const rotateZ    = clamped * 4.6;
        const rotateY    = clamped * -11.5;
        const translateZ = -Math.pow(clamped, 2) * 22;
        const scale      = 1 - absC * 0.025;
        const brightness = 1 - absC * 0.10;
        const zIndex     = 100 - Math.round(absC * 20);

        card.style.transform = `perspective(1200px) translateY(${translateY}px) translateZ(${translateZ}px) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg) scale(${scale})`;
        card.style.filter    = `brightness(${Math.max(0.75, brightness)})`;
        card.style.zIndex    = String(Math.max(1, zIndex));
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [singleSetW, STEP, CARD_WIDTH, AUTO_SPEED]);

  /* ── Drag handlers ── */
  const onDragStart = (clientX: number) => {
    isDraggingRef.current = true;
    didDragRef.current    = false;
    dragStartX.current    = clientX;
    dragStartPos.current  = posRef.current;
    lastX.current         = clientX;
    lastTime.current      = performance.now();
    velocityRef.current   = 0;
    setCursorStyle('grabbing');
  };

  const onDragMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - dragStartX.current;
    if (Math.abs(deltaX) > 6) didDragRef.current = true;
    posRef.current = dragStartPos.current + deltaX;
    const now = performance.now();
    const dt  = now - lastTime.current;
    if (dt > 0) velocityRef.current = ((clientX - lastX.current) / dt) * 16;
    lastX.current    = clientX;
    lastTime.current = now;
  };

  const onDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setCursorStyle('grab');
  };

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; onDragEnd(); }}
      onMouseDown={(e) => onDragStart(e.clientX)}
      onMouseMove={(e) => onDragMove(e.clientX)}
      onMouseUp={onDragEnd}
      onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
      onTouchEnd={onDragEnd}
      style={{
        width: '100%',
        overflow: 'hidden',
        padding: '30px 0 140px',
        margin: '0 0 -80px 0',
        position: 'relative',
        cursor: cursorStyle,
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px',
        height: '280px',
        background: 'radial-gradient(circle, rgba(0,113,227,0.08) 0%, rgba(168,85,247,0.05) 45%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Scrolling track */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: `${GAP}px`,
          willChange: 'transform',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {loopItems.map((item, i) => {
          const isReal = item.id && !item.id.startsWith('sk-');

          const cardEl = (
            <div
              ref={el => { cardRefs.current[i] = el; }}
              style={{
                flexShrink: 0,
                width:  `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                borderRadius: '18px',
                overflow: 'hidden',
                position: 'relative',
                background: 'linear-gradient(145deg, #18191c, #101114)',
                boxShadow: '0 18px 36px -8px rgba(0,0,0,0.35), 0 8px 16px -4px rgba(0,0,0,0.2)',
                transformOrigin: '50% 50%',
                willChange: 'transform, filter',
                cursor: isReal ? 'pointer' : 'default',
              }}
            >
              {item.src ? (
                <>
                  <img
                    src={item.src}
                    alt={item.name}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {/* Bottom name label inside card */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 40%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '10px 12px',
                    pointerEvents: 'none',
                  }}>
                    <p style={{
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                      textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                    }}>
                      {item.name}
                    </p>
                  </div>
                </>
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite linear',
                }} />
              )}
            </div>
          );

          if (isReal) {
            return (
              <Link
                key={`link-${item.id}-${i}`}
                href={`/products/${item.id}`}
                onClick={(e) => {
                  if (didDragRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                style={{ display: 'block', textDecoration: 'none', flexShrink: 0, outline: 'none' }}
              >
                {cardEl}
              </Link>
            );
          }

          return <div key={`sk-${i}`} style={{ flexShrink: 0 }}>{cardEl}</div>;
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
