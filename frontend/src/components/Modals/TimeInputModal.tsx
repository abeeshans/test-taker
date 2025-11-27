import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { API_URL } from '@/lib/api';
import { createClient } from '@/utils/supabase/client';

interface TimeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (minutes: number, setIndex: number | null) => void;
  test: { id: string; title: string } | null;
}

interface TestSet {
  title: string;
  questions: any[];
}

export default function TimeInputModal({ isOpen, onClose, onConfirm, test }: TimeInputModalProps) {
  const [minutes, setMinutes] = useState<string>('');
  const [sets, setSets] = useState<TestSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && test) {
      setMinutes(''); // Reset time input
      setSelectedSet(0); // Default to first
      // Fetch immediately to prevent sequential loading
      fetchTestDetails();
    }
  }, [isOpen, test]);

  const fetchTestDetails = async () => {
    if (!test) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/tests/${test.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.content && data.content.sets) {
          setSets(data.content.sets);
          // Default to first set if only 1 exists, else 'all'
          if (data.content.sets.length > 0) {
             setSelectedSet(0);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(minutes, 10);
    if (!isNaN(mins) && mins > 0) {
      onConfirm(mins, selectedSet);
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Set Test Time">
      <form onSubmit={handleSubmit} className="text-center">
        <p className="text-gray-600 dark:text-slate-400 mb-4">How many minutes for this test?</p>
        <input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-full border border-gray-300 dark:border-slate-600 p-2 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          placeholder="e.g., 180"
          min="1"
          autoFocus
        />

        {loading ? (
          <div className="text-sm text-gray-500 dark:text-slate-400 mb-4">Loading sets...</div>
        ) : sets.length > 0 && (
          <div className="mb-6 text-left">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Choose set</label>
            <select
              value={selectedSet}
              onChange={(e) => setSelectedSet(parseInt(e.target.value))}
              className="w-full border border-gray-300 dark:border-slate-600 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              {sets.map((set, idx) => (
                <option key={idx} value={idx}>
                  {set.title || `Set ${idx + 1}`} ({set.questions.length} questions)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 dark:bg-purple-600 text-white hover:bg-blue-700 dark:hover:bg-purple-700 font-medium btn-primary"
            disabled={loading}
          >
            Start
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
