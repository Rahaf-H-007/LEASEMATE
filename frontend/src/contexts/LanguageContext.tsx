'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation data
const translations = {
  en: {
    dashboard: {
      welcome: 'Welcome back, {name}!',
      subtitle: "Here's what's happening with your {item}.",
      quickStats: 'Quick Stats',
      active: 'Active {item}',
      total: 'Total {item}',
      pendingTasks: 'Pending Tasks',
      recentActivity: 'Recent Activity',
      rentReceived: 'Rent payment received',
      maintenanceResolved: 'Maintenance request resolved',
      contractRenewal: 'Contract renewal due soon',
      quickActions: 'Quick Actions',
      addProperty: 'Add New Property',
      submitRequest: 'Submit Maintenance Request',
      viewDocuments: 'View Documents',
      contactSupport: 'Contact Support',
      yourProperties: 'Your Properties',
      yourLeases: 'Your Leases'
    },
    navbar: {
      properties: 'Properties',
      leases: 'Leases',
      about: 'About Us',
      dashboard: 'Dashboard',
      profile: 'Profile',
      logout: 'Logout',
      signIn: 'Sign In',
      signUp: 'Sign Up'
    },
    home: {
      heroTitle: 'Smart Rentals, Simplified',
      heroSubtitle: 'Streamline your rental experience with our comprehensive property management platform',
      getStarted: 'Get Started',
      browseProperties: 'Browse Properties',
      digitalPayments: 'Digital Payments',
      digitalPaymentsDesc: 'Secure online rent payments with automatic tracking and receipts',
      maintenanceRequests: 'Maintenance Requests',
      maintenanceRequestsDesc: 'Submit and track maintenance requests with real-time updates',
      digitalContracts: 'Digital Contracts',
      digitalContractsDesc: 'Sign and manage lease agreements digitally with ease',
      featuredProperties: 'Featured Properties',
      featuredPropertiesDesc: 'Discover our curated selection of premium rentals',
      viewDetails: 'View Details',
      available: 'Available',
      comingSoon: 'Coming Soon',
      whyChoose: 'Why Choose LeaseMate?',
      happyTenants: 'Happy Tenants',
      properties: 'Properties',
      satisfactionRate: 'Satisfaction Rate',
      support: 'Support',
      quickLinks: 'Quick Links',
      home: 'Home',
      contact: 'Contact',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      footerDesc: 'Simplifying rental management for landlords and tenants.'
    },
    auth: {
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      name: 'Name',
      role: 'Role',
      landlord: 'Landlord',
      tenant: 'Tenant',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      forgotPassword: 'Forgot Password?',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      loginSuccess: 'Login successful!',
      registerSuccess: 'Registration successful!'
    },
    common: {
      language: 'Language',
      english: 'English',
      arabic: 'Arabic'
    },
    notifications: {
      pageTitle: "Notifications",
      pageSubtitle: "Stay updated with important alerts and reminders.",
      filterLabel: "Filter by:",
      all: "All",
      payments: "Payments",
      maintenance: "Maintenance",
      contracts: "Contracts",
      general: "General",
      verification: "Verification",
      markAllRead: "Mark all as read",
      noNotifications: "No notifications found.",
      from: "From:",
      markAsRead: "Mark as read",
      read: "Read"
    }
  },
  ar: {
    dashboard: {
      welcome: 'مرحبًا بعودتك، {name}!',
      subtitle: 'إليك ما يحدث في {item} الخاص بك.',
      quickStats: 'إحصائيات سريعة',
      active: '{item} النشطة',
      total: 'إجمالي {item}',
      pendingTasks: 'المهام المعلقة',
      recentActivity: 'النشاط الأخير',
      rentReceived: 'تم استلام دفعة الإيجار',
      maintenanceResolved: 'تم حل طلب الصيانة',
      contractRenewal: 'تجديد العقد قريبًا',
      quickActions: 'إجراءات سريعة',
      addProperty: 'إضافة عقار جديد',
      submitRequest: 'تقديم طلب صيانة',
      viewDocuments: 'عرض المستندات',
      contactSupport: 'الاتصال بالدعم',
      yourProperties: 'عقاراتك',
      yourLeases: 'عقودك'
    },
    navbar: {
      properties: 'العقارات',
      leases: 'العقود',
      about: 'معلومات عنا',
      dashboard: 'لوحة التحكم',
      profile: 'الملف الشخصي',
      logout: 'تسجيل الخروج',
      signIn: 'تسجيل الدخول',
      signUp: 'إنشاء حساب'
    },
    home: {
      heroTitle: 'الإيجارات الذكية، مبسطة',
      heroSubtitle: 'بسط تجربة الإيجار الخاصة بك مع منصة إدارة العقارات الشاملة',
      getStarted: 'ابدأ الآن',
      browseProperties: 'تصفح العقارات',
      digitalPayments: 'المدفوعات الرقمية',
      digitalPaymentsDesc: 'مدفوعات الإيجار الآمنة عبر الإنترنت مع التتبع التلقائي والإيصالات',
      maintenanceRequests: 'طلبات الصيانة',
      maintenanceRequestsDesc: 'تقديم وتتبع طلبات الصيانة مع التحديثات في الوقت الفعلي',
      digitalContracts: 'العقود الرقمية',
      digitalContractsDesc: 'توقيع وإدارة اتفاقيات الإيجار رقميًا بسهولة',
      featuredProperties: 'العقارات المميزة',
      featuredPropertiesDesc: 'اكتشف مجموعتنا المختارة من الإيجارات المميزة',
      viewDetails: 'عرض التفاصيل',
      available: 'متاح',
      comingSoon: 'قريبًا',
      whyChoose: 'لماذا تختار LeaseMate؟',
      happyTenants: 'مستأجرين سعداء',
      properties: 'عقارات',
      satisfactionRate: 'معدل الرضا',
      support: 'الدعم',
      quickLinks: 'روابط سريعة',
      home: 'الرئيسية',
      contact: 'اتصل بنا',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الخدمة',
      footerDesc: 'تبسيط إدارة الإيجار للملاك والمستأجرين.'
    },
    auth: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      name: 'الاسم',
      role: 'الدور',
      landlord: 'مالك العقار',
      tenant: 'مستأجر',
      signIn: 'تسجيل الدخول',
      signUp: 'إنشاء حساب',
      forgotPassword: 'نسيت كلمة المرور؟',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      dontHaveAccount: 'ليس لديك حساب؟',
      loginSuccess: 'تم تسجيل الدخول بنجاح!',
      registerSuccess: 'تم التسجيل بنجاح!'
    },
    common: {
      language: 'اللغة',
      english: 'الإنجليزية',
      arabic: 'العربية'
    },
    notifications: {
      pageTitle: "الإشعارات",
      pageSubtitle: "ابق على اطلاع بالتنبيهات والتذكيرات الهامة.",
      filterLabel: "تصفية حسب:",
      all: "الكل",
      payments: "المدفوعات",
      maintenance: "الصيانة",
      contracts: "العقود",
      general: "عام",
      verification: "التحقق",
      markAllRead: "تحديد الكل كمقروء",
      noNotifications: "لا توجد إشعارات.",
      from: "من:",
      markAsRead: "تحديد كمقروء",
      read: "مقروء"
    }
  }
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Check for saved language preference or default to 'en'
    const savedLanguage = localStorage.getItem('leasemate_language') as Language;
    if (savedLanguage && ['en', 'ar'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Update document attributes and save to localStorage
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('leasemate_language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (!value) return key;
    
    if (params) {
      return Object.entries(params).reduce((str, [key, val]) => {
        return str.replace(`{${key}}`, val);
      }, value);
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 