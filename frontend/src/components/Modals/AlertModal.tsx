import React from 'react';
import BaseModal from './BaseModal';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

export default function AlertModal({ isOpen, onClose, title = "Alert", message }: AlertModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-center">
        <p className="text-gray-600 dark:text-slate-300 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow cursor-pointer"
        >
          OK
        </button>
      </div>
    </BaseModal>
  );
}
