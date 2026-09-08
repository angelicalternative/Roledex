import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Contact } from "../types";
import { colorForName, initials } from "../lib/colors";

interface Props {
  contacts: Contact[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onStep: (deltaSteps: number) => void;
}

const STEP_DEG = 34;
const WINDOW = 6;
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

export default function RotaryDial({ contacts, currentIndex, onSelect, onStep }: Props) {
  const total = contacts.length;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(120);
  const [dragStepOffset, setDragStepOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ active: false, centerX: 0, centerY: 0, startAngle: 0, lastAngle: 0, moved: false });
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

  const displayIndex = total === 0 ? 0 : currentIndex - dragStepOffset;
  const liveIndex = total === 0 ? 0 : ((Math.round(displayIndex) % total) + total) % total;
  const current = contacts[liveIndex];

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (total === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const startAngle = angleFromCenter(e.clientX, e.clientY, cx, cy);
    dragRef.current = { active: true, centerX: cx, centerY: cy, startAngle, lastAngle: startAngle, moved: false };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st.active) return;
    const angle = angleFromCenter(e.clientX, e.clientY, st.centerX, st.centerY);
    const totalDelta = shortestAngleDelta(st.startAngle, angle);
    if (!st.moved && Math.abs(totalDelta) > DRAG_TAP_THRESHOLD_DEG) {
      st.moved = true;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    st.lastAngle = angle;
    if (st.moved) {
      setDragStepOffset(totalDelta / STEP_DEG);
      e.preventDefault();
    }
  };

  const endDrag = () => {
    const st = dragRef.current;
    if (!st.active) return;
    st.active = false;
    setIsDragging(false);
    const totalDelta = shortestAngleDelta(st.startAngle, st.lastAngle);
    if (st.moved) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 300);
      // Rotating the physical dial clockwise (positive angle) brings lower-index
      // holes into the top slot, so the index delta is the negation of the drag.
      onStep(-Math.round(totalDelta / STEP_DEG));
    }
    setDragStepOffset(0);
  };

  const handleHoleClick = (index: number) => {
    if (suppressClickRef.current) return;
    onSelect(index);
  };

  const holes: { index: number; angleDeg: number; contact: Contact }[] = [];
  if (total > 0) {
    for (let i = 0; i < total; i++) {
      let diff = i - displayIndex;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      if (Math.abs(diff) <= WINDOW) holes.push({ index: i, angleDeg: -90 + diff * STEP_DEG, contact: contacts[i] });
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
        {holes.map(({ index, angleDeg, contact }) => {
          const dist = Math.min(Math.abs(shortestAngleDelta(-90, angleDeg)), 180);
          const opacity = Math.max(0, 1 - dist / 150);
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
                style={{ background: `linear-gradient(160deg, ${color}, ${color}cc)` }}
                onClick={() => handleHoleClick(index)}
                aria-label={`${contact.firstName} ${contact.lastName}`.trim()}
                tabIndex={isFront ? 0 : -1}
              >
                {initials(contact.firstName, contact.lastName)}
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
