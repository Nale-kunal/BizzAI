import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PurchaseReturnFormNew from './PurchaseReturnFormNew';

const PurchaseReturn = () => {
    const navigate = useNavigate();

    return (
        <Layout>
            {/* Header with button */}
            <div className="mb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-[rgb(var(--color-text))] mb-0.5">Purchase Return</h1>
                        <p className="text-xs text-gray-600 dark:text-[rgb(var(--color-text-secondary))]">Return purchased items to supplier</p>
                    </div>
                    <button
                        onClick={() => navigate('/purchase/returns/list')}
                        className="px-3 py-1.5 text-xs bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
                    >
                        View All Returns
                    </button>
                </div>
            </div>

            <PurchaseReturnFormNew />
        </Layout>
    );
};

export default PurchaseReturn;
