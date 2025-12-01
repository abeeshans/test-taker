import React, { useState, useRef, useEffect } from 'react';
import BaseModal from './BaseModal';
import { UploadSimple, FilePdf, X, Plus, FileCode, MagicWand } from '@phosphor-icons/react';
import { API_URL } from '@/lib/api';
import { createClient } from '@/utils/supabase/client';

interface AddFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadJson: (file: File) => void;
  onGenerateComplete: (newTestId: string) => void;
}

interface FileSet {
  id: string;
  file: File;
  name: string;
  numQuestions: number;
  difficulty: 'Simple' | 'Average' | 'Challenging';
}

export default function AddFilesModal({ isOpen, onClose, onUploadJson, onGenerateComplete }: AddFilesModalProps) {
  const [testName, setTestName] = useState('');
  const [sets, setSets] = useState<FileSet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Simulate progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // Stall at 90%
          // Slow down as we get closer to 90
          const increment = Math.max(0.5, (90 - prev) / 50); 
          return prev + increment;
        });
      }, 100);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);
  
  const lectureInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Set default test name from first file
  useEffect(() => {
    if (sets.length > 0 && !testName) {
      setTestName(sets[0].file.name.replace(/\.[^/.]+$/, ""));
    }
  }, [sets, testName]);

  const handleLectureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newSets: FileSet[] = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name.replace(/\.[^/.]+$/, ""),
        numQuestions: 5,
        difficulty: 'Average'
      }));
      setSets(prev => [...prev, ...newSets]);
    }
    // Reset input
    if (lectureInputRef.current) lectureInputRef.current.value = '';
  };

  const handleJsonSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith('.json')) {
        onUploadJson(file);
        onClose();
      } else {
        setError("Please select a valid JSON file.");
      }
    }
  };

  const removeSet = (id: string) => {
    setSets(prev => prev.filter(s => s.id !== id));
  };

  const updateSet = (id: string, updates: Partial<FileSet>) => {
    setSets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleGenerate = async () => {
    if (sets.length === 0) {
      setError("Please add at least one lecture file.");
      return;
    }
    if (!testName.trim()) {
      setError("Please enter a test name.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append('test_name', testName);
      
      const configs: Record<string, any> = {};
      
      sets.forEach(set => {
        formData.append('files', set.file);
        configs[set.file.name] = {
          name: set.name,
          numQuestions: set.numQuestions,
          difficulty: set.difficulty
        };
      });
      
      formData.append('configurations', JSON.stringify(configs));

      const response = await fetch(`${API_URL}/generate-test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to generate test");
      }

      const data = await response.json();
      onGenerateComplete(data.id);
      onClose();
      
      // Reset state
      setSets([]);
      setTestName('');
      
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Test"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => lectureInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
          >
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full mb-3 group-hover:scale-110 transition-transform">
              <FilePdf size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-medium text-gray-700 dark:text-slate-200">Upload Lecture/Notes</span>
            <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">PDF, PPT, Images</span>
          </button>
          
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
          >
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full mb-3 group-hover:scale-110 transition-transform">
              <FileCode size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="font-medium text-gray-700 dark:text-slate-200">Upload JSON</span>
            <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">Existing Test File</span>
          </button>
        </div>

        <input
          type="file"
          ref={lectureInputRef}
          onChange={handleLectureSelect}
          className="hidden"
          multiple
          accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg"
        />
        <input
          type="file"
          ref={jsonInputRef}
          onChange={handleJsonSelect}
          className="hidden"
          accept=".json"
        />

        {/* Configuration Area */}
        {sets.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="border-t dark:border-slate-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Test Name
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter test name..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Selected Files</h3>
                <button
                  onClick={() => lectureInputRef.current?.click()}
                  className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Plus size={14} /> Add more
                </button>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {sets.map((set) => (
                  <div key={set.id} className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                            <FilePdf size={20} className="text-red-500 flex-shrink-0" />
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate" title={set.file.name}>
                              {set.file.name}
                            </span>
                         </div>
                         <input
                            type="text"
                            value={set.name}
                            onChange={(e) => updateSet(set.id, { name: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400"
                            placeholder="Set Name"
                         />
                      </div>
                      <button
                        onClick={() => removeSet(set.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors mt-1"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Questions</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={set.numQuestions}
                          onChange={(e) => updateSet(set.id, { numQuestions: parseInt(e.target.value) || 5 })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Difficulty</label>
                        <select
                          value={set.difficulty}
                          onChange={(e) => updateSet(set.id, { difficulty: e.target.value as any })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                          <option value="Simple">Simple</option>
                          <option value="Average">Average</option>
                          <option value="Challenging">Challenging</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex flex-col items-center w-full px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating Test...</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mb-2 overflow-hidden">
                    <div 
                      className="bg-white h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/80 animate-pulse">
                    Get a coffee, this can take a while...
                  </span>
                </div>
              ) : (
                <>
                  <MagicWand size={20} weight="fill" />
                  Generate Test
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
