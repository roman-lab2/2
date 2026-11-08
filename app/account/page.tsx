
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Appointment = {
  id: string;
  service?: string;
  service_name?: string;
  date?: string;
  appointment_date?: string;
  status?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [name, setName] = useState("Клиент");
  const [email, setEmail] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const user = data.user;
      const metadataName = user.user_metadata?.full_name;
      const emailName = user.email?.split("@")[0];

      setName(
        metadataName && metadataName.length > 1
          ? metadataName
          : emailName && emailName.length > 1
          ? emailName
          : "Клиент"
      );
      setEmail(user.email ?? "");

      const { data: records } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setAppointments(records ?? []);
      setLoading(false);
    }

    loadAccount();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const firstName = name.split(/[ .@_-]/)[0];
  const activeCount = appointments.filter(
    (a) => a.status !== "completed" && a.status !== "cancelled"
  ).length;

  return (
    <main className="autera">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #0b0c0e;
          color: #f4f3ef;
          font-family: Arial, Helvetica, sans-serif;
        }

        .autera {
          min-height: 100vh;
          background: #0b0c0e;
          color: #f4f3ef;
        }

        .autera button {
          cursor: pointer;
          font: inherit;
        }

        .autera-shell {
          display: grid;
          grid-template-columns: 245px minmax(0, 1fr);
          min-height: 100vh;
        }

        .autera-sidebar {
          padding: 32px 22px;
          border-right: 1px solid #242528;
          display: flex;
          flex-direction: column;
          background: #0e0f11;
        }

        .autera-logo {
          font-size: 25px;
          letter-spacing: 5px;
          font-weight: 800;
        }

        .autera-logo span {
          color: #d6a45c;
        }

        .autera-caption {
          color: #77797e;
          font-size: 9px;
          letter-spacing: 3px;
          margin-top: 8px;
        }

        .autera-nav-label {
          margin: 52px 0 16px;
          color: #66686d;
          font-size: 10px;
          letter-spacing: 2px;
        }

        .autera-nav-item {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 14px 15px;
          margin: 4px 0;
          border-radius: 10px;
          color: #a1a2a6;
          font-size: 13px;
          background: transparent;
          border: 1px solid transparent;
          text-align: left;
          width: 100%;
        }

        .autera-nav-item.active {
          color: #f1d4a5;
          background: #211c15;
          border-color: #3a2d1e;
        }

        .autera-nav-icon {
          font-size: 17px;
          width: 20px;
          text-align: center;
        }

        .autera-sidebar-bottom {
          margin-top: auto;
          padding-top: 25px;
        }

        .autera-support {
          padding: 17px;
          border: 1px solid #28292c;
          border-radius: 12px;
          background: #141517;
        }

        .autera-support-title {
          font-size: 12px;
          font-weight: 600;
        }

        .autera-support-text {
          margin-top: 8px;
          font-size: 11px;
          line-height: 1.6;
          color: #85868a;
        }

        .autera-main {
          min-width: 0;
          padding: 30px 38px 50px;
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
        }

        .autera-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 30px;
        }

        .autera-breadcrumb {
          color: #77797d;
          font-size: 12px;
        }

        .autera-breadcrumb strong {
          color: #e9e8e3;
          font-weight: 500;
        }

        .autera-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .autera-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d6a45c, #75532c);
          color: #15110c;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 800;
        }

        .autera-profile-name {
          font-size: 12px;
          font-weight: 600;
        }

        .autera-profile-email {
          font-size: 10px;
          color: #77797d;
          margin-top: 4px;
        }

        .autera-hero {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          min-height: 330px;
          border: 1px solid #303033;
          background:
            linear-gradient(90deg, rgba(8, 9, 10, 0.96) 0%, rgba(8, 9, 10, 0.78) 38%, rgba(8, 9, 10, 0.12) 100%),
            linear-gradient(0deg, rgba(8, 9, 10, 0.4), transparent),
            url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=85")
              center 58% / cover;
          }

        .autera-hero-content {
          position: relative;
          padding: 42px;
          max-width: 600px;
        }

        .autera-eyebrow {
          color: #d6a45c;
          font-size: 10px;
          letter-spacing: 3px;
          font-weight: 700;
        }

        .autera-hero h1 {
          font-size: clamp(32px, 4vw, 48px);
          letter-spacing: -1.8px;
          line-height: 1.08;
          margin: 18px 0 13px;
          font-weight: 700;
        }

        .autera-hero h1 span {
          color: #d6a45c;
        }

        .autera-hero-description {
          color: #b3b3b5;
          font-size: 13px;
          line-height: 1.8;
          max-width: 350px;
        }

        .autera-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 27px;
        }

        .autera-primary-button {
          background: #d6a45c;
          color: #17120b;
          border: 0;
          border-radius: 8px;
          padding: 13px 18px;
          font-size: 12px;
          font-weight: 700;
          transition: 0.2s;
        }

        .autera-primary-button:hover {
          background: #e8bd7e;
          transform: translateY(-1px);
        }

        .autera-secondary-button {
          color: #f4f3ef;
          background: rgba(20, 20, 21, 0.55);
          border: 1px solid #4b4b4d;
          border-radius: 8px;
          padding: 13px 18px;
          font-size: 12px;
        }

        .autera-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 15px;
          margin: 32px 0 17px;
        }

        .autera-section-heading h2 {
          font-size: 19px;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .autera-section-heading p {
          font-size: 11px;
          color: #77797d;
          margin: 7px 0 0;
        }

        .autera-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .autera-stat {
          padding: 20px;
          background: #141517;
          border: 1px solid #28292c;
          border-radius: 13px;
          transition: border-color 0.2s;
        }

        .autera-stat:hover {
          border-color: #5a452b;
        }

        .autera-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #85868a;
          font-size: 11px;
        }

        .autera-stat-symbol {
          color: #d6a45c;
          font-size: 19px;
        }

        .autera-stat-number {
          font-size: 29px;
          font-weight: 700;
          letter-spacing: -1px;
          margin-top: 16px;
        }

        .autera-stat-note {
          color: #77797d;
          font-size: 10px;
          margin-top: 6px;
        }

        .autera-appointments {
          background: #141517;
          border: 1px solid #28292c;
          border-radius: 14px;
          overflow: hidden;
        }

        .autera-appointment-row {
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid #28292c;
        }

        .autera-appointment-row:last-child {
          border-bottom: 0;
        }

        .autera-appointment-name {
          font-size: 13px;
          font-weight: 600;
        }

        .autera-appointment-date {
          font-size: 11px;
          color: #85868a;
          margin-top: 6px;
        }

        .autera-status {
          padding: 7px 10px;
          border-radius: 20px;
          font-size: 10px;
          color: #e8c58f;
          background: #2b2115;
          white-space: nowrap;
        }

        .autera-empty {
          padding: 34px 20px;
          text-align: center;
        }

        .autera-empty-symbol {
          font-size: 28px;
          color: #d6a45c;
          margin-bottom: 12px;
        }

        .autera-empty-title {
          font-size: 14px;
          font-weight: 600;
        }

        .autera-empty-text {
          color: #85868a;
          font-size: 12px;
          margin: 9px auto 18px;
          max-width: 320px;
          line-height: 1.6;
        }

        .autera-logout {
          margin-top: 13px;
          background: transparent;
          color: #85868a;
          border: 0;
          padding: 13px 15px;
          text-align: left;
          width: 100%;
          font-size: 12px;
        }

        .autera-logout:hover {
          color: #e4b77a;
        }

        .autera-footer {
          color: #55565a;
          font-size: 10px;
          margin-top: 25px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        @media (max-width: 900px) {
          .autera-shell {
            grid-template-columns: 1fr;
          }

          .autera-sidebar {
            display: none;
          }

          .autera-main {
            padding: 22px 18px 35px;
          }

          .autera-hero-content {
            padding: 30px 24px;
          }
        }

        @media (max-width: 560px) {
          .autera-stats {
            grid-template-columns: 1fr;
          }

          .autera-topbar {
            align-items: flex-start;
          }

          .autera-profile-email {
            display: none;
          }

          .autera-hero {
            min-height: 370px;
            background-position: 62% center;
          }

          .autera-hero h1 {
            font-size: 34px;
          }

          .autera-footer {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="autera-shell">
        <aside className="autera-sidebar">
          <div>
            <div className="autera-logo">
              AUTERA<span>.</span>
            </div>
            <div className="autera-caption">AUTOMOTIVE EXPERIENCE</div>
          </div>

          <div className="autera-nav-label">ЛИЧНЫЙ КАБИНЕТ</div>

          <button className="autera-nav-item active">
            <span className="autera-nav-icon">⌂</span>
            Обзор
          </button>
          <button
            className="autera-nav-item"
            onClick={() =>
              document
                .getElementById("appointments")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <span className="autera-nav-icon">◷</span>
            Мои записи
          </button>
          <button className="autera-nav-item" onClick={() => router.push("/services")}>
            <span className="autera-nav-icon">✧</span>
            Услуги
          </button>

          <div className="autera-sidebar-bottom">
            <div className="autera-support">
              <div className="autera-support-title">Нужна помощь?</div>
              <div className="autera-support-text">
                Мы всегда готовы помочь с вашим автомобилем.
              </div>
            </div>
            <button className="autera-logout" onClick={logout}>
              ↗ Выйти из аккаунта
            </button>
          </div>
        </aside>

        <section className="autera-main">
          <header className="autera-topbar">
            <div className="autera-breadcrumb">
              AUTERA <span style={{ color: "#444" }}> / </span>{" "}
              <strong>Личный кабинет</strong>
            </div>
            <div className="autera-profile">
              <div className="autera-avatar">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="autera-profile-name">{name}</div>
                <div className="autera-profile-email">{email}</div>
              </div>
            </div>
          </header>

          <section className="autera-hero">
            <div className="autera-hero-content">
              <div className="autera-eyebrow">YOUR AUTOMOTIVE SPACE</div>
              <h1>
                Добро пожаловать,
                <br />
                <span>{firstName}.</span>
              </h1>
              <div className="autera-hero-description">
                Ваш автомобиль заслуживает лучшего. Управляйте обслуживанием,
                следите за записями и открывайте сервис нового уровня.
              </div>
              <div className="autera-hero-actions">
                <button
                  className="autera-primary-button"
                  onClick={() => router.push("/services")}
                >
                  Записаться на сервис&nbsp; →
                </button>
                <button
                  className="autera-secondary-button"
                  onClick={() =>
                    document
                      .getElementById("appointments")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Мои записи
                </button>
              </div>
            </div>
          </section>

          <div className="autera-section-heading">
            <div>
              <h2>Ваш кабинет</h2>
              <p>Всё важное — в одном месте</p>
            </div>
          </div>

          <div className="autera-stats">
            <div className="autera-stat">
              <div className="autera-stat-top">
                Активные записи <span className="autera-stat-symbol">◷</span>
              </div>
              <div className="autera-stat-number">{loading ? "—" : activeCount}</div>
              <div className="autera-stat-note">Предстоящие визиты</div>
            </div>

            <div className="autera-stat">
              <div className="autera-stat-top">
                Всего обращений <span className="autera-stat-symbol">↗</span>
              </div>
              <div className="autera-stat-number">
                {loading ? "—" : appointments.length}
              </div>
              <div className="autera-stat-note">История обслуживания</div>
            </div>

            <div className="autera-stat">
              <div className="autera-stat-top">
                Статус аккаунта <span className="autera-stat-symbol">✦</span>
              </div>
              <div className="autera-stat-number" style={{ fontSize: 23 }}>
                Active
              </div>
              <div className="autera-stat-note">Ваш профиль Autera</div>
            </div>
          </div>

          <div className="autera-section-heading" id="appointments">
            <div>
              <h2>Мои записи</h2>
              <p>Ваши визиты в Autera</p>
            </div>
            <button
              className="autera-secondary-button"
              onClick={() => router.push("/services")}
            >
              + Новая запись
            </button>
          </div>

          <div className="autera-appointments">
            {loading ? (
              <div className="autera-empty">
                <div className="autera-empty-text">Загружаем ваши записи…</div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="autera-empty">
                <div className="autera-empty-symbol">✧</div>
                <div className="autera-empty-title">Пока нет записей</div>
                <div className="autera-empty-text">
                  Запланируйте первое посещение — мы позаботимся о вашем автомобиле.
                </div>
                <button
                  className="autera-primary-button"
                  onClick={() => router.push("/services")}
                >
                  Выбрать услугу →
                </button>
              </div>
            ) : (
              appointments.map((appointment) => (
                <div className="autera-appointment-row" key={appointment.id}>
                  <div>
                    <div className="autera-appointment-name">
                      {appointment.service_name ??
                        appointment.service ??
                        "Обслуживание автомобиля"}
                    </div>
                    <div className="autera-appointment-date">
                      {appointment.appointment_date ?? appointment.date ?? "Дата уточняется"}
                    </div>
                  </div>
                  <div className="autera-status">
                    {appointment.status ?? "Ожидает подтверждения"}
                  </div>
                </div>
              ))
            )}
          </div>

          <footer className="autera-footer">
            <span>© AUTERA AUTOMOTIVE SERVICE</span>
            <span>Designed for those who care about every detail.</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
