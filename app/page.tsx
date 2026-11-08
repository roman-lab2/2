import Link from "next/link";
import { Icon } from "@/components/icon";
import { CTA, ServiceGrid } from "@/components/sections";

export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-content">
            <p className="hero-kicker">AUTERA · МОСКВА</p>
            <h1>
              <span>Обслуживание</span>
              <span>и ремонт</span>
              <span>автомобилей</span>
            </h1>
            <p>Диагностика, плановое ТО и ремонт легковых автомобилей.</p>
            <div className="hero-actions">
              <Link href="/booking/" className="button button-primary">
                Записаться <Icon name="arrow" size={19} />
              </Link>
              <Link href="/services/" className="text-link">
                Услуги и цены <Icon name="arrow" size={18} />
              </Link>
            </div>
            <div className="hero-note">
              <Icon name="clock" size={17} />
              <span>Ежедневно, 09:00–19:00</span>
              <span className="note-divider" />
              <span>Без регистрации</span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              className="hero-image"
              src="/images/hero-moscow.webp"
              alt="Серый спортивный автомобиль на набережной в Москве"
              fetchPriority="high"
              width={1536}
              height={1024}
            />
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <h2>Услуги автосервиса</h2>
            <p className="section-description">
              Выберите нужные работы. Если не знаете причину неисправности,
              начните с диагностики.
            </p>
          </div>
          <Link href="/services/" className="text-link">
            Подробнее об услугах <Icon name="arrow" size={17} />
          </Link>
        </div>
        <ServiceGrid />
        <p className="price-note">
          Демо-прайс. Указана стоимость работ без запчастей. Итоговая цена —
          после осмотра.
        </p>
      </section>
      <section className="approach section">
        <div className="container approach-grid">
          <div className="approach-photo">
            <img
              src="/images/workshop.jpg"
              alt="Детали двигателя автомобиля"
              loading="lazy"
              width={1100}
              height={619}
            />
          </div>
          <div className="approach-content">
            <h2>Как проходит обслуживание</h2>
            <p className="lead">
              Работы и стоимость обсуждаем до начала ремонта.
            </p>
            <div className="approach-list">
              {[
                [
                  "Осмотр автомобиля",
                  "Вы рассказываете, что беспокоит. Мы проверяем автомобиль и уточняем причину.",
                ],
                [
                  "Согласование работ",
                  "Обсуждаем, что нужно сделать, сколько это стоит и когда можно забрать автомобиль.",
                ],
                [
                  "Ремонт и выдача",
                  "Выполняем согласованные работы, объясняем результат и рекомендации.",
                ],
              ].map(([title, text]) => (
                <div key={title}>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <CTA />
    </main>
  );
}
