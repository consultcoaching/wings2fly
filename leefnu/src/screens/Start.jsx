export default function Start({ onAdem }) {
  return (
    <main className="start">
      <span className="badge">Standalone modus</span>
      <div className="circle-container start-circle">
        <button
          type="button"
          className="circle-btn"
          onClick={onAdem}
          aria-label="Direct starten met ademhaling"
        >
          Adem nu
        </button>
      </div>
      <p className="hint">Eén tik om het zenuwstelsel te kalmeren.</p>
    </main>
  );
}
