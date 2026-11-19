/** Joystick táctil virtual y control analógico móvil */
import { h } from './dom';

export interface JoystickCallbacks {
  onMove(dir: { left: boolean; right: boolean; up: boolean; down: boolean; x: number; y: number }): void;
}

export function createVirtualJoystick(container: HTMLElement, cb: JoystickCallbacks): { el: HTMLElement; destroy(): void } {
  const base = h('div', { class: 'v-joy-base' });
  const stick = h('div', { class: 'v-joy-stick' });
  const arrows = h('div', { class: 'v-joy-arrows' },
    h('span', { class: 'v-arr l' }, '◀'),
    h('span', { class: 'v-arr r' }, '▶')
  );
  base.append(stick, arrows);

  let activePointerId: number | null = null;
  let baseRect: DOMRect | null = null;
  const maxRadius = 38; // radio máximo de desplazamiento en píxeles

  function updateTouch(clientX: number, clientY: number): void {
    if (!baseRect) baseRect = base.getBoundingClientRect();
    const centerX = baseRect.left + baseRect.width / 2;
    const centerY = baseRect.top + baseRect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    stick.style.transform = `translate(${stickX}px, ${stickY}px)`;

    const normX = clampedDist > 0 ? (stickX / maxRadius) : 0;
    const normY = clampedDist > 0 ? (stickY / maxRadius) : 0;

    const deadZone = 0.22;
    const isLeft = normX < -deadZone;
    const isRight = normX > deadZone;
    const isUp = normY < -0.45;
    const isDown = normY > 0.45;

    base.classList.toggle('push-l', isLeft);
    base.classList.toggle('push-r', isRight);

    cb.onMove({ left: isLeft, right: isRight, up: isUp, down: isDown, x: normX, y: normY });
  }

  function onPointerDown(e: PointerEvent): void {
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    baseRect = base.getBoundingClientRect();
    base.classList.add('active');
    base.setPointerCapture(e.pointerId);
    updateTouch(e.clientX, e.clientY);
  }

  function onPointerMove(e: PointerEvent): void {
    if (e.pointerId !== activePointerId) return;
    updateTouch(e.clientX, e.clientY);
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    base.classList.remove('active', 'push-l', 'push-r');
    stick.style.transform = 'translate(0px, 0px)';
    cb.onMove({ left: false, right: false, up: false, down: false, x: 0, y: 0 });
  }

  base.addEventListener('pointerdown', onPointerDown);
  base.addEventListener('pointermove', onPointerMove);
  base.addEventListener('pointerup', onPointerUp);
  base.addEventListener('pointercancel', onPointerUp);
  base.addEventListener('contextmenu', e => e.preventDefault());

  container.append(base);

  return {
    el: base,
    destroy() {
      base.remove();
    }
  };
}
