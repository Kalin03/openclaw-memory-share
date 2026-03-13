import React from 'react';
import { Printer, FileText } from 'lucide-react';

const PrintButton = ({ title = '打印记忆' }) => {
  const handlePrint = () => {
    // Set document title for print header
    const originalTitle = document.title;
    if (title) {
      document.title = title;
    }
    
    // Trigger print dialog
    window.print();
    
    // Restore original title
    document.title = originalTitle;
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
      title="打印此记忆"
    >
      <Printer size={16} />
      <span className="hidden sm:inline">打印</span>
    </button>
  );
};

export default PrintButton;