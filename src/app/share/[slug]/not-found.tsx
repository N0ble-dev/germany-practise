import Link from "next/link";
export default function SharedCardNotFound() {
  return (
    <section className="panel">
      <h1>This card is no longer shared.</h1>
      <p>The owner may have turned sharing off, or this link is incomplete.</p>
      <Link className="button button-primary" href="/signup">
        Start your German journey
      </Link>
    </section>
  );
}
