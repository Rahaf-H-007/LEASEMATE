"use client";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DirectionController() {
  const { language } = useLanguage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = language;
    }
  }, [language]);

  return null;
} 