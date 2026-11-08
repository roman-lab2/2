import Link from "next/link";
import { Icon } from "@/components/icon";
import { CTA, ServiceGrid } from "@/components/sections";
export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <img
          className="hero-image"
          src="/images/hero.jpg"
          alt="Спортивный автомобиль на дороге"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="container hero-content">
          <div className="hero-kicker">
            <span className="status-dot" /> ВНИМАНИЕ К АВТО. УВАЖЕНИЕ К ВАМ.
          </div>
          <h1>
            Сервис, которому
            <br />
            доверяют <em>движение.</em>
          </h1>
          <p>
            Диагностика, обслуживание и ремонт.
            <br />
            Понятно о сложном. Внимательно к деталям.
          </p>
          <div className="hero-actions">
            <Link href="/booking/" className="button button-gold">
              Записаться на сервис <Icon name="diagonal" size={20} />
            </Link>
            <Link href="/services/" className="text-link">
              Наши услуги <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className="hero-note">
            <Icon name="pin" size={16} />
            <span>МОСКВА</span>
            <span className="note-divider" />
            <span>ВСЕ МАРКИ. ОДИН ПОДХОД.</span>
          </div>
        </div>
        <div className="hero-caption">
          <span>01 / AUTERA EXPERIENCE</span>
          <span>С ЗАБОТОЙ О КАЖДОМ КИЛОМЕТРЕ</span>
        </div>
      </section>
      <section className="promise-strip">
        <div className="container promise-grid">
          {[
            {
              icon: "scan",
              title: "Сначала — разобраться",
              text: "Диагностика перед решениями",
            },
            {
              icon: "shield",
              title: "Стоимость — заранее",
              text: "Работы после согласования",
            },
            {
              icon: "calendar",
              title: "Ваше время имеет значение",
              text: "Онлайн-запись без регистрации",
            },
          ].map((item) => (
            <div className="promise" key={item.title}>
              <Icon name={item.icon} size={27} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / ЧТО МЫ ДЕЛАЕМ</span>
            <h2>
              Всё, что нужно
              <br />
              <em>вашему автомобилю.</em>
            </h2>
          </div>
          <div className="section-aside">
            <p>
              От планового ТО до поиска неисправностей.
              <br />
              Выберите, с чего начнём.
            </p>
            <Link href="/services/" className="text-link">
              Все услуги <Icon name="diagonal" size={17} />
            </Link>
          </div>
        </div>
        <ServiceGrid />
        <p className="price-note">
          Демонстрационные цены за работу, без запчастей. Точная стоимость —
          после диагностики и согласования.
        </p>
      </section>
      <section className="approach section">
        <div className="container approach-grid">
          <div className="approach-photo">
            <img
              src="/images/workshop.jpg"
              alt="Детали двигателя автомобиля"
              loading="lazy"
            />
            <div className="photo-caption">
              <span className="status-dot" /> AUTERA / ВНИМАНИЕ В КАЖДОЙ ДЕТАЛИ
            </div>
            <span className="photo-corner">A.</span>
          </div>
          <div className="approach-content">
            <span className="eyebrow">02 / НАШ ПОДХОД</span>
            <h2>
              Хороший сервис —<br />
              когда <em>всё понятно.</em>
            </h2>
            <p className="lead">
              Вы знаете, что происходит с автомобилем,
              <br />
              зачем нужны работы и сколько они стоят.
            </p>
            <div className="approach-list">
              {[
                [
                  "01",
                  "Слушаем и проверяем",
                  "Обсуждаем симптомы, осматриваем автомобиль и ищем причину.",
                ],
                [
                  "02",
                  "Объясняем и согласовываем",
                  "Предлагаем план, обсуждаем стоимость и сроки до начала работ.",
                ],
                [
                  "03",
                  "Делаем и рассказываем",
                  "Показываем результат и даём рекомендации по дальнейшему уходу.",
                ],
              ].map(([num, title, text]) => (
                <div key={num}>
                  <span>{num}</span>
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
      <section className="container section booking-teaser">
        <div>
          <span className="eyebrow">03 / ВАШЕ ВРЕМЯ</span>
          <h2>
            Меньше звонков.
            <br />
            <em>Больше движения.</em>
          </h2>
          <p className="lead">
            Свободное время видно сразу.
            <br />
            Запишитесь за пару минут — без личного кабинета.
          </p>
          <Link href="/booking/" className="text-link">
            Перейти к записи <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="booking-preview">
          <div className="preview-header">
            <Icon name="calendar" size={21} />
            <span>УДОБНОЕ ВРЕМЯ ДЛЯ ВАС</span>
            <span className="preview-dot" />
          </div>
          <h3>
            Ваш автомобиль.
            <br />В вашем расписании.
          </h3>
          <div className="preview-times" aria-hidden="true">
            <span>09:00</span>
            <span>10:00</span>
            <span className="chosen">
              11:00 <Icon name="check" size={15} />
            </span>
            <span>12:00</span>
          </div>
          <p>
            <Icon name="lock" size={14} /> После записи время закрепляется за
            вами
          </p>
          <Link href="/booking/" className="button button-gold">
            Посмотреть свободные слоты <Icon name="diagonal" size={17} />
          </Link>
          <span className="small muted">
            Время на иллюстрации — пример. Актуальные слоты доступны в форме.
          </span>
        </div>
      </section>
      <CTA />
    </main>
  );
}
