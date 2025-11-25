import React, { useState } from 'react';
import BaseModal from './BaseModal';
import LoadingSpinner from '../LoadingSpinner';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  currentName: string;
  isSubmitting?: boolean;
}

export default function RenameModal({ isOpen, onClose, onConfirm, currentName, isSubmitting = false }: RenameModalProps) {
  const [name, setName] = useState(currentName);

  // Update local state when currentName changes
  React.useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Rename">
      <form onSubmit={handleSubmit}>
        <p className="text-gray-600 dark:text-slate-400 mb-4">Enter a new name.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 dark:border-slate-600 p-2 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          placeholder="Name"
          autoFocus
          disabled={isSubmitting}
        />
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium btn-primary flex items-center min-w-[80px] justify-center transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoadingSpinner size={20} color="text-white" /> : "Rename"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
