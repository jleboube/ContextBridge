import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { conversationService, messageService } from '../services/apiService';
import { 
  ArrowLeftIcon,
  PlusIcon,
  UserIcon,
  ComputerDesktopIcon,
  CogIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);

  useEffect(() => {
    loadConversation();
  }, [id]);

  const loadConversation = async () => {
    try {
      const response = await conversationService.getConversation(id);
      setConversation(response.conversation);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Conversation not found');
        navigate('/projects');
      } else {
        toast.error('Failed to load conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async (messageData) => {
    try {
      await messageService.addMessage({
        conversationId: id,
        ...messageData
      });
      
      await loadConversation(); // Refresh to get updated message list
      toast.success('Message added successfully!');
      setShowAddMessage(false);
    } catch (error) {
      toast.error('Failed to add message');
    }
  };

  const handleBatchImport = async (messages) => {
    try {
      await messageService.addMessageBatch(id, messages);
      
      await loadConversation(); // Refresh to get updated message list
      toast.success(`${messages.length} messages imported successfully!`);
      setShowBatchImport(false);
    } catch (error) {
      toast.error('Failed to import messages');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'user':
        return <UserIcon className="h-5 w-5" />;
      case 'assistant':
        return <ComputerDesktopIcon className="h-5 w-5" />;
      case 'system':
        return <CogIcon className="h-5 w-5" />;
      default:
        return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'user':
        return 'bg-blue-50 border-blue-200';
      case 'assistant':
        return 'bg-green-50 border-green-200';
      case 'system':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Conversation not found</h3>
        <button onClick={() => navigate(-1)} className="text-primary-600 hover:text-primary-500">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{conversation.title}</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="capitalize">{conversation.aiProvider}</span>
              {conversation.modelVersion && <span>{conversation.modelVersion}</span>}
              <span>{conversation.messageCount} messages</span>
              <span>Created {formatDate(conversation.createdAt)}</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBatchImport(true)}
              className="btn btn-outline"
            >
              <DocumentTextIcon className="-ml-1 mr-2 h-4 w-4" />
              Import Messages
            </button>
            <button
              onClick={() => setShowAddMessage(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              Add Message
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Messages</h3>
        </div>
        
        <div className="card-body p-0">
          {(!conversation.messages || conversation.messages.length === 0) ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by adding messages to this conversation.
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setShowAddMessage(true)}
                  className="btn btn-primary"
                >
                  <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                  Add First Message
                </button>
                <button
                  onClick={() => setShowBatchImport(true)}
                  className="btn btn-outline"
                >
                  <DocumentTextIcon className="-ml-1 mr-2 h-4 w-4" />
                  Import from File
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {conversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`border rounded-lg p-4 ${getRoleColor(message.role)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(message.role)}
                      <span className="font-medium text-gray-900 capitalize">
                        {message.role}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {message.content}
                    </div>
                  </div>
                  
                  {message.metadata && Object.keys(message.metadata).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        View metadata
                      </summary>
                      <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
                        {JSON.stringify(message.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Message Modal */}
      {showAddMessage && (
        <AddMessageModal
          onClose={() => setShowAddMessage(false)}
          onAdd={handleAddMessage}
        />
      )}

      {/* Batch Import Modal */}
      {showBatchImport && (
        <BatchImportModal
          onClose={() => setShowBatchImport(false)}
          onImport={handleBatchImport}
        />
      )}
    </div>
  );
};

// Add Message Modal Component
const AddMessageModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    role: 'user',
    content: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onAdd(formData);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-2xl w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Message</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="role" className="form-label">
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    required
                    className="form-input"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="user">User</option>
                    <option value="assistant">Assistant</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="content" className="form-label">
                    Content *
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required
                    rows={8}
                    className="form-input"
                    placeholder="Enter the message content..."
                    value={formData.content}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.content.trim()}
                className={`btn btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Adding...' : 'Add Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Batch Import Modal Component
const BatchImportModal = ({ onClose, onImport }) => {
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Try to parse as JSON first
      let messages;
      try {
        const parsed = JSON.parse(importData);
        if (Array.isArray(parsed)) {
          messages = parsed;
        } else if (parsed.messages && Array.isArray(parsed.messages)) {
          messages = parsed.messages;
        } else {
          throw new Error('Invalid format');
        }
      } catch {
        // If JSON parsing fails, treat as plain text
        const lines = importData.split('\n').filter(line => line.trim());
        messages = lines.map((line, index) => ({
          role: index % 2 === 0 ? 'user' : 'assistant',
          content: line.trim()
        }));
      }

      // Validate message format
      const validMessages = messages.filter(msg => 
        msg.content && msg.content.trim() && 
        ['user', 'assistant', 'system'].includes(msg.role)
      );

      if (validMessages.length === 0) {
        toast.error('No valid messages found in import data');
        return;
      }

      await onImport(validMessages);
    } catch (error) {
      toast.error('Failed to parse import data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-4xl w-full">
          <form onSubmit={handleImport}>
            <div className="bg-white px-4 pt-5 pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Import Messages</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Paste your conversation data as JSON or plain text:
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• JSON: {`[{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there!"}]`}</div>
                  <div>• Plain text: One message per line (alternating user/assistant)</div>
                </div>
              </div>

              <textarea
                className="form-input"
                rows={12}
                placeholder="Paste your conversation data here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />
            </div>
            
            <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !importData.trim()}
                className={`btn btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Importing...' : 'Import Messages'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetail;