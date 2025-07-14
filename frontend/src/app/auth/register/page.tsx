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
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'tenant' as 'landlord' | 'tenant',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (!formData.email && !formData.phone) {
      setError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف');
      return;
    }

    setIsLoading(true);

    try {
      const registerData = {
        name: formData.name,
        password: formData.password,
        role: formData.role,
        ...(formData.email && { email: formData.email }),
        ...(formData.phone && { phone: formData.phone }),
      };

      const response = await apiService.register(registerData);
      login(response.token,response);
      router.push('/auth/verification');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'فشل التسجيل');
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
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
          />
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
          />
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
        </div>
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