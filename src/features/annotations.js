import { dom, showToast, state } from '../lib/utils.js';

let drawMode = 'draw';
let drawing = false;
let lastPoint = null;
let resizeObserver = null;

function resizeCanvas() {
  const rect = dom.videoWrapper.getBoundingClientRect();
  dom.annotationCanvas.width = Math.max(1, Math.floor(rect.width));
  dom.annotationCanvas.height = Math.max(1, Math.floor(rect.height));
}

function getContext() {
  const context = dom.annotationCanvas.getContext('2d');
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = drawMode === 'erase' ? 16 : 4;
  context.strokeStyle = drawMode === 'erase' ? '#0b1020' : dom.drawColor.value;
  return context;
}

function pointerPosition(event) {
  const rect = dom.annotationCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function beginStroke(event) {
  if (!dom.annotationCanvas.classList.contains('is-active')) return;
  drawing = true;
  lastPoint = pointerPosition(event);
}

function moveStroke(event) {
  if (!drawing || !lastPoint) return;

  const nextPoint = pointerPosition(event);
  const context = getContext();
  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(nextPoint.x, nextPoint.y);
  context.stroke();
  lastPoint = nextPoint;
}

function endStroke() {
  drawing = false;
  lastPoint = null;
}

function toggleAnnotations() {
  if (state.currentRole !== 'host') {
    return;
  }

  const nextOpen = dom.annotationToolbar.classList.contains('hidden');
  dom.annotationToolbar.classList.toggle('hidden', !nextOpen);
  dom.annotationCanvas.classList.toggle('is-active', nextOpen);
  dom.btnToggleAnnotations.classList.toggle('is-active', nextOpen);

  if (nextOpen) {
    resizeCanvas();
    showToast('Annotations enabled for this browser session.', 'info');
  }
}

function setMode(mode) {
  drawMode = mode;
  dom.btnDrawMode.classList.toggle('is-active', mode === 'draw');
  dom.btnEraseMode.classList.toggle('is-active', mode === 'erase');
}

function clearCanvas() {
  const context = dom.annotationCanvas.getContext('2d');
  context.clearRect(0, 0, dom.annotationCanvas.width, dom.annotationCanvas.height);
}

export function initAnnotations() {
  dom.btnToggleAnnotations.addEventListener('click', toggleAnnotations);
  dom.btnDrawMode.addEventListener('click', () => setMode('draw'));
  dom.btnEraseMode.addEventListener('click', () => setMode('erase'));
  dom.btnClearCanvas.addEventListener('click', clearCanvas);
  dom.drawColor.addEventListener('input', () => setMode('draw'));
  dom.annotationCanvas.addEventListener('pointerdown', beginStroke);
  dom.annotationCanvas.addEventListener('pointermove', moveStroke);
  dom.annotationCanvas.addEventListener('pointerup', endStroke);
  dom.annotationCanvas.addEventListener('pointerleave', endStroke);

  resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(dom.videoWrapper);
  setMode('draw');
}
