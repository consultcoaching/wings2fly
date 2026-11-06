export default function Start({ onAdem }) {
  return (
    <main className="start">
      <div className="circle-container start-circle">
        <button
          type="button"
          className="circle-btn"
          onClick={onAdem}
          aria-label="Adem nu: direct starten met ademhaling"
        >
          Adem nu
        </button>
      </div>
      <p className="hint">Eén tik om te kalmeren.</p>
    </main>
  );
}
