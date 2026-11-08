import Link from "next/link";
import { Icon } from "./icon";
import { money, services } from "@/lib/catalog";
export function ServiceGrid({ full = false }: { full?: boolean }) {
  return (
    <div className="service-grid">
      {services.map((s) => (
        <Link
          href={"/booking/?service=" + s.id}
          className="service-card"
          key={s.id}
        >
          <div className="service-card-top">
            <span className="service-icon">
              <Icon name={s.icon} size={30} />
            </span>
            <span className="card-number">/{s.number}</span>
          </div>
          <h3>{s.name}</h3>
          <p>{full ? s.description : s.subtitle}</p>
          {full && (
            <ul className="task-list">
              {s.tasks.map((task) => (
                <li key={task}>
                  <Icon name="check" size={15} />
                  {task}
                </li>
              ))}
            </ul>
          )}
          <div className="service-card-bottom">
            <span>
              от <strong>{money(s.price)} ₽</strong>
            </span>
            <span className="round-arrow">
              <Icon name="diagonal" size={18} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
export function CTA() {
  return (
    <section className="container section cta-wrap">
      <div className="cta">
        <div>
          <span className="eyebrow">НАЧНЁМ СО ЗНАКОМСТВА</span>
          <h2>
            Ваш следующий
            <br />
            маршрут — <em>без забот.</em>
          </h2>
          <p>
            Выберите услугу и удобное время.
            <br />
            Всё остальное обсудим на месте.
          </p>
        </div>
        <Link className="button button-gold" href="/booking/">
          Выбрать время <Icon name="diagonal" size={18} />
        </Link>
        <span className="cta-watermark" aria-hidden="true">
          A
        </span>
      </div>
    </section>
  );
}
export function PageIntro({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container page-intro">
      <div className="breadcrumb">
        <Link href="/">Главная</Link>
        <span>/</span>
        <span>{eyebrow}</span>
      </div>
      <span className="eyebrow">AUTERA / {eyebrow}</span>
      <h1>
        {title}
        <br />
        <em>{accent}</em>
      </h1>
      <p>{children}</p>
    </div>
  );
}
