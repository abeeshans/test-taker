import React, { useState } from 'react';
import BaseModal from './BaseModal';
import { Copy, Check, CaretDown, Sun, Moon, DotsThreeVertical } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../ThemeProvider';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionItem = ({ title, children, defaultOpen = false }: AccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between font-semibold text-left text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
      >
        <span className="text-base">{title}</span>
        <CaretDown
          size={16}
          className={`transition-transform duration-200 text-gray-500 dark:text-slate-400 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 pt-0 text-gray-700 dark:text-slate-300 prose prose-sm max-w-none border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [copied, setCopied] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleCopy = () => {
    const json = `{
    "id": "uuid-v4-string",
    "sets": [
        {
            "title": "Set A - Algebra",
            "questions": [
                {
                    "passage": "Solve for x.",
                    "question": "If 2x + 3 = 7, what is x?",
                    "options": ["1", "2", "3", "4"],
                    "correctAnswer": "2"
                }
            ]
        },
        {
            "title": "Set B - Geometry",
            "questions": [
                {
                    "question": "What is the area of a square with side length 4?",
                    "options": ["8", "12", "16", "20"],
                    "correctAnswer": "16"
                }
            ]
        }
    ]
}`;
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const darkModeToggle = (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        isDark ? 'bg-slate-950 border border-slate-700' : 'bg-blue-100 border border-blue-200'
      }`}
      title="Toggle Dark Mode"
    >
      <span className="sr-only">Toggle Dark Mode</span>
      
      {/* Icons Background Layer */}
      <div className="absolute inset-0 flex justify-between items-center px-2.5 pointer-events-none">
         <Sun size={18} weight="fill" className={`${isDark ? 'text-slate-600' : 'text-orange-400'} transition-colors duration-300`} />
         <Moon size={18} weight="fill" className={`${isDark ? 'text-blue-400' : 'text-blue-300/50'} transition-colors duration-300`} />
      </div>

      {/* Sliding Knob */}
      <span
        className={`absolute h-8 w-8 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-spring flex items-center justify-center ${
          isDark ? 'translate-x-11' : 'translate-x-1'
        }`}
      >
        {isDark ? (
          <Moon size={16} weight="fill" className="text-slate-800" />
        ) : (
          <Sun size={16} weight="fill" className="text-orange-400" />
        )}
      </span>
    </button>
  );

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Help & Information" 
      maxWidth="max-w-3xl"
      headerAction={darkModeToggle}
    >
      <div className="space-y-3 text-sm">
        <AccordionItem title="About SelfTest" defaultOpen>
          <p><strong>SelfTest</strong> is your personal study companion designed to transform lecture notes and slides into interactive practice tests. It helps you organize your study material, review efficiently, and track your performance over time.</p>
          <p className="mt-2"><strong>Core Philosophy:</strong> Active recall is the most effective way to learn. By creating and taking tests, you reinforce your memory and understanding of the subject matter.</p>
        </AccordionItem>

        <AccordionItem title="Quick Start Guide">
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Import Data:</strong> Click the <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium">Add More Files</span> button to upload your <code>.json</code> question files.</li>
            <li><strong>Organize:</strong> Create folders to categorize your tests by subject or course. Drag and drop tests into folders to keep your dashboard clean.</li>
            <li><strong>Take a Test:</strong> Click on any test card to begin. Set a timer if you want to simulate exam conditions.</li>
            <li><strong>Review:</strong> After completing a test, review your answers and see where you can improve.</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
            <div className="font-medium text-blue-900 dark:text-blue-200 mb-1">Pro Tips:</div>
            <ul className="list-disc pl-5 text-blue-800 dark:text-blue-300 space-y-1">
              <li>Use keyboard shortcuts (<strong>1-4</strong>) to select answers quickly.</li>
              <li>Use <strong>F</strong> to flag questions for review and <strong>P</strong> to pause the timer.</li>
              <li>Use the kebab menu (<DotsThreeVertical size={16} weight="bold" className="inline-block align-middle" />) on test cards to <strong>Rename</strong>, <strong>Reset Stats</strong>, or <strong>Delete</strong> them.</li>
            </ul>
          </div>
        </AccordionItem>

        <AccordionItem title="JSON Format & Examples">
          <p>SelfTest uses a simple, flexible JSON format for questions. You can include multiple "sets" of questions in a single file, which is great for grouping related topics.</p>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white">Accepted JSON Structure</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Example"}
              </button>
            </div>
            
            <div className="relative group">
              <pre className="p-4 rounded-lg text-xs bg-gray-900 dark:bg-slate-950 text-gray-300 overflow-auto max-h-80 font-mono leading-relaxed border border-gray-700 dark:border-slate-800 shadow-inner">
<code>{`{
    "id": "uuid-v4-string",
    "sets": [
        {
            "title": "Set A - Algebra",
            "questions": [
                {
                    "passage": "Solve for x.",
                    "question": "If 2x + 3 = 7, what is x?",
                    "options": ["1", "2", "3", "4"],
                    "correctAnswer": "2"
                }
            ]
        },
        {
            "title": "Set B - Geometry",
            "questions": [
                {
                    "question": "What is the area of a square with side length 4?",
                    "options": ["8", "12", "16", "20"],
                    "correctAnswer": "16"
                }
            ]
        }
    ]
}`}</code>
              </pre>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-500">
              Note: The <code>id</code> field is optional for new tests but required for updating existing ones. The <code>passage</code> field is optional.
            </p>
          </div>
        </AccordionItem>

        <AccordionItem title="Statistics & Progress">
          <p>Tracking your progress is key to improvement. SelfTest provides detailed statistics for each test:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Attempt History:</strong> See every time you've taken a test, your score, and the date.</li>
            <li><strong>Averages:</strong> View your average score to gauge your overall mastery.</li>
            <li><strong>Best Score:</strong> Challenge yourself to beat your personal best!</li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Troubleshooting">
          <div className="space-y-3">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Upload Failed?</div>
              <p className="text-gray-600 dark:text-slate-400">Ensure your JSON file is valid. Common errors include missing commas between items or unclosed brackets. You can use a JSON validator online to check your file.</p>
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">App Feeling Slow?</div>
              <p className="text-gray-600 dark:text-slate-400">If you have a very large number of tests or questions, try organizing them into more folders or splitting large JSON files into smaller ones.</p>
            </div>
          </div>
        </AccordionItem>

        <div className="pt-4 mt-2 text-xs text-gray-400 dark:text-slate-600 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
            <span>Last updated: {new Date().toLocaleDateString()}</span>
            <span>Designed & Built by <span className="font-medium text-gray-600 dark:text-slate-400">Abeeshan Selvabaskaran</span></span>
        </div>
      </div>
    </BaseModal>
  );
}
