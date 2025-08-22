import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectService, conversationService, exportService } from '../services/apiService';
import { 
  ArrowLeftIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    try {
      const [projectResponse, conversationsResponse] = await Promise.all([
        projectService.getProject(id),
        conversationService.getConversations(id)
      ]);
      
      setProject(projectResponse.project);
      setConversations(conversationsResponse.conversations);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Project not found');
        navigate('/projects');
      } else {
        toast.error('Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format, options = {}) => {
    try {
      const response = await exportService.exportProject(id, {
        format,
        ...options
      });
      
      toast.success('Export completed successfully!');
      setShowExportModal(false);
      
      // Create download link
      const blob = new Blob([response.content], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_export.${format === 'context_prompt' ? 'txt' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Export failed. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProviderColor = (provider) => {
    const colors = {
      openai: 'text-green-600 bg-green-100',
      anthropic: 'text-orange-600 bg-orange-100',
      google: 'text-blue-600 bg-blue-100',
      mistral: 'text-purple-600 bg-purple-100',
      other: 'text-gray-600 bg-gray-100'
    };
    return colors[provider] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
        <Link to="/projects" className="text-primary-600 hover:text-primary-500">
          Return to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Projects
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-2 text-gray-600">{project.description}</p>
            
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {project.tags.map((tag, index) => (
                  <span key={index} className="badge badge-gray">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="mt-3 text-sm text-gray-500">
              Created {formatDate(project.createdAt)} • Last activity {formatDate(project.lastActivityAt)}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="btn btn-outline"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-4 w-4" />
              Export
            </button>
            <button className="btn btn-secondary">
              <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Conversations ({conversations.length})
            </h3>
            <button
              onClick={() => setShowNewConversation(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              Add Conversation
            </button>
          </div>
        </div>
        
        <div className="card-body">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by adding a conversation from your AI interactions.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="btn btn-primary"
                >
                  <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                  Add First Conversation
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex items-center space-x-4">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <Link
                        to={`/conversations/${conversation.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary-600"
                      >
                        {conversation.title}
                      </Link>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`badge text-xs ${getProviderColor(conversation.aiProvider)}`}>
                          {conversation.aiProvider}
                        </span>
                        <span className="text-xs text-gray-500">
                          {conversation.messageCount} messages
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(conversation.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                 onClick={() => setShowExportModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Project</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium">JSON Format</div>
                    <div className="text-sm text-gray-500">Complete data export for backup/restore</div>
                  </button>
                  
                  <button
                    onClick={() => handleExport('markdown')}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium">Markdown Format</div>
                    <div className="text-sm text-gray-500">Human-readable conversation history</div>
                  </button>
                  
                  <button
                    onClick={() => handleExport('context_prompt', { targetProvider: 'generic' })}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium">Context Prompt</div>
                    <div className="text-sm text-gray-500">AI-optimized format for handoff between providers</div>
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 flex justify-end">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConversation && (
        <NewConversationModal
          projectId={id}
          onClose={() => setShowNewConversation(false)}
          onCreated={(newConversation) => {
            setConversations([newConversation, ...conversations]);
            setShowNewConversation(false);
          }}
        />
      )}
    </div>
  );
};

// New Conversation Modal Component
const NewConversationModal = ({ projectId, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    aiProvider: 'openai',
    modelVersion: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await conversationService.createConversation({
        projectId,
        ...formData
      });
      
      toast.success('Conversation created successfully!');
      onCreated(response.conversation);
    } catch (error) {
      toast.error('Failed to create conversation');
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
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-lg w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Conversation</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="form-label">
                    Conversation Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className="form-input"
                    placeholder="e.g., Research Discussion, Code Review Session"
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="aiProvider" className="form-label">
                    AI Provider *
                  </label>
                  <select
                    id="aiProvider"
                    name="aiProvider"
                    required
                    className="form-input"
                    value={formData.aiProvider}
                    onChange={handleChange}
                  >
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="google">Google (Gemini)</option>
                    <option value="mistral">Mistral AI</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modelVersion" className="form-label">
                    Model Version
                  </label>
                  <input
                    type="text"
                    id="modelVersion"
                    name="modelVersion"
                    className="form-input"
                    placeholder="e.g., gpt-4, claude-3-sonnet"
                    value={formData.modelVersion}
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
                disabled={loading}
                className={`btn btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Creating...' : 'Create Conversation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;