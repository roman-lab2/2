import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="container empty-page">
      <span className="eyebrow">404 / ПОВОРОТ НЕ ТУДА</span>
      <h1>
        Вернёмся
        <br />
        <em>на маршрут.</em>
      </h1>
      <p>Этой страницы нет. Главная и запись всегда рядом.</p>
      <Link className="button button-gold" href="/">
        На главную →
      </Link>
    </main>
  );
}
