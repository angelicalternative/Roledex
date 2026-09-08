import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Contact } from "../types";
import { colorForName, initials } from "../lib/colors";

interface Props {
  contacts: Contact[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onStep: (deltaSteps: number) => void;
}

// A real rotary dial only has room for 10 holes, so once the address book has
// more contacts than that, the physical ring is reused in pages of 10 — spin
// past the last hole in a page and the whole ring reloads with the next batch.
const PAGE_SIZE = 10;
const DRAG_TAP_THRESHOLD_DEG = 3;

function angleFromCenter(clientX: number, clientY: number, cx: number, cy: number): number {
  return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function wrap(n: number, mod: number): number {
  return ((n % mod) + mod) % mod;
}

export default function RotaryDial({ contacts, currentIndex, onSelect, onStep }: Props) {
  const total = contacts.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(120);
  const [dragStepOffset, setDragStepOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ active: false, centerX: 0, centerY: 0, lastAngle: 0, accumulatedDeg: 0, moved: false, degPerStep: 36 });
  const suppressClickRef = useRef(false);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const size = Math.min(el.clientWidth, el.clientHeight);
      if (size > 0) setRadius(size / 2 - size * 0.15);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // displayIndex is a continuous (fractional while dragging) position in the
  // full contact list; liveIndex is the nearest whole contact it rests on.
  const displayIndex = total === 0 ? 0 : currentIndex - dragStepOffset;
  const wrappedDisplay = total === 0 ? 0 : wrap(displayIndex, total);
  const liveIndex = total === 0 ? 0 : Math.round(wrappedDisplay) % total;
  const current = contacts[liveIndex];

  // Which page of (at most) 10 contacts is currently loaded onto the physical
  // ring, and how the holes in that page are spaced around the full circle.
  const pageCount = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);
  const page = total === 0 ? 0 : Math.min(Math.floor(Math.round(wrappedDisplay) / PAGE_SIZE), pageCount - 1);
  const pageStart = page * PAGE_SIZE;
  const pageSize = total === 0 ? 0 : Math.min(PAGE_SIZE, total - pageStart);
  const angleStep = pageSize > 0 ? 360 / pageSize : 36;
  const localDisplay = wrappedDisplay - pageStart;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (total === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = angleFromCenter(e.clientX, e.clientY, cx, cy);
    dragRef.current = { active: true, centerX: cx, centerY: cy, lastAngle: startAngle, accumulatedDeg: 0, moved: false, degPerStep: angleStep };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st.active) return;
    const angle = angleFromCenter(e.clientX, e.clientY, st.centerX, st.centerY);
    // Accumulate the small step-to-step delta rather than diffing against the
    // drag's start angle, so a continuous spin past 180° keeps counting in the
    // same direction instead of collapsing to the "short way around".
    st.accumulatedDeg += shortestAngleDelta(st.lastAngle, angle);
    st.lastAngle = angle;
    if (!st.moved && Math.abs(st.accumulatedDeg) > DRAG_TAP_THRESHOLD_DEG) {
      st.moved = true;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (st.moved) {
      setDragStepOffset(st.accumulatedDeg / st.degPerStep);
      e.preventDefault();
    }
  };

  const endDrag = () => {
    const st = dragRef.current;
    if (!st.active) return;
    st.active = false;
    setIsDragging(false);
    if (st.moved) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 300);
      // Rotating the physical dial clockwise (positive angle) brings lower-index
      // holes into the top slot, so the index delta is the negation of the drag.
      onStep(-Math.round(st.accumulatedDeg / st.degPerStep));
    }
    setDragStepOffset(0);
  };

  const handleHoleClick = (index: number) => {
    if (suppressClickRef.current) return;
    onSelect(index);
  };

  const holes: { index: number; angleDeg: number; contact: Contact }[] = [];
  for (let i = pageStart; i < pageStart + pageSize; i++) {
    let diff = i - pageStart - localDisplay;
    if (diff > pageSize / 2) diff -= pageSize;
    if (diff < -pageSize / 2) diff += pageSize;
    holes.push({ index: i, angleDeg: -90 + diff * angleStep, contact: contacts[i] });
  }

  return (
    <div className="dial-wrap" ref={wrapRef}>
      <div
        className={`dial-frame ${isDragging ? "dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="dial-stop" aria-hidden="true" />
        {holes.map(({ index, angleDeg, contact }) => {
          const isFront = index === liveIndex;
          const color = contact.color || colorForName(contact.firstName + contact.lastName);
          return (
            <div
              key={index}
              className="dial-hole-orbit"
              style={{ transform: `rotate(${angleDeg}deg) translate(${radius}px) rotate(${-angleDeg}deg)` }}
            >
              <button
                type="button"
                className={`dial-hole ${isFront ? "front" : ""}`}
                onClick={() => handleHoleClick(index)}
                aria-label={`${contact.firstName} ${contact.lastName}`.trim()}
                tabIndex={isFront ? 0 : -1}
              >
                {initials(contact.firstName, contact.lastName)}
                <span className="dial-hole-dot" style={{ background: color }} aria-hidden="true" />
              </button>
            </div>
          );
        })}

        <div className="dial-center">
          {current ? (
            <>
              <span className="dial-center-name">
                {[current.firstName, current.lastName].filter(Boolean).join(" ") || "Unnamed"}
              </span>
              {(current.title || current.company) && (
                <span className="dial-center-role">
                  {current.title}
                  {current.title && current.company ? " · " : ""}
                  {current.company}
                </span>
              )}
              {current.isDinnerGuest && (
                <span className="dial-center-badge" title="Dinner club guest">
                  🍽
                </span>
              )}
            </>
          ) : (
            <span className="dial-center-name dim">No contacts</span>
          )}
        </div>
      </div>

      {pageCount > 1 && (
        <div className="dial-page-dots" aria-hidden="true">
          {Array.from({ length: pageCount }).map((_, i) => (
            <span key={i} className={`dial-page-dot ${i === page ? "active" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
