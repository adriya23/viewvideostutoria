import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export default function VideoPlayer({ src }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimer = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const v = () => videoRef.current;

  /* ---------- acciones ---------- */
  const togglePlay = useCallback(() => {
    const video = v();
    if (!video) return;
    if (video.paused || video.ended) video.play().catch(() => {});
    else video.pause();
  }, []);

  const seekTo = (time) => {
    const video = v();
    if (!video || !duration) return;
    video.currentTime = Math.min(Math.max(time, 0), duration);
  };

  const skip = useCallback((secs) => {
    const video = v();
    if (!video || !video.duration) return;
    video.currentTime = Math.min(Math.max(video.currentTime + secs, 0), video.duration);
  }, []);

  const changeVolume = useCallback((value) => {
    const video = v();
    if (!video) return;
    const vol = Math.min(Math.max(value, 0), 1);
    video.volume = vol;
    video.muted = vol === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = v();
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.5;
    } else {
      video.muted = true;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const wrap = wrapRef.current;
    const video = v();
    const doc = document;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;

    if (isFs) {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    } else if (wrap.requestFullscreen || wrap.webkitRequestFullscreen) {
      (wrap.requestFullscreen || wrap.webkitRequestFullscreen).call(wrap);
    } else if (video?.webkitEnterFullscreen) {
      // iPhone: solo permite pantalla completa del propio <video>
      video.webkitEnterFullscreen();
    }
  }, []);

  /* ---------- ocultar controles automáticamente ---------- */
  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2500);
  }, []);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else revealControls();
  }, [playing, revealControls]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  /* ---------- estado de pantalla completa ---------- */
  useEffect(() => {
    const onFs = () =>
      setFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  /* ---------- atajos de teclado ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
      const video = v();
      if (!video) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault(); togglePlay(); break;
        case 'f':
          toggleFullscreen(); break;
        case 'm':
          toggleMute(); break;
        case 'ArrowUp':
          e.preventDefault(); changeVolume(video.volume + 0.1); break;
        case 'ArrowDown':
          e.preventDefault(); changeVolume(video.volume - 0.1); break;
        case 'ArrowRight':
          e.preventDefault(); skip(10); break;
        case 'ArrowLeft':
          e.preventDefault(); skip(-10); break;
        default: return;
      }
      revealControls();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleFullscreen, toggleMute, changeVolume, skip, revealControls]);

  /* ---------- reiniciar si cambia el video ---------- */
  useEffect(() => {
    setError(false);
    setLoading(true);
    setStarted(false);
    setCurrent(0);
    setBuffered(0);
  }, [src]);

  const onProgress = () => {
    const video = v();
    if (video?.buffered.length && video.duration) {
      setBuffered(video.buffered.end(video.buffered.length - 1) / video.duration);
    }
  };

  const effectiveVolume = muted ? 0 : volume;
  const volumeIcon = effectiveVolume === 0 ? 'volumeOff' : effectiveVolume < 0.5 ? 'volumeLow' : 'volumeHigh';
  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`player ${showControls ? 'show-controls' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => { setPlaying(true); setStarted(true); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); setLoading(false); }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onProgress={onProgress}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
        onError={() => { setError(true); setLoading(false); }}
      />

      {/* Botón grande central antes de empezar / en pausa */}
      {!playing && !error && !loading && (
        <button className="big-play" onClick={togglePlay} aria-label="Reproducir">
          <Icon name="play" />
        </button>
      )}

      {loading && !error && <div className="spinner" aria-label="Cargando" />}

      {error && (
        <div className="error">
          <p>No se pudo cargar el video.</p>
          <small>Revisa tu conexión o vuelve a intentarlo más tarde.</small>
        </div>
      )}

      {/* Barra de controles */}
      <div className={`controls ${started ? '' : 'pre-start'}`}>
        <div className="seek-wrap">
          <div className="seek-buffer" style={{ width: `${buffered * 100}%` }} />
          <input
            type="range"
            className="seek"
            min={0}
            max={duration || 0}
            step="0.1"
            value={current}
            onChange={(e) => seekTo(Number(e.target.value))}
            style={{ '--fill': `${progress}%` }}
            aria-label="Progreso del video"
          />
        </div>

        <div className="bar">
          <button className="ctrl" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            <Icon name={playing ? 'pause' : 'play'} />
          </button>

          <button className="ctrl" onClick={() => skip(-10)} aria-label="Retroceder 10 segundos" title="Retroceder 10 s">
            <Icon name="rewind10" />
          </button>
          <button className="ctrl" onClick={() => skip(10)} aria-label="Adelantar 10 segundos" title="Adelantar 10 s">
            <Icon name="forward10" />
          </button>

          <div className="volume">
            <button className="ctrl" onClick={toggleMute} aria-label={effectiveVolume === 0 ? 'Activar sonido' : 'Silenciar'}>
              <Icon name={volumeIcon} />
            </button>
            <input
              type="range"
              className="volume-slider"
              min={0}
              max={1}
              step="0.01"
              value={effectiveVolume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              style={{ '--fill': `${effectiveVolume * 100}%` }}
              aria-label="Volumen"
            />
          </div>

          <span className="time">
            {formatTime(current)} <span className="sep">/</span> <span className="total">{formatTime(duration)}</span>
          </span>

          <div className="spacer" />

          <button
            className="ctrl"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            <Icon name={fullscreen ? 'minimize' : 'maximize'} />
          </button>
        </div>
      </div>
    </div>
  );
}
