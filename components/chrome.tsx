"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const resize = () => setOpen(false);
    const wide = window.matchMedia("(min-width: 761px)");
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    wide.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      wide.removeEventListener("change", resize);
    };
  }, [open]);
  return (
    <>
      <header
        ref={header}
        className="site-header"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setOpen(false);
        }}
      >
        <div className="container header-inner">
          <Link
            href="/"
            aria-label="Autera — главная"
            onClick={() => setOpen(false)}
          >
            <Logo />
          </Link>
          <nav
            id="main-navigation"
            className={open ? "main-nav is-open" : "main-nav"}
            aria-label="Основная навигация"
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={path === href ? "active" : ""}
                aria-current={path === href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/booking/"
            className="button button-gold header-book"
            onClick={() => setOpen(false)}
          >
            Записаться <Icon name="arrow" size={17} />
          </Link>
          <button
            ref={toggle}
            className="menu-button"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-controls="main-navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </header>
      <div className="demo-bar">
        <span className="demo-pill">ДЕМО</span>
        <span>Тестовая запись. Реальных визитов нет.</span>
      </div>
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
              Диагностика, ТО и ремонт
              <br />
              легковых автомобилей.
            </p>
          </div>
          <div className="footer-links">
            <span className="eyebrow">На сайте</span>
            {links.slice(1).map(([href, label]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
            <Link href="/booking/">Онлайн-запись</Link>
          </div>
          <div className="footer-contacts">
            <span className="eyebrow">Москва · демо</span>
            <p>Ежедневно, 09:00–19:00</p>
            <p>ул. Автомобильная, 10</p>
            <span className="small muted">Адрес вымышленный.</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} AUTERA. Демонстрационный проект.
          </span>
          <div>
            <Link href="/privacy/">Обработка данных</Link>
            <Link href="/admin/">Администратору</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
