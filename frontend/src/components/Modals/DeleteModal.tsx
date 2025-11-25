import React, { useState } from 'react';
import BaseModal from './BaseModal';
import LoadingSpinner from '../LoadingSpinner';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (moveContentsToParent?: boolean) => void;
  itemName: string;
  isFolder: boolean;
  isSubmitting?: boolean;
}

export default function DeleteModal({ isOpen, onClose, onConfirm, itemName, isFolder, isSubmitting = false }: DeleteModalProps) {
  const [moveToParent, setMoveToParent] = useState(false);

  const handleConfirm = () => {
    onConfirm(isFolder ? moveToParent : undefined);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={`Delete ${isFolder ? 'Folder' : 'Test'}`}>
      <div className="mb-6">
        <p className="text-gray-600 dark:text-slate-400">
          Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{itemName}</span>?
        </p>
        {isFolder && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">What should happen to the folder's contents?</p>
            
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
              !moveToParent ? 'border-blue-500 dark:border-purple-600 bg-blue-50 dark:bg-purple-900/10' : 'border-gray-200 dark:border-slate-700'
            }`}>
              <input
                type="radio"
                name="deleteOption"
                checked={!moveToParent}
                onChange={() => setMoveToParent(false)}
                className="mt-1 text-blue-600 dark:text-purple-600"
               />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Delete all contents</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">Permanently delete all tests and subfolders inside this folder</div>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
              moveToParent ? 'border-blue-500 dark:border-purple-600 bg-blue-50 dark:bg-purple-900/10' : 'border-gray-200 dark:border-slate-700'
            }`}>
              <input
                type="radio"
                name="deleteOption"
                checked={moveToParent}
                onChange={() => setMoveToParent(true)}
                className="mt-1 text-blue-600 dark:text-purple-600"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Move contents to parent</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">Keep all tests and subfolders by moving them to the parent directory</div>
              </div>
            </label>
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 font-medium"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-medium flex items-center min-w-[80px] justify-center shadow-sm hover:shadow"
          disabled={isSubmitting}
        >
          {isSubmitting ? <LoadingSpinner size={20} color="text-white" /> : "Delete"}
        </button>
      </div>
    </BaseModal>
  );
}
