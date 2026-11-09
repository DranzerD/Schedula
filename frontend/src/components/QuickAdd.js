/**
 * QuickAdd Component
 * "Describe a task in plain English" -> POST /api/ai/parse-task -> opens the
 * task form pre-filled so the user can review before saving. Nothing is
 * saved automatically.
 */

import React, { useState } from "react";
import { aiAPI } from "../services/api";

const EXAMPLES = [
  "Finish the quarterly report by Friday 5pm, 3 hours, high priority, deep focus",
  "Dentist appointment tomorrow at 3pm for 1 hour",
  "Reply to emails today, 30 min, low priority",
];

const QuickAdd = ({ onParsed }) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 3 || loading) return;

    setLoading(true);
    setError("");
    try {
      const response = await aiAPI.parseTask(text.trim());
      onParsed(response.data.data);
      setText("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.message ||
          "Couldn't understand that — try adding a title and a deadline.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-4">
      <form onSubmit={handleSubmit}>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
          <span>✨</span> Describe a task in plain English
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            maxLength={500}
            placeholder={EXAMPLES[0]}
            className="flex-1 min-w-0 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={loading || text.trim().length < 3}
            className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Thinking…" : "Parse"}
          </button>
        </div>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {!error && (
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.slice(1).map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setText(example)}
              className="text-xs text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 px-2.5 py-1 rounded-full transition-colors truncate max-w-full"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuickAdd;
