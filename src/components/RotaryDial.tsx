import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Contact } from "../types";
import { colorForName, initials } from "../lib/colors";

interface Props {
  contacts: Contact[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onStep: (deltaSteps: number) => void;
}

// A real rotary dial only has room for about 10 holes. It's one physical
// ring: contacts smoothly enter and exit near the back of the dial (behind
// the finger stop) as you spin past them, rather than the ring ever paging
// or reloading.
const MAX_HOLES = 10;
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

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
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
  const liveIndex = total === 0 ? 0 : ((Math.round(displayIndex) % total) + total) % total;
  const current = contacts[liveIndex];

  // The ring always shows the same fixed number of evenly-spaced holes
  // (fewer if the address book itself is smaller), however many contacts
  // there are in total.
  const holeCount = Math.min(total, MAX_HOLES);
  const angleStep = holeCount > 0 ? 360 / holeCount : 36;
  const lowOffset = -Math.floor(holeCount / 2);
  const highOffset = Math.ceil(holeCount / 2) - 1;

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

  const holes: { index: number; angleDeg: number; opacity: number; contact: Contact }[] = [];
  if (total > 0) {
    for (let i = 0; i < total; i++) {
      let diff = i - displayIndex;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      if (diff >= lowOffset - 1 && diff <= highOffset + 1) {
        // Fade a hole out over the last step before it exits the ring, so
        // contacts dissolve in and out near the back instead of popping.
        const opacity = clamp01(1 - Math.max(0, diff - highOffset) - Math.max(0, lowOffset - diff));
        holes.push({ index: i, angleDeg: -90 + diff * angleStep, opacity, contact: contacts[i] });
      }
    }
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
        {holes.map(({ index, angleDeg, opacity, contact }) => {
          const isFront = index === liveIndex;
          const color = contact.color || colorForName(contact.firstName + contact.lastName);
          return (
            <div
              key={contact.id}
              className="dial-hole-orbit"
              style={{ transform: `rotate(${angleDeg}deg) translate(${radius}px) rotate(${-angleDeg}deg)`, opacity }}
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
    </div>
  );
}
