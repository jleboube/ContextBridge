import React, { useState, useEffect } from 'react';
import { exportService } from '../services/apiService';
import { 
  DocumentTextIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ExportHistory = () => {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExport, setSelectedExport] = useState(null);

  useEffect(() => {
    loadExports();
  }, []);

  const loadExports = async () => {
    try {
      const response = await exportService.getExportHistory();
      setExports(response.exports);
    } catch (error) {
      toast.error('Failed to load export history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewExport = async (exportId) => {
    try {
      const response = await exportService.getExport(exportId);
      setSelectedExport(response.export);
    } catch (error) {
      toast.error('Failed to load export details');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatBadge = (format) => {
    const badges = {
      json: 'badge-primary',
      markdown: 'badge-green',
      context_prompt: 'badge-yellow'
    };
    return badges[format] || 'badge-gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Export History</h1>
        <p className="mt-2 text-gray-600">
          View and download your previously exported conversations.
        </p>
      </div>

      {/* Export List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Recent Exports</h3>
        </div>
        
        <div className="card-body">
          {exports.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No exports yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Export your conversations from project pages to see them here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exports.map((exportItem) => (
                    <tr key={exportItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {exportItem.projectName}
                            </div>
                            {exportItem.options?.conversationCount && (
                              <div className="text-sm text-gray-500">
                                {exportItem.options.conversationCount} conversations
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getFormatBadge(exportItem.format)}`}>
                          {exportItem.format.replace('_', ' ')}
                        </span>
                        {exportItem.targetProvider && exportItem.targetProvider !== 'generic' && (
                          <div className="text-xs text-gray-500 mt-1">
                            for {exportItem.targetProvider}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(exportItem.fileSizeBytes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(exportItem.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewExport(exportItem.id)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Export Detail Modal */}
      {selectedExport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                 onClick={() => setSelectedExport(null)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-4xl w-full max-h-[80vh]">
              <div className="bg-white px-4 pt-5 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Export Details
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedExport.projectName} • {selectedExport.format} • {formatFileSize(selectedExport.fileSizeBytes)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Create download link
                      const blob = new Blob([selectedExport.content], { 
                        type: selectedExport.format === 'json' ? 'application/json' : 'text/plain' 
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.style.display = 'none';
                      a.href = url;
                      a.download = `${selectedExport.projectName.replace(/[^a-z0-9]/gi, '_')}_export.${selectedExport.format === 'context_prompt' ? 'txt' : selectedExport.format}`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      
                      toast.success('Download started!');
                    }}
                    className="btn btn-primary"
                  >
                    <DocumentArrowDownIcon className="-ml-1 mr-2 h-4 w-4" />
                    Download
                  </button>
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedExport.content}
                  </pre>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 flex justify-end">
                <button
                  onClick={() => setSelectedExport(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportHistory;