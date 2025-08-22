import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectService } from '../services/apiService';
import { 
  PlusIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [projectsResponse, statsResponse] = await Promise.all([
        projectService.getProjects({ limit: 5 }),
        projectService.getProjectStats()
      ]);
      
      setProjects(projectsResponse.projects);
      setStats(statsResponse.stats);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your AI conversation projects and continue where you left off.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FolderIcon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Projects
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Projects
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {stats.active}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Archived
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {stats.archived}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {stats.completed}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Projects</h3>
            <Link
              to="/projects"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="card-body">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new project.
              </p>
              <div className="mt-6">
                <Link
                  to="/projects/new"
                  className="btn btn-primary"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  New Project
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <FolderIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary-600"
                      >
                        {project.name}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {project.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className={`badge ${
                      project.status === 'active' ? 'badge-green' :
                      project.status === 'completed' ? 'badge-primary' :
                      'badge-gray'
                    }`}>
                      {project.status}
                    </span>
                    <span>
                      {formatDate(project.lastActivityAt)}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="pt-4">
                <Link
                  to="/projects/new"
                  className="btn btn-outline w-full"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create New Project
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/projects/new"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-body text-center">
            <PlusIcon className="mx-auto h-8 w-8 text-primary-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">New Project</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start a new AI conversation project
            </p>
          </div>
        </Link>

        <Link
          to="/projects"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-body text-center">
            <FolderIcon className="mx-auto h-8 w-8 text-green-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Browse Projects</h3>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all your projects
            </p>
          </div>
        </Link>

        <Link
          to="/exports"
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="card-body text-center">
            <DocumentTextIcon className="mx-auto h-8 w-8 text-blue-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Export History</h3>
            <p className="mt-1 text-sm text-gray-500">
              View your exported conversations
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;