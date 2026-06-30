import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  onChange: (dataUrl: string) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const emptyRef = useRef(true);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = wrapper.getBoundingClientRect();
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
      emptyRef.current = true;
      setHasSignature(false);
      onChange('');
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [onChange]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = pointFromEvent(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!drawingRef.current || !canvas || !context) return;
    const point = pointFromEvent(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    emptyRef.current = false;
    setHasSignature(true);
  }

  function stopDrawing(event?: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (event && canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (emptyRef.current || !canvas) {
      onChange('');
      return;
    }
    onChange(canvas.toDataURL('image/png'));
  }

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
          className="block h-full w-full touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
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
