'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import VerificationCheck from '@/components/VerificationCheck';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';


export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <VerificationCheck>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
          <Navbar />
        
        <main className="pt-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t('dashboard.welcome', { name: user?.name || '' })}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {t('dashboard.subtitle', { item: user?.role === 'landlord' ? t('dashboard.yourProperties') : t('dashboard.yourLeases') })}
              </p>
            </div>

            {/* Verification Status */}
            {user?.verificationStatus && (
              <div className="mb-6">
                <div className={`rounded-xl p-4 shadow-lg ${
                  user.verificationStatus.status === 'approved' 
                    ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700'
                    : user.verificationStatus.status === 'rejected'
                    ? 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700'
                    : 'bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      user.verificationStatus.status === 'approved'
                        ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                        : user.verificationStatus.status === 'rejected'
                        ? 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {user.verificationStatus.status === 'approved' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : user.verificationStatus.status === 'rejected' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {user.verificationStatus.status === 'approved' 
                          ? 'Approved'
                          : user.verificationStatus.status === 'rejected'
                          ? 'Rejected'
                          : 'Pending'
                        }
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {user.verificationStatus.status === 'approved'
                          ? 'Your identity has been verified successfully.'
                          : user.verificationStatus.status === 'rejected'
                          ? 'Your verification was rejected. Please contact support.'
                          : 'Your documents are being reviewed by our team.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.quickStats')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">{t('dashboard.active', { item: user?.role === 'landlord' ? t('dashboard.yourProperties') : t('dashboard.yourLeases') })}</span>
                    <span className="font-bold text-gray-900 dark:text-white">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">{t('dashboard.total', { item: user?.role === 'landlord' ? 'Income' : 'Rent' })}</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">$3,600</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">{t('dashboard.pendingTasks')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">2</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentActivity')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t('dashboard.rentReceived')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t('dashboard.maintenanceResolved')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t('dashboard.contractRenewal')}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.quickActions')}</h3>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 rounded-lg bg-orange-500 dark:bg-orange-600 text-white font-medium hover:bg-orange-600 dark:hover:bg-orange-700 transition-colors">
                    {user?.role === 'landlord' ? t('dashboard.addProperty') : t('dashboard.submitRequest')}
                  </button>
                  <button className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    {t('dashboard.viewDocuments')}
                  </button>
                  <button className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    {t('dashboard.contactSupport')}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {user?.role === 'landlord' ? t('dashboard.yourProperties') : t('dashboard.yourLeases')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Sunset Villa</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">456 Ocean View Drive</p>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-600 dark:text-orange-400 font-bold">$1,200/mo</span>
                    <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-2 py-1 rounded-full">Active</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Urban Loft</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">123 Main Street</p>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-600 dark:text-orange-400 font-bold">$1,500/mo</span>
                    <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-2 py-1 rounded-full">Active</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Garden House</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">789 Pine Street</p>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-600 dark:text-orange-400 font-bold">$1,800/mo</span>
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 px-2 py-1 rounded-full">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      </VerificationCheck>
    </ProtectedRoute>
  );
} 