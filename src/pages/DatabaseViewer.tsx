import React from 'react';
import DatabaseViewer from '@/components/DatabaseViewer';

const DatabaseViewerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DatabaseViewer />
    </div>
  );
};

export default DatabaseViewerPage;