import Link from "next/link";
import { Icon } from "./icon";
import { money, services } from "@/lib/catalog";

export function ServiceGrid({ full = false }: { full?: boolean }) {
  return (
    <div
      className={full ? "service-grid" : "service-grid service-grid-compact"}
    >
      {services.map((s) => (
        <Link
          href={"/booking/?service=" + s.id}
          className="service-card"
          key={s.id}
        >
          <div className="service-card-top">
            <span className="service-icon">
              <Icon name={s.icon} size={28} />
            </span>
          </div>
          <div className="service-card-description">
            <h3>{s.name}</h3>
            <p>{full ? s.description : s.subtitle}</p>
          </div>
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
            <Icon name="arrow" size={18} />
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
          <h2>Запись на сервис</h2>
          <p>
            Выберите услугу, дату и свободное время.
            <br className="desktop-break" /> Запись займёт несколько минут.
          </p>
        </div>
        <Link className="button button-gold" href="/booking/">
          Выбрать время <Icon name="arrow" size={18} />
        </Link>
      </div>
    </section>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container page-intro">
      <div className="breadcrumb">
        <Link href="/">Главная</Link>
        <span>/</span>
        <span>{eyebrow}</span>
      </div>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}
