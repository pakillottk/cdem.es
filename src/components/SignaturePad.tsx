import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  onChange: (dataUrl: string) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const emptyRef = useRef(true);
  const onChangeRef = useRef(onChange);
  const [hasSignature, setHasSignature] = useState(false);

  onChangeRef.current = onChange;

  function emitChange() {
    const canvas = canvasRef.current;
    if (!canvas || emptyRef.current) {
      onChangeRef.current('');
      return;
    }
    onChangeRef.current(canvas.toDataURL('image/png'));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = wrapper.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;

      const previous = emptyRef.current ? null : canvas.toDataURL('image/png');

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 2.5;
      context.strokeStyle = '#111111';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);

      if (!previous) {
        emptyRef.current = true;
        setHasSignature(false);
        onChangeRef.current('');
        return;
      }

      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, width, height);
        emptyRef.current = false;
        setHasSignature(true);
        emitChange();
      };
      image.src = previous;
    };

    const pointFromPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const pointFromTouch = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startStroke = (point: { x: number; y: number }) => {
      drawingRef.current = true;
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(point.x + 0.1, point.y + 0.1);
      context.stroke();
      emptyRef.current = false;
      setHasSignature(true);
    };

    const continueStroke = (point: { x: number; y: number }) => {
      if (!drawingRef.current) return;
      context.lineTo(point.x, point.y);
      context.stroke();
      emptyRef.current = false;
      setHasSignature(true);
    };

    const endStroke = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      emitChange();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      event.preventDefault();
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // ponytail: algunos WebViews iOS rechazan capture; window pointermove cubre el trazo
      }
      startStroke(pointFromPointer(event));
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !drawingRef.current) return;
      event.preventDefault();
      continueStroke(pointFromPointer(event));
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      endStroke();
    };

    const onTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      if (!touch) return;
      startStroke(pointFromTouch(touch));
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!drawingRef.current) return;
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch) return;
      continueStroke(pointFromTouch(touch));
    };

    const onTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      endStroke();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);

    const passiveFalse = { passive: false } as const;
    canvas.addEventListener('touchstart', onTouchStart, passiveFalse);
    canvas.addEventListener('touchmove', onTouchMove, passiveFalse);
    canvas.addEventListener('touchend', onTouchEnd, passiveFalse);
    canvas.addEventListener('touchcancel', onTouchEnd, passiveFalse);
    canvas.addEventListener('pointerdown', onPointerDown, passiveFalse);
    canvas.addEventListener('pointermove', onPointerMove, passiveFalse);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointerleave', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointerleave', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
    };
  }, []);

  function clearSignature() {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !wrapper || !context) return;
    const { width, height } = wrapper.getBoundingClientRect();
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    emptyRef.current = true;
    setHasSignature(false);
    onChange('');
  }

  return (
    <div className="space-y-3">
      <div
        ref={wrapperRef}
        className="h-52 rounded-md border border-dashed border-black/30 bg-white overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none select-none"
          style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-black/55">
          Firma dentro del recuadro con dedo o ratón.
        </p>
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-full border border-black px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-black transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          {hasSignature ? 'Borrar firma' : 'Limpiar'}
        </button>
      </div>
    </div>
  );
}
