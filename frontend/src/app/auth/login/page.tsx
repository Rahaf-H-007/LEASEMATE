'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import Logo from '@/components/Logo';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    usernameOrPhone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'landlord' && user.verificationStatus && user.verificationStatus.status === 'approved') {
        router.push('/dashboard');
      } else if (user.role === 'tenant' && user.verificationStatus && user.verificationStatus.status === 'approved') {
        router.push('/');
      } else {
        router.push('/');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Frontend validation
    const errors: { [key: string]: string } = {};
    if (!formData.usernameOrPhone.trim()) errors.usernameOrPhone = "اسم المستخدم أو رقم الهاتف مطلوب";
    if (!formData.password) errors.password = "كلمة المرور مطلوبة";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      // أرسل الحقل باسم emailOrPhone كما هو معرف في LoginData
      const response = await apiService.login({
        usernameOrPhone: formData.usernameOrPhone,
        password: formData.password,
      });
      login(response.token, response); // Pass both token and user object
      // Redirect based on role
      if (response.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (response.role === 'landlord' && response.verificationStatus && response.verificationStatus.status === 'approved') {
        router.push('/dashboard');
      } else if (response.role === 'tenant' && response.verificationStatus && response.verificationStatus.status === 'approved') {
        router.push('/');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.log('LOGIN ERROR:', err);
      setError(
        err?.message ||
        (err?.errors && err.errors[0]?.msg) ||
        'فشل تسجيل الدخول'
      );
      setIsLoading(false);
      // استقبال أخطاء الباكند
      if (err.errors && Array.isArray(err.errors)) {
        const errors: { [key: string]: string } = {};
        let hasGeneralError = false;
        err.errors.forEach((e: any) => {
          if ((e.param || e.path) && e.msg) {
            if (e.param === "general" || e.path === "general") {
              setError(e.msg);
              hasGeneralError = true;
            } else {
              errors[e.param || e.path] = e.msg;
            }
          }
        });
        if (!hasGeneralError) {
          setFieldErrors(errors);
          setError('');
        }
        setIsLoading(false);
        return;
      }
      if (err.message && err.message.startsWith('{')) {
        try {
          const errorObj = JSON.parse(err.message);
          if (errorObj.errors && Array.isArray(errorObj.errors)) {
            const errors: { [key: string]: string } = {};
            let hasGeneralError = false;
            errorObj.errors.forEach((e: any) => {
              if ((e.param || e.path) && e.msg) {
                if (e.param === "general" || e.path === "general") {
                  setError(e.msg);
                  hasGeneralError = true;
                } else {
                  errors[e.param || e.path] = e.msg;
                }
              }
            });
            if (!hasGeneralError) {
              setFieldErrors(errors);
              setError('');
            }
            setIsLoading(false);
            return;
          }
        } catch {}
      }
      setError(err.message || 'فشل تسجيل الدخول');
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

  if (user?.verificationStatus?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              Verification Rejected
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your verification was rejected. Please re-upload your documents.
            </p>
            <div className="flex flex-col items-center gap-4 mb-4">
              {user.verificationStatus?.uploadedIdUrl && (
                <img
                  src={user.verificationStatus.uploadedIdUrl}
                  alt="Uploaded ID"
                  className="w-48 h-32 object-cover rounded border"
                />
              )}
              {user.verificationStatus?.selfieUrl && (
                <img
                  src={user.verificationStatus.selfieUrl}
                  alt="Uploaded Selfie"
                  className="w-32 h-32 object-cover rounded-full border"
                />
              )}
            </div>
            <button
              onClick={() => router.push('/auth/verification')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Edit & Re-upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <Logo />
        <form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">تسجيل الدخول</h2>
          {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
          <div className="mb-4">
            <label htmlFor="usernameOrPhone" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">اسم المستخدم أو رقم الهاتف</label>
            <input
              type="text"
              id="usernameOrPhone"
              name="usernameOrPhone"
              value={formData.usernameOrPhone}
              onChange={e => setFormData({ ...formData, usernameOrPhone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
              required
            />
            {fieldErrors.usernameOrPhone && <div className="text-red-600 text-sm mt-1">{fieldErrors.usernameOrPhone}</div>}
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
              required
            />
            {fieldErrors.password && <div className="text-red-600 text-sm mt-1">{fieldErrors.password}</div>}
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'جاري الدخول...' : 'دخول'}
          </button>
          <div className="mt-6 text-center">
            <span className="text-gray-600 dark:text-gray-300">ليس لديك حساب؟ </span>
            <Link href="/auth/register" className="text-orange-600 hover:underline font-bold">سجّل الآن</Link>
          </div>
        </form>
      </div>
    </>
  );
} 