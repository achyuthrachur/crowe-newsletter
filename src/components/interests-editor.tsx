'use client';

import { useState } from 'react';
import { SectionChips } from './section-chips';

interface Interest {
  section: string;
  label: string;
  type: string;
  weight: number;
}

interface InterestsEditorProps {
  interests: Interest[];
  onChange: (interests: Interest[]) => void;
}

const SUGGESTED_SECTIONS = [
  'AI',
  'Expertise',
  'Clients & Prospects',
  'Financial Services',
  'Technology',
  'Regulatory',
  'Tax',
  'Audit',
  'Consulting',
];

const INTEREST_TYPES = ['topic', 'industry', 'entity'] as const;

export function InterestsEditor({ interests, onChange }: InterestsEditorProps) {
  const [section, setSection] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<string>('topic');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const existingSections = [...new Set(interests.map((i) => i.section))];
  const allSections = [...new Set([...existingSections, ...SUGGESTED_SECTIONS])];

  const filteredSuggestions = allSections.filter((s) =>
    s.toLowerCase().includes(section.toLowerCase())
  );

  const handleAdd = () => {
    if (!section.trim() || !label.trim()) return;

    onChange([
      ...interests,
      { section: section.trim(), label: label.trim(), type, weight: 100 },
    ]);

    setLabel('');
    // Keep section for adding multiple interests to same section
  };

  const handleRemove = (index: number) => {
    const updated = interests.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      <SectionChips interests={interests} onRemove={handleRemove} />

      <div className="border border-tint-100 rounded-lg p-4 bg-white space-y-3">
        <h4 className="text-sm font-bold text-tint-700">Add Interest</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Section */}
          <div className="relative">
            <label className="block text-xs font-medium text-tint-500 mb-1">
              Section
            </label>
            <input
              type="text"
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g., AI"
              className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-tint-100 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSection(s);
                      setShowSuggestions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-crowe-indigo-dark/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-tint-500 mb-1">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., AI in financial services"
              className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-tint-500 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo bg-white"
            >
              {INTEREST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!section.trim() || !label.trim()}
          className="px-4 py-2 bg-crowe-indigo-dark text-white text-sm font-medium rounded-md hover:bg-crowe-indigo transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add Interest
        </button>
      </div>
    </div>
  );
}
