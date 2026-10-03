import { useTranslation } from "react-i18next";
import i18n from "../lib/i18n";

export default function LanguagePicker() {
  const { t } = useTranslation();
  return (
    <label className="language-picker">
      <span className="sr-only">{t("nav.language")}</span>
      <select
        value={i18n.language === "zh-TW" ? "zh-TW" : "en"}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        aria-label={t("nav.language")}
      >
        <option value="en">English</option>
        <option value="zh-TW">繁體中文</option>
      </select>
    </label>
  );
}
