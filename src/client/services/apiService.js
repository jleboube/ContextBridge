import api from './authService';

export const projectService = {
  async getProjects(params = {}) {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  async getProject(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(projectData) {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  async updateProject(id, projectData) {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  async deleteProject(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  async getProjectStats() {
    const response = await api.get('/projects/stats');
    return response.data;
  }
};

export const conversationService = {
  async getConversations(projectId, params = {}) {
    const response = await api.get(`/conversations/project/${projectId}`, { params });
    return response.data;
  },

  async getConversation(id) {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  },

  async createConversation(conversationData) {
    const response = await api.post('/conversations', conversationData);
    return response.data;
  },

  async updateConversation(id, conversationData) {
    const response = await api.put(`/conversations/${id}`, conversationData);
    return response.data;
  },

  async deleteConversation(id) {
    const response = await api.delete(`/conversations/${id}`);
    return response.data;
  }
};

export const messageService = {
  async getMessages(conversationId, params = {}) {
    const response = await api.get(`/messages/conversation/${conversationId}`, { params });
    return response.data;
  },

  async addMessage(messageData) {
    const response = await api.post('/messages', messageData);
    return response.data;
  },

  async addMessageBatch(conversationId, messages) {
    const response = await api.post('/messages/batch', { conversationId, messages });
    return response.data;
  },

  async updateMessage(id, messageData) {
    const response = await api.put(`/messages/${id}`, messageData);
    return response.data;
  },

  async deleteMessage(id) {
    const response = await api.delete(`/messages/${id}`);
    return response.data;
  },

  async getMessageStats(conversationId) {
    const response = await api.get(`/messages/conversation/${conversationId}/stats`);
    return response.data;
  }
};

export const exportService = {
  async exportProject(projectId, options = {}) {
    const response = await api.post(`/exports/project/${projectId}`, options);
    return response.data;
  },

  async getExportHistory(params = {}) {
    const response = await api.get('/exports/history', { params });
    return response.data;
  },

  async getExport(id) {
    const response = await api.get(`/exports/${id}`);
    return response.data;
  },

  async downloadExport(projectId, options = {}) {
    const response = await api.post(`/exports/project/${projectId}?download=true`, options, {
      responseType: 'blob'
    });
    return response;
  }
};

export const summarizationService = {
  async summarizeConversation(conversationId, options = {}) {
    const response = await api.post('/summarization/summarize', {
      conversationId,
      ...options
    });
    return response.data;
  },

  async generateHandoff(conversationId, targetProvider, options = {}) {
    const response = await api.post('/summarization/handoff', {
      conversationId,
      targetProvider,
      ...options
    });
    return response.data;
  },

  async autoSummarize(conversationId, options = {}) {
    const response = await api.post(`/summarization/auto-summarize/${conversationId}`, options);
    return response.data;
  },

  async getSummarizationStatus(conversationId) {
    const response = await api.get(`/summarization/status/${conversationId}`);
    return response.data;
  },

  async batchSummarize(projectId, options = {}) {
    const response = await api.post('/summarization/batch-summarize', {
      projectId,
      ...options
    });
    return response.data;
  }
};