"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-panel">
      <h1>We could not open this practice.</h1>
      <p>Try opening it again. Your saved vocabulary stays in your browser.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
