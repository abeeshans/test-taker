import React from 'react';
import BaseModal from './BaseModal';

interface ResetStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  testName: string;
}

export default function ResetStatsModal({ isOpen, onClose, onConfirm, testName }: ResetStatsModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Reset Stats">
      <div className="text-left">
        <p className="text-gray-700 dark:text-slate-300 mb-6">
          Are you sure you want to reset stats for <strong className="text-gray-900 dark:text-white">{testName}</strong>?
          <span className="block mt-2 text-red-600 dark:text-red-400 text-sm">This cannot be undone.</span>
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-medium transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
