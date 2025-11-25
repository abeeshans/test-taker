import React, { useState } from 'react';
import BaseModal from './BaseModal';
import LoadingSpinner from '../LoadingSpinner';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isSubmitting?: boolean;
}

export default function CreateFolderModal({ isOpen, onClose, onConfirm, isSubmitting = false }: CreateFolderModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Create Folder">
      <form onSubmit={handleSubmit}>
        <p className="text-gray-600 dark:text-slate-300 mb-4">Enter a name for the new folder.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-2 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-500 dark:placeholder-slate-400"
          placeholder="Folder name"
          autoFocus
          disabled={isSubmitting}
        />
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 font-medium btn-primary flex items-center min-w-[80px] justify-center transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoadingSpinner size={20} color="text-white" /> : "Create"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
