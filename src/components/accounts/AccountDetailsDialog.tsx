import { X, Clock, AlertCircle, RefreshCw, Loader2, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { Account, ModelQuota } from '../../types/account';
import { formatDate } from '../../utils/format';
import { useTranslation } from 'react-i18next';
import * as accountService from '../../services/accountService';
import { useAccountStore } from '../../stores/useAccountStore';
import { useConfigStore } from '../../stores/useConfigStore';
import { showToast } from '../common/ToastContainer';
import { useEffect } from 'react';

interface AccountDetailsDialogProps {
    account: Account | null;
    onClose: () => void;
}

export default function AccountDetailsDialog({ account, onClose }: AccountDetailsDialogProps) {
    const { t } = useTranslation();
    const { fetchAccounts } = useAccountStore();
    const { config, loadConfig } = useConfigStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!config) {
            loadConfig();
        }
    }, [config, loadConfig]);

    if (!account) return null;

    const handleRefreshModels = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const models = await accountService.discoverModels(
                account.base_url || '',
                account.token.refresh_token || '',
                config?.proxy.upstream_proxy || { enabled: false, url: '' },
                config?.proxy.request_timeout || 30
            );
            await accountService.updateAccountModels(account.id, models);
            await fetchAccounts();
            showToast(t('proxy.model.custom_discovered', { count: models.length }), 'success');
        } catch (error) {
            console.error('Refresh models failed:', error);
            showToast(`${t('common.error')}: ${error}`, 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    return createPortal(
        <div className="modal modal-open z-[100]">
            {/* Draggable Top Region */}
            <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-8 z-[110]" />

            <div className="modal-box relative max-w-3xl bg-white dark:bg-base-100 shadow-2xl rounded-2xl p-0 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-base-200 bg-gray-50/50 dark:bg-base-200/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-base-content">{t('accounts.details.title')}</h3>
                        <div className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-base-200 border border-gray-200 dark:border-base-300 text-xs font-mono text-gray-500 dark:text-gray-400">
                            {account.email}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-circle btn-ghost text-gray-400 hover:bg-gray-100 dark:hover:bg-base-200 hover:text-gray-600 dark:hover:text-base-content transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                    {account.quota?.models?.map((model: ModelQuota) => (
                        <div key={model.name} className="p-4 rounded-xl border border-gray-100 dark:border-base-200 bg-white dark:bg-base-100 hover:border-blue-100 dark:hover:border-blue-900 hover:shadow-sm transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                    {model.name}
                                </span>
                                <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${model.percentage >= 50 ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        model.percentage >= 20 ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                            'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}
                                >
                                    {model.percentage}%
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-gray-100 dark:bg-base-200 rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${model.percentage >= 50 ? 'bg-emerald-500' :
                                        model.percentage >= 20 ? 'bg-orange-400' :
                                            'bg-red-500'
                                        }`}
                                    style={{ width: `${model.percentage}%` }}
                                ></div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                <Clock size={10} />
                                <span>{t('accounts.reset_time')}: {formatDate(model.reset_time) || t('common.unknown')}</span>
                            </div>
                        </div>
                    )) || (
                            <div className="col-span-2 py-10 text-center text-gray-400 flex flex-col items-center">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                                <span>{t('accounts.no_data')}</span>
                            </div>
                        )}
                </div>

                {/* Supported Models Section (For Custom Providers) */}
                {account.supported_models && account.supported_models.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-base-200">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t('accounts.details.supported_models')}
                            </h4>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('common.search')}
                                        className="h-6 w-32 pl-7 pr-2 text-[10px] bg-gray-50 dark:bg-base-200 border border-gray-200 dark:border-base-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                    />
                                </div>
                                {account.provider === 'custom' && (
                                    <button
                                        onClick={handleRefreshModels}
                                        disabled={isRefreshing}
                                        className="btn btn-xs btn-ghost gap-1 px-2 h-6 min-h-0 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                        {isRefreshing ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3 h-3" />
                                        )}
                                        {t('common.refresh')}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {account.supported_models
                                .filter(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((model) => (
                                    <span
                                        key={model}
                                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-800/50"
                                    >
                                        {model}
                                    </span>
                                ))}
                            {account.supported_models.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                <span className="text-xs text-gray-400 py-2 italic">{t('common.no_results')}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* No Supported Models for Custom Provider placeholder */}
                {account.provider === 'custom' && (!account.supported_models || account.supported_models.length === 0) && (
                    <div className="px-6 py-8 border-t border-gray-100 dark:border-base-200 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-8 h-8 text-gray-200 dark:text-gray-800 mb-2" />
                            <p className="text-sm text-gray-400">{t('proxy.router.no_custom_accounts')}</p>
                            <button
                                onClick={handleRefreshModels}
                                disabled={isRefreshing}
                                className="mt-4 btn btn-sm btn-outline btn-primary gap-2"
                            >
                                {isRefreshing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                {t('proxy.router.refresh_custom')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
        </div>,
        document.body
    );
}
