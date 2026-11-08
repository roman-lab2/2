"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icon";
export function Logo() {
  return (
    <span className="logo">
      AUTERA<span className="logo-dot">.</span>
      <small>АВТОСЕРВИС · МОСКВА</small>
    </span>
  );
}
const links = [
  ["/", "Главная"],
  ["/services/", "Услуги"],
  ["/prices/", "Цены"],
  ["/contacts/", "Контакты"],
];
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="demo-bar">
        <span className="demo-pill">ДЕМО</span> Концепт автосервиса.
        Онлайн-запись работает, визиты демонстрационные.
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link
            href="/"
            aria-label="Autera — главная"
            onClick={() => setOpen(false)}
          >
            <Logo />
          </Link>
          <nav
            className={open ? "main-nav is-open" : "main-nav"}
            aria-label="Основная навигация"
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={path === href ? "active" : ""}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/booking/" className="button button-gold header-book">
            Записаться <Icon name="diagonal" size={17} />
          </Link>
          <button
            className="menu-button"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <Link href="/">
              <Logo />
            </Link>
            <p>
              Больше уверенности.
              <br />
              На каждом километре.
            </p>
          </div>
          <div className="footer-links">
            <span className="eyebrow">НАВИГАЦИЯ</span>
            {links.slice(1).map(([href, label]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
            <Link href="/booking/">Онлайн-запись</Link>
          </div>
          <div className="footer-contacts">
            <span className="eyebrow">МОСКВА · ДЕМО</span>
            <p>Ежедневно, 09:00–19:00</p>
            <p>
              Демонстрационный адрес:
              <br />
              ул. Автомобильная, 10
            </p>
            <span className="small muted">
              Реального сервиса по этим контактам нет.
            </span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} AUTERA. Демонстрационный проект.
          </span>
          <div>
            <Link href="/privacy/">Обработка данных</Link>
            <Link href="/admin/">
              Для администратора <Icon name="diagonal" size={12} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
