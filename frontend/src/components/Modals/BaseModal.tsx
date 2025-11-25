import React from 'react';
import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  headerAction?: React.ReactNode;
  contentClassName?: string;
}

export default function BaseModal({ isOpen, onClose, title, children, maxWidth = 'max-w-md', headerAction, contentClassName = "p-6 overflow-y-auto" }: BaseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.3 }}
            className={`bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full ${maxWidth} flex flex-col z-10 relative max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
              <div className="flex items-center gap-2">
                {headerAction}
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className={contentClassName}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
