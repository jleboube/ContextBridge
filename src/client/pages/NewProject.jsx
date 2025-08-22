import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/apiService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const NewProject = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const projectData = {
        name: formData.name,
        description: formData.description || undefined,
        tags: tags.length > 0 ? tags : undefined
      };

      const response = await projectService.createProject(projectData);
      
      toast.success('Project created successfully!');
      navigate(`/projects/${response.project.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create project');
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
        <p className="mt-2 text-gray-600">
          Set up a new workspace for organizing your AI conversations.
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body space-y-6">
          <div>
            <label htmlFor="name" className="form-label">
              Project Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="form-input"
              placeholder="e.g., Research Project, Content Strategy, Code Review"
              value={formData.name}
              onChange={handleChange}
            />
            <p className="mt-1 text-sm text-gray-500">
              Choose a descriptive name for your project.
            </p>
          </div>

          <div>
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="form-input"
              placeholder="Describe the purpose and goals of this project..."
              value={formData.description}
              onChange={handleChange}
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional: Provide context about what this project is for.
            </p>
          </div>

          <div>
            <label htmlFor="tags" className="form-label">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              className="form-input"
              placeholder="research, writing, analysis (comma-separated)"
              value={formData.tags}
              onChange={handleChange}
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional: Add tags separated by commas to help organize your projects.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className={`btn btn-primary ${
                (loading || !formData.name.trim()) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">What's next?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Add conversations from different AI providers</li>
          <li>• Import existing chat logs in JSON or text format</li>
          <li>• Export your project for AI handoff between platforms</li>
          <li>• Use tags to organize related projects</li>
        </ul>
      </div>
    </div>
  );
};

export default NewProject;