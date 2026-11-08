import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, CTA } from "@/components/sections";
import { Icon } from "@/components/icon";
import { services, money } from "@/lib/catalog";
export const metadata: Metadata = { title: "Цены" };
export default function Prices() {
  return (
    <main id="main">
      <PageIntro eyebrow="ЦЕНЫ" title="Стоимость работ">
        Примерный прайс на основные работы. Точная стоимость зависит от
        автомобиля и результатов диагностики.
      </PageIntro>
      <section className="container section section-topless">
        <div className="price-table">
          <div className="price-table-head">
            <span>УСЛУГА</span>
            <span>РАБОТА, ОТ</span>
            <span />
          </div>
          {services.map((s) => (
            <Link
              href={"/booking/?service=" + s.id}
              className="price-row"
              key={s.id}
            >
              <span className="price-name">
                <span className="card-number">{s.number}</span>
                <span>
                  <strong>{s.name}</strong>
                  <small>{s.subtitle}</small>
                </span>
              </span>
              <span className="price-value">
                {money(s.price)} <span>₽</span>
              </span>
              <Icon name="diagonal" size={20} />
            </Link>
          ))}
        </div>
        <div className="info-box">
          <Icon name="shield" size={25} />
          <div>
            <h3>Что входит в стоимость</h3>
            <p>
              Цены приведены для демо, запчасти оплачиваются отдельно. Слот на 1
              час резервирует приём и первичную диагностику, а не полное время
              ремонта.
            </p>
          </div>
        </div>
      </section>
      <CTA />
    </main>
  );
}
