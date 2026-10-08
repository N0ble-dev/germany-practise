import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-panel">
      <h1>This page took a wrong turn.</h1>
      <p>Your learning journey is still right here.</p>
      <Link className="button button-primary" href="/">
        Back to today
      </Link>
    </div>
  );
}
