import type { Metadata } from "next";
import { CTA, PageIntro, ServiceGrid } from "@/components/sections";
export const metadata: Metadata = { title: "Услуги" };
export default function Services() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="УСЛУГИ"
        title="Знаем автомобиль."
        accent="Понимаем вас."
      >
        Шесть направлений заботы об автомобиле. Выберите услугу — и удобное
        время для первого осмотра.
      </PageIntro>
      <section className="container section section-topless">
        <ServiceGrid full />
        <p className="price-note">
          Все цены демонстрационные, указаны за работу без запчастей. Часовой
          слот — время приёма и первичного осмотра; продолжительность ремонта
          согласуется отдельно.
        </p>
      </section>
      <CTA />
    </main>
  );
}
