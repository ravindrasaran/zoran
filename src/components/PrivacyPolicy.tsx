import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ChevronLeft } from 'lucide-react';

export const PrivacyPolicy = ({ onBack }: { onBack: () => void }) => {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 bg-white dark:bg-slate-950 min-h-screen">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-6 font-bold">
        <ChevronLeft className="w-5 h-5" /> Back
      </button>
      <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-blue-600" /> Privacy Policy
      </h2>
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        <p><strong>Last Updated: March 20, 2026</strong></p>
        <p>ZORAN is committed to protecting your privacy. This policy outlines how we handle your data.</p>
        <h3 className="font-bold text-slate-800 dark:text-slate-200">1. Data Collection</h3>
        <p>We do not store any personal data, student marks, or academic records on our servers. All result data is fetched directly from official RBSE and Shala Darpan servers in real-time.</p>
        <h3 className="font-bold text-slate-800 dark:text-slate-200">2. Usage</h3>
        <p>Mobile numbers provided for pre-registration are used solely to send result alerts via SMS and are not used for any other purpose.</p>
        <h3 className="font-bold text-slate-800 dark:text-slate-200">3. Disclaimer</h3>
        <p>ZORAN is NOT an official RBSE app. We are an independent platform providing result access for convenience. We do not guarantee the accuracy of the data fetched.</p>
      </div>
    </motion.div>
  );
};
