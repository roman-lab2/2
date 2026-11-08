import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="container empty-page">
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или перейдите на главную.</p>
      <Link className="button button-gold" href="/">
        На главную →
      </Link>
    </main>
  );
}
