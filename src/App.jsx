import VideoPlayer from './VideoPlayer.jsx';
import { Icon } from './icons.jsx';

/*
  Cómo se elige el video (por la URL de la página):

    ?v=carpeta/video.mp4       -> usa VITE_R2_BASE_URL + "/carpeta/video.mp4"
    ?src=https://.../video.mp4 -> usa la URL completa tal cual
    &t=Título del video        -> (opcional) título que se muestra arriba
    &back=https://...          -> (opcional) a dónde lleva el botón "Volver"
*/
const R2_BASE = (import.meta.env.VITE_R2_BASE_URL || '').replace(/\/+$/, '');

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const src = params.get('src');
  const v = params.get('v');
  let url = '';

  if (src) url = src;
  else if (v && R2_BASE) {
    const path = v.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
    url = `${R2_BASE}/${path}`;
  }

  return { url, title: params.get('t') || '', back: params.get('back') || '' };
}

function goBack(backUrl) {
  if (backUrl) {
    window.location.href = backUrl;
  } else if (window.history.length > 1) {
    window.history.back();
  } else {
    // Si el video se abrió en una pestaña nueva, la cierra y el alumno vuelve al libro
    window.close();
  }
}

export default function App() {
  const { url, title, back } = readParams();

  return (
    <div className="app">
      <div className="bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <header className="header">
        <button className="back-btn" onClick={() => goBack(back)}>
          <Icon name="back" />
          <span>Volver</span>
        </button>
        {title && <h1 className="title">{title}</h1>}
      </header>

      <main className="stage">
        {url ? (
          <VideoPlayer src={url} />
        ) : (
          <div className="empty">
            <p>No se indicó ningún video.</p>
            <code>?v=carpeta/nombre-del-video.mp4</code>
          </div>
        )}
      </main>
    </div>
  );
}
