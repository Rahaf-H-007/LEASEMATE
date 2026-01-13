'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'tenant' as 'landlord' | 'tenant',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Frontend validation
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) errors.name = "الاسم مطلوب";
    if (!formData.username.trim()) errors.username = "اسم المستخدم مطلوب";
    if (!formData.phone.trim()) errors.phone = "رقم الهاتف مطلوب";
    else if (!/^01[0-9]{9}$/.test(formData.phone)) errors.phone = "يرجى إدخال رقم هاتف مصري صحيح";
    if (!formData.password) errors.password = "كلمة المرور مطلوبة";
    else if (formData.password.length < 6) errors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    if (!formData.confirmPassword) errors.confirmPassword = "تأكيد كلمة المرور مطلوب";
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = "كلمتا المرور غير متطابقتين";
    if (!formData.role) errors.role = "الدور مطلوب";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const registerData = {
        name: formData.name,
        password: formData.password,
        role: formData.role,
        ...(formData.username && { username: formData.username }),
        ...(formData.phone && { phone: formData.phone }),
      };

      const response = await apiService.register(registerData);
      login(response.token, response);
      router.push('/auth/verification');
    } catch (err: any) {
      // استقبال أخطاء الباكند
      if (err.errors && Array.isArray(err.errors)) {
        const errors: { [key: string]: string } = {};
        err.errors.forEach((e: any) => {
          if ((e.param || e.path) && e.msg) {
            errors[e.param || e.path] = e.msg;
          }
        });
        setFieldErrors(errors);
        setError('');
        setIsLoading(false);
        return;
      }
      if (err.message && err.message.startsWith('{')) {
        try {
          const errorObj = JSON.parse(err.message);
          if (errorObj.errors && Array.isArray(errorObj.errors)) {
            const errors: { [key: string]: string } = {};
            errorObj.errors.forEach((e: any) => {
              if ((e.param || e.path) && e.msg) {
                errors[e.param || e.path] = e.msg;
              }
            });
            setFieldErrors(errors);
            setError('');
            setIsLoading(false);
            return;
          }
        } catch {}
      }
      setError(err.message || 'فشل التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleChange = (role: 'landlord' | 'tenant') => {
    setFormData({
      ...formData,
      role,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Logo />
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">إنشاء حساب جديد</h2>
        {/* اختيار الدور */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => handleRoleChange('tenant')}
            className={`px-6 py-2 rounded-lg border-2 font-semibold transition-colors duration-200 ${formData.role === 'tenant' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            مستأجر
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('landlord')}
            className={`px-6 py-2 rounded-lg border-2 font-semibold transition-colors duration-200 ${formData.role === 'landlord' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            مالك
          </button>
        </div>
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
            required
          />
          {fieldErrors.name && <div className="text-red-600 text-sm mt-1">{fieldErrors.name}</div>}
        </div>
        <div className="mb-4">
          <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">اسم المستخدم </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
            placeholder="مثال: samirhasan"
          />
          {fieldErrors.username && <div className="text-red-600 text-sm mt-1">{fieldErrors.username}</div>}
        </div>
        <div className="mb-4">
          <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
            placeholder="**********مثال: 010"
          />
          {fieldErrors.phone && <div className="text-red-600 text-sm mt-1">{fieldErrors.phone}</div>}
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
            required
          />
          {fieldErrors.password && <div className="text-red-600 text-sm mt-1">{fieldErrors.password}</div>}
        </div>
        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">تأكيد كلمة المرور</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
            required
          />
          {fieldErrors.confirmPassword && <div className="text-red-600 text-sm mt-1">{fieldErrors.confirmPassword}</div>}
        </div>
        {fieldErrors.role && <div className="text-red-600 text-sm mb-2 text-center">{fieldErrors.role}</div>}
        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'جاري التسجيل...' : 'تسجيل'}
        </button>
        <div className="mt-6 text-center">
          <span className="text-gray-600 dark:text-gray-300">لديك حساب بالفعل؟ </span>
          <Link href="/auth/login" className="text-orange-600 hover:underline font-bold">سجّل الدخول</Link>
        </div>
      </form>
    </div>
  );
} 