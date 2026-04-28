import { localizeText, useLanguage } from '../../i18n/language';
import { TELEMETRY_EVENT, telemetry } from '../telemetry/telemetry';

export function LanguageSwitcher() {
  const { language, setLanguage, languageOptions } = useLanguage();
  const groupLabel = localizeText(language, {
    th: 'ตัวเลือกภาษา',
    en: 'Language selector',
  });
  const handleChangeLanguage = (nextLanguage: (typeof languageOptions)[number]['code']) => {
    if (nextLanguage === language) {
      return;
    }

    telemetry.info(TELEMETRY_EVENT.LANGUAGE_PREFERENCE_CHANGED, {
      fromLanguage: language,
      toLanguage: nextLanguage,
      path: window.location.pathname,
    });

    setLanguage(nextLanguage);
  };

  return (
    <div className="pg-lang-switcher" role="group" aria-label={groupLabel}>
      {languageOptions.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.code}
          className={`pg-lang-button ${language === option.code ? 'is-active' : ''}`}
          onClick={() => handleChangeLanguage(option.code)}
          aria-pressed={language === option.code}
          aria-label={localizeText(language, {
            th: `เปลี่ยนภาษาเป็น ${option.label}`,
            en: `Switch language to ${option.label}`,
          })}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
