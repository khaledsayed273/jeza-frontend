/**
 * ExcelBrandingContext
 * يحفظ بيانات الشركة (لوغو + اسم + معلومات اتصال) في localStorage
 * ويوفرها لجميع الحاسبات عند تصدير Excel
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ExcelBranding {
  /** base64 data URL للوغو */
  logoBase64: string | null;
  /** اسم الشركة */
  companyName: string;
  /** معلومات الاتصال (اختياري) */
  contactInfo: string;
}

interface ExcelBrandingContextValue extends ExcelBranding {
  setLogo: (base64: string | null) => void;
  setCompanyName: (name: string) => void;
  setContactInfo: (info: string) => void;
  clearBranding: () => void;
}

const STORAGE_KEY = "mwk_excel_branding";

const defaultBranding: ExcelBranding = {
  logoBase64: null,
  companyName: "",
  contactInfo: "",
};

const ExcelBrandingContext = createContext<ExcelBrandingContextValue>({
  ...defaultBranding,
  setLogo: () => {},
  setCompanyName: () => {},
  setContactInfo: () => {},
  clearBranding: () => {},
});

export function ExcelBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<ExcelBranding>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as ExcelBranding;
    } catch {}
    return defaultBranding;
  });

  // حفظ تلقائي عند أي تغيير
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    } catch {}
  }, [branding]);

  const setLogo = useCallback((base64: string | null) => {
    setBranding(prev => ({ ...prev, logoBase64: base64 }));
  }, []);

  const setCompanyName = useCallback((name: string) => {
    setBranding(prev => ({ ...prev, companyName: name }));
  }, []);

  const setContactInfo = useCallback((info: string) => {
    setBranding(prev => ({ ...prev, contactInfo: info }));
  }, []);

  const clearBranding = useCallback(() => {
    setBranding(defaultBranding);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ExcelBrandingContext.Provider
      value={{ ...branding, setLogo, setCompanyName, setContactInfo, clearBranding }}
    >
      {children}
    </ExcelBrandingContext.Provider>
  );
}

export function useExcelBranding() {
  return useContext(ExcelBrandingContext);
}
