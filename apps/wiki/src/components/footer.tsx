import { t } from "@/i18n/messages";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer mt-20 px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          &copy; {year} {t("footer.copyright")}
        </p>
        <p className="island-kicker m-0">{t("footer.builtWith")}</p>
      </div>
    </footer>
  );
}
