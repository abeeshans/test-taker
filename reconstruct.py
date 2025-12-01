# This Python script will reconstruct the MergeTestModal.tsx file
import os

# Read the backup (which is missing the source container section)
with open(r'frontend\src\components\Modals\MergeTestModal.tsx.backup', 'r', encoding='utf-8') as f:
    backup_lines = f.readlines()

# The backup is missing lines ~416-449 (the source container, controls)
# We need to insert the source container and controls sections before line 416

# Lines 1-415 are intact based on viewing
# Insert the source container (lines ~420-455) and controls (~457-465)
# Then continue with target container which exists in backup around line 416-449

source_container = '''                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex gap-3 min-h-0">
                    {/* Source Test Column */}
                    <div 
                        id="source-container"
                        ref={setSourceRef}
                        className={`flex-1 flex flex-col rounded-xl border p-3 transition-all duration-200 min-w-0 min-h-[300px] ${
                            highlightedContainer === 'source'
                                ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 dark:border-blue-400 ring-2 ring-blue-400 dark:ring-blue-600 shadow-lg z-10' 
                                : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600'
                        }`}
                    >
                        <input 
                            className="font-bold text-base mb-3 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-gray-900 dark:text-white transition-colors w-full"
                            value={sourceTitle}
                            onChange={(e) => setSourceTitle(e.target.value)}
                        />
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                            <SortableContext items={sourceSets.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                {sourceSets.map(set => (
                                    <SortableSetItem 
                                        key={set.id} 
                                        id={set.id} 
                                        title={set.title} 
                                        questionsCount={set.questions.length} 
                                        onRename={(t) => handleRename(set.id, t, 'source')}
                                    />
                                ))}
                            </SortableContext>
                            {sourceSets.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-600 italic text-sm border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-800/50">
                                    <p>No sets</p>
                                    <p className="text-xs opacity-70">Drop sets here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls Column */}
                    <div className="flex flex-col justify-center gap-2">
                        <button onClick={moveAllToTarget} className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-110 active:scale-95 shadow-sm" title="Move all to right">
                            <CaretRight size={16} weight="bold" />
                        </button>
                        <button onClick={moveAllToSource} className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-110 active:scale-95 shadow-sm" title="Move all to left">
                            <CaretRight size={16} weight="bold" className="rotate-180" />
                        </button>
                    </div>

                    {/* Target Test Column */}
                    <div 
                        id="target-container"
                        ref={setTargetRef}
                        className={`flex-1 flex flex-col rounded-xl border p-3 transition-colors min-w-0 min-h-[300px] ${
                            highlightedContainer === 'target'
'''

# Write reconstruction info
print("This reconstruction is incomplete - too complex for script")
print("Need manual approach")
