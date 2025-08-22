const axios = require('axios');
const db = require('../database/connection');

class PluginService {
  constructor() {
    this.installedPlugins = new Map();
    this.pluginHooks = new Map();
    this.loadInstalledPlugins();
  }

  async loadInstalledPlugins() {
    try {
      const plugins = await db('plugin_installations')
        .join('plugins', 'plugin_installations.plugin_id', 'plugins.id')
        .where('plugin_installations.is_enabled', true)
        .where('plugins.status', 'active')
        .select('plugins.*', 'plugin_installations.configuration', 'plugin_installations.user_id', 'plugin_installations.team_id');

      for (const plugin of plugins) {
        this.registerPlugin(plugin);
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }

  registerPlugin(plugin) {
    const pluginConfig = {
      ...plugin,
      manifest: typeof plugin.manifest === 'string' ? JSON.parse(plugin.manifest) : plugin.manifest,
      configuration: typeof plugin.configuration === 'string' ? JSON.parse(plugin.configuration) : plugin.configuration
    };

    this.installedPlugins.set(plugin.id, pluginConfig);

    // Register plugin hooks
    if (pluginConfig.manifest.hooks) {
      for (const hookName of Object.keys(pluginConfig.manifest.hooks)) {
        if (!this.pluginHooks.has(hookName)) {
          this.pluginHooks.set(hookName, []);
        }
        this.pluginHooks.get(hookName).push(plugin.id);
      }
    }
  }

  async executeHook(hookName, data, context = {}) {
    const pluginsForHook = this.pluginHooks.get(hookName) || [];
    const results = [];

    for (const pluginId of pluginsForHook) {
      const plugin = this.installedPlugins.get(pluginId);
      if (!plugin) continue;

      try {
        const result = await this.executePluginHook(plugin, hookName, data, context);
        results.push({
          pluginId,
          pluginName: plugin.name,
          success: true,
          result
        });
      } catch (error) {
        console.error(`Plugin ${plugin.name} hook ${hookName} failed:`, error);
        results.push({
          pluginId,
          pluginName: plugin.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async executePluginHook(plugin, hookName, data, context) {
    const hookConfig = plugin.manifest.hooks[hookName];
    
    if (!hookConfig) {
      throw new Error(`Hook ${hookName} not found in plugin manifest`);
    }

    // Prepare the payload
    const payload = {
      hook: hookName,
      data,
      context: {
        userId: context.userId,
        teamId: context.teamId,
        timestamp: new Date().toISOString()
      },
      plugin: {
        id: plugin.id,
        name: plugin.name,
        configuration: plugin.configuration
      }
    };

    switch (hookConfig.type) {
      case 'webhook':
        return await this.executeWebhookHook(plugin, hookConfig, payload);
      case 'function':
        return await this.executeFunctionHook(plugin, hookConfig, payload);
      default:
        throw new Error(`Unsupported hook type: ${hookConfig.type}`);
    }
  }

  async executeWebhookHook(plugin, hookConfig, payload) {
    const webhookUrl = plugin.webhook_url || hookConfig.url;
    
    if (!webhookUrl) {
      throw new Error('No webhook URL configured');
    }

    const response = await axios.post(webhookUrl, payload, {
      timeout: hookConfig.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-ContextBridge-Plugin': plugin.name,
        'X-ContextBridge-Hook': hookConfig.name,
        ...(hookConfig.headers || {})
      }
    });

    return response.data;
  }

  async executeFunctionHook(plugin, hookConfig, payload) {
    // For function hooks, we would load and execute the plugin code
    // This is a simplified implementation - in production, this would
    // involve sandboxing and security measures
    throw new Error('Function hooks not implemented in this version');
  }

  // Plugin management methods
  async installPlugin(pluginId, userId = null, teamId = null, configuration = {}) {
    const plugin = await db('plugins').where({ id: pluginId }).first();
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    if (plugin.status !== 'active') {
      throw new Error('Plugin is not active');
    }

    // Check if already installed
    const existing = await db('plugin_installations')
      .where({ plugin_id: pluginId })
      .where(userId ? { user_id: userId } : { team_id: teamId })
      .first();

    if (existing) {
      throw new Error('Plugin already installed');
    }

    // Validate configuration against schema
    if (plugin.configuration_schema) {
      const schema = JSON.parse(plugin.configuration_schema);
      // Here you would validate configuration against the schema
      // For now, we'll skip validation
    }

    const [installation] = await db('plugin_installations')
      .insert({
        plugin_id: pluginId,
        user_id: userId,
        team_id: teamId,
        configuration: JSON.stringify(configuration)
      })
      .returning('*');

    // Register the plugin
    const fullPlugin = { ...plugin, configuration, user_id: userId, team_id: teamId };
    this.registerPlugin(fullPlugin);

    return installation;
  }

  async uninstallPlugin(pluginId, userId = null, teamId = null) {
    const deleted = await db('plugin_installations')
      .where({ plugin_id: pluginId })
      .where(userId ? { user_id: userId } : { team_id: teamId })
      .del();

    if (deleted > 0) {
      // Unregister the plugin
      this.installedPlugins.delete(pluginId);
      
      // Remove from hooks
      for (const [hookName, pluginIds] of this.pluginHooks.entries()) {
        const index = pluginIds.indexOf(pluginId);
        if (index > -1) {
          pluginIds.splice(index, 1);
        }
      }
    }

    return deleted > 0;
  }

  async updatePluginConfiguration(pluginId, userId = null, teamId = null, configuration) {
    const updated = await db('plugin_installations')
      .where({ plugin_id: pluginId })
      .where(userId ? { user_id: userId } : { team_id: teamId })
      .update({ configuration: JSON.stringify(configuration) });

    if (updated > 0) {
      // Update in memory
      const plugin = this.installedPlugins.get(pluginId);
      if (plugin) {
        plugin.configuration = configuration;
      }
    }

    return updated > 0;
  }

  async getAvailablePlugins() {
    return await db('plugins')
      .where({ status: 'active' })
      .select('*')
      .orderBy('is_official', 'desc')
      .orderBy('name', 'asc');
  }

  async getInstalledPlugins(userId = null, teamId = null) {
    return await db('plugin_installations')
      .join('plugins', 'plugin_installations.plugin_id', 'plugins.id')
      .where(userId ? { user_id: userId } : { team_id: teamId })
      .where('plugin_installations.is_enabled', true)
      .select(
        'plugins.*',
        'plugin_installations.configuration',
        'plugin_installations.installed_at',
        'plugin_installations.is_enabled'
      );
  }

  // Built-in plugin hooks for core functionality
  async onProjectCreated(projectId, userId) {
    return await this.executeHook('project.created', { projectId }, { userId });
  }

  async onConversationSummarized(conversationId, summary, userId) {
    return await this.executeHook('conversation.summarized', { 
      conversationId, 
      summary 
    }, { userId });
  }

  async onExportCreated(exportId, format, projectId, userId) {
    return await this.executeHook('export.created', {
      exportId,
      format,
      projectId
    }, { userId });
  }

  async onMessageAdded(messageId, conversationId, content, userId) {
    return await this.executeHook('message.added', {
      messageId,
      conversationId,
      content
    }, { userId });
  }

  // Plugin discovery and marketplace features
  async searchPlugins(query, category = null) {
    let searchQuery = db('plugins')
      .where('status', 'active')
      .where(function() {
        this.where('name', 'ilike', `%${query}%`)
          .orWhere('description', 'ilike', `%${query}%`);
      });

    if (category) {
      searchQuery = searchQuery.where('type', category);
    }

    return await searchQuery
      .select('*')
      .orderBy('is_official', 'desc')
      .orderBy('name', 'asc');
  }

  // Security and validation
  validatePermissions(plugin, requiredPermissions) {
    const pluginPermissions = plugin.permissions_granted || [];
    return requiredPermissions.every(permission => 
      pluginPermissions.includes(permission)
    );
  }

  async createOfficialPlugin(pluginData) {
    const manifest = {
      version: pluginData.version,
      hooks: pluginData.hooks || {},
      permissions: pluginData.permissions || [],
      configuration: pluginData.configurationSchema || null
    };

    const [plugin] = await db('plugins')
      .insert({
        name: pluginData.name,
        slug: pluginData.slug,
        description: pluginData.description,
        version: pluginData.version,
        author: 'ContextBridge',
        type: pluginData.type,
        manifest: JSON.stringify(manifest),
        configuration_schema: pluginData.configurationSchema ? 
          JSON.stringify(pluginData.configurationSchema) : null,
        is_official: true
      })
      .returning('*');

    return plugin;
  }
}

module.exports = new PluginService();