import React from 'react';
import BaseModal from './BaseModal';
import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';

interface UploadResult {
  filename: string;
  status: 'success' | 'created' | 'updated' | 'error';
  detail?: string;
  id?: string;
}

interface UploadResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: UploadResult[];
}

export default function UploadResultsModal({ isOpen, onClose, results }: UploadResultsModalProps) {
  const createdCount = results.filter(r => r.status === 'created' || r.status === 'success').length;
  const updatedCount = results.filter(r => r.status === 'updated').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Summary"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex gap-4 text-sm">
          {createdCount > 0 && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle size={18} weight="fill" />
              <span className="font-medium">{createdCount} New</span>
            </div>
          )}
          {updatedCount > 0 && (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <CheckCircle size={18} weight="fill" />
              <span className="font-medium">{updatedCount} Updated</span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <XCircle size={18} weight="fill" />
              <span className="font-medium">{errorCount} Failed</span>
            </div>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700">
          {results.map((result, index) => (
            <div key={index} className="p-3 flex items-start justify-between bg-white dark:bg-slate-800">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={result.filename}>
                  {result.filename}
                </div>
                {result.detail && (
                  <div className="text-xs text-red-500 mt-0.5">{result.detail}</div>
                )}
              </div>
              <div className="ml-3 flex-shrink-0">
                {result.status === 'created' || result.status === 'success' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    New
                  </span>
                ) : result.status === 'updated' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Updated
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    Error
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
