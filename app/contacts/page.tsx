import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/sections";
import { Icon } from "@/components/icon";
export const metadata: Metadata = { title: "Контакты" };
export default function Contacts() {
  return (
    <main id="main">
      <PageIntro eyebrow="КОНТАКТЫ" title="Контакты">
        Демонстрационный автосервис в Москве. Запись сохраняется в системе,
        фактический визит в сервис не предусмотрен.
      </PageIntro>
      <section className="container section section-topless contacts-grid">
        <div className="contact-panel">
          <span className="eyebrow">AUTERA / МОСКВА</span>
          <div className="contact-item">
            <Icon name="pin" />
            <div>
              <small>ДЕМОНСТРАЦИОННЫЙ АДРЕС</small>
              <h3>
                Москва,
                <br />
                ул. Автомобильная, 10
              </h3>
              <p>Адрес вымышленный. Не используйте для поездки.</p>
            </div>
          </div>
          <div className="contact-item">
            <Icon name="clock" />
            <div>
              <small>ГРАФИК ДЕМО</small>
              <h3>Ежедневно, 09:00–19:00</h3>
              <p>Время записи — московское, UTC+3.</p>
            </div>
          </div>
          <div className="contact-item">
            <Icon name="phone" />
            <div>
              <small>ПРИМЕР ТЕЛЕФОНА</small>
              <h3>+7 (000) 000-00-00</h3>
              <p>
                Номер не обслуживается. Для знакомства используйте
                онлайн-запись.
              </p>
            </div>
          </div>
          <Link href="/booking/" className="button button-gold">
            Записаться онлайн <Icon name="diagonal" size={18} />
          </Link>
        </div>
        <div
          className="location-art"
          role="img"
          aria-label="Декоративная схема Москвы, не карта проезда"
        >
          <div className="map-grid" />
          <div className="map-road road-one" />
          <div className="map-road road-two" />
          <div className="map-ring" />
          <span className="map-label">МОСКВА</span>
          <div className="map-marker">
            <Icon name="pin" size={32} />
            <strong>AUTERA.</strong>
          </div>
          <div className="map-disclaimer">ДЕМО · НЕ КАРТА ПРОЕЗДА</div>
        </div>
      </section>
    </main>
  );
}
