import { createContext, useState, useContext } from 'react';

const translations = {
  en: {
    dashboard: "Dashboard",
    symptoms: "Symptoms",
    analysis: "Analysis",
    timeline: "Timeline",
    reports: "Reports",
    alerts: "Alerts",
    settings: "Settings",
    welcome: "Welcome back",
    log_new: "Log New Symptom",
    current_risk: "Current Intelligence Risk",
    recent_logs: "Recent Tracking Logs",
    quick_insights: "Clinical Quick Insights",
    logout: "Logout",
    language: "Language",
    profile: "Profile Update",
    notifications: "Notifications",
    voice_input: "Voice Input Simulation",
    download_report: "Download PDF Report",
    set_reminder: "Set Daily Reminder"
  },
  es: {
    dashboard: "Tablero",
    symptoms: "Síntomas",
    analysis: "Análisis",
    timeline: "Cronograma",
    reports: "Informes",
    alerts: "Alertas",
    settings: "Ajustes",
    welcome: "Bienvenido de nuevo",
    log_new: "Registrar Nuevo Síntoma",
    current_risk: "Riesgo de Inteligencia Actual",
    recent_logs: "Registros de Seguimiento Recientes",
    quick_insights: "Perspectivas Clínicas Rápidas",
    logout: "Cerrar sesión",
    language: "Idioma",
    profile: "Actualizar Perfil",
    notifications: "Notificaciones",
    voice_input: "Simulación de Entrada de Voz",
    download_report: "Descargar Informe PDF",
    set_reminder: "Establecer Recordatorio Diario"
  }
};

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  const t = (key) => {
    return translations[lang]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
