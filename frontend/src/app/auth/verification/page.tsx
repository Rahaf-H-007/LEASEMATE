'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import Navbar from '@/components/Navbar';

export default function VerificationPage() {
  const [step, setStep] = useState(1);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user, token } = useAuth();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idFront' | 'idBack' | 'selfie') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'idFront') setIdFrontFile(file);
      else if (type === 'idBack') setIdBackFile(file);
      else if (type === 'selfie') setSelfieFile(file);
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (!idFrontFile || !idBackFile) {
        setError('من فضلك قم بتحميل صورة أمامية وخلفية لبطاقتك');
        return;
      }
      setStep(2);
      setError('');
    } else if (step === 2) {
      if (!selfieFile) {
        setError('من فضلك قم بتحميل صورة شخصية بالكاميرا الأمامية');
        return;
      }
      
      setIsLoading(true);
      setError('');

      try {
        const formData = new FormData();
        if (idFrontFile) formData.append('idFile', idFrontFile);
        if (selfieFile) formData.append('selfieFile', selfieFile);

        await apiService.uploadVerification(formData, token || '');
        setSuccess(true);
        if (user?.role === 'tenant') {
          setTimeout(() => {
            router.push('/');
          }, 2000);
        }
     
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message || 'تحميل غير ناجح');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, type: 'idFront' | 'idBack' | 'selfie') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (type === 'idFront') setIdFrontFile(file);
      else if (type === 'idBack') setIdBackFile(file);
      else if (type === 'selfie') setSelfieFile(file);
    }
  };

  // If verification is rejected and user hasn't clicked Edit & Re-upload, show rejection message and images
  if (user?.verificationStatus?.status === 'rejected' && !showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              تم رفض التحقق
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              تم رفض تحققك. من فضلك قم بتحميل الوثائق مرة أخرى.
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
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              تعديل وإعادة تحميل
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">الإنتظار للموافقة</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">تم تقديم وثائق التحقق بنجاح. يرجى الانتظار للموافقة.</p>
            <div className="animate-pulse">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If showForm is true or not rejected, show the upload form as usual
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-500 dark:bg-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">التحقق </h1>
            </div>
           
            <h1 className="text-gray-600 dark:text-gray-300">
              سنقارن صورة بطاقتك بصورتك.
            </h1>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                الخطوة {step} من 2
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round((step / 2) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-orange-500 dark:bg-orange-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(step / 2) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {step === 1 ? 'تحميل وثائق الهوية' : 'تحميل صورة شخصية بالكاميرا الأمامية وانت تحمل البطاقة الشخصية'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {step === 1 
                  ? 'من فضلك قم بتحميل صورة أمامية وخلفية لبطاقتك.'
                  : "سنستخدم تعرف الوجه لمطابقة صورة بطاقتك بصورتك."
                }
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {step === 1 ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label 
                        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                          idFrontFile 
                            ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900' 
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-orange-500 dark:hover:border-orange-400'
                        }`}
                        htmlFor="front-id-upload"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'idFront')}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                          idFrontFile 
                            ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400' 
                            : 'bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-400'
                        }`}>
                          {idFrontFile ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.33-2.33 3 3 0 013.75 5.625" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-lg font-semibold ${
                          idFrontFile 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {idFrontFile ? 'تم تحميل الهوية الأمامية ✓' : 'تحميل صورة أمامية للبطاقة'}
                        </span>
                      </label>
                      <input 
                        className="sr-only" 
                        id="front-id-upload" 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'idFront')}
                      />
                    </div>

                    <div>
                      <label 
                        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                          idBackFile 
                            ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900' 
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-orange-500 dark:hover:border-orange-400'
                        }`}
                        htmlFor="back-id-upload"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'idBack')}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                          idBackFile 
                            ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400' 
                            : 'bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-400'
                        }`}>
                          {idBackFile ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.33-2.33 3 3 0 013.75 5.625" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-lg font-semibold ${
                          idBackFile 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {idBackFile ? 'تم تحميل الهوية الخلفية ✓' : 'تحميل صورة خلفية للبطاقة'}
                        </span>
                      </label>
                      <input 
                        className="sr-only" 
                        id="back-id-upload" 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'idBack')}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label 
                    className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                      selfieFile 
                        ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900' 
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-orange-500 dark:hover:border-orange-400'
                    }`}
                    htmlFor="selfie-upload"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                      selfieFile 
                        ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400' 
                        : 'bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-400'
                    }`}>
                      {selfieFile ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-lg font-semibold ${
                      selfieFile 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {selfieFile ? 'تم تحميل الصورة الشخصية ✓' : ' تحميل صورة شخصية بالكاميرا الأمامية وانت تحمل البطاقة الشخصية'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      قم بالسحب والإفلات لتحميل الصورة
                    </span>
                  </label>
                  <input 
                    className="sr-only" 
                    id="selfie-upload" 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'selfie')}
                  />
                </div>
              )}
            </div>

            <div className="mt-8">
              <button 
                onClick={handleContinue}
                disabled={isLoading}
                className="w-full bg-orange-500 dark:bg-orange-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-orange-600 dark:hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    'تحميل...'
                  </div>
                ) : (
                  'استمرار'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 