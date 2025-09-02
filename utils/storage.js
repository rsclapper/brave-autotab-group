export class StorageManager {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      rules: [
        {
          id: 'social',
          name: 'Social Media',
          patterns: ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'tiktok.com'],
          color: 'blue',
          enabled: true
        },
        {
          id: 'google',
          name: 'Google Services',
          patterns: ['gmail.com', 'docs.google.com', 'drive.google.com', 'calendar.google.com', 'meet.google.com'],
          color: 'green',
          enabled: true
        },
        {
          id: 'dev',
          name: 'Development',
          patterns: ['github.com', 'gitlab.com', 'stackoverflow.com', 'npm.js', 'developer.mozilla.org'],
          color: 'purple',
          enabled: true
        },
        {
          id: 'news',
          name: 'News & Media',
          patterns: ['news.', 'bbc.com', 'cnn.com', 'reuters.com', 'techcrunch.com', 'ycombinator.com'],
          color: 'red',
          enabled: true
        },
        {
          id: 'shopping',
          name: 'Shopping',
          patterns: ['amazon.com', 'ebay.com', 'etsy.com', 'shopify.com', 'walmart.com'],
          color: 'orange',
          enabled: true
        }
      ],
      groupByDomain: true,
      autoCollapseGroups: false,
      maxTabsPerGroup: 50
    };
  }

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get('settings');
      return result.settings || this.defaultSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.defaultSettings;
    }
  }

  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ settings });
      console.log('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  async updateSettings(updates) {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...updates };
      return await this.saveSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }

  async addRule(rule) {
    try {
      const settings = await this.getSettings();
      rule.id = rule.id || this.generateRuleId();
      settings.rules.push(rule);
      return await this.saveSettings(settings);
    } catch (error) {
      console.error('Error adding rule:', error);
      return false;
    }
  }

  async updateRule(ruleId, updates) {
    try {
      const settings = await this.getSettings();
      const ruleIndex = settings.rules.findIndex(rule => rule.id === ruleId);
      
      if (ruleIndex !== -1) {
        settings.rules[ruleIndex] = { ...settings.rules[ruleIndex], ...updates };
        return await this.saveSettings(settings);
      }
      
      return false;
    } catch (error) {
      console.error('Error updating rule:', error);
      return false;
    }
  }

  async deleteRule(ruleId) {
    try {
      const settings = await this.getSettings();
      settings.rules = settings.rules.filter(rule => rule.id !== ruleId);
      return await this.saveSettings(settings);
    } catch (error) {
      console.error('Error deleting rule:', error);
      return false;
    }
  }

  generateRuleId() {
    return 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async exportSettings() {
    try {
      const settings = await this.getSettings();
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('Error exporting settings:', error);
      return null;
    }
  }

  async importSettings(settingsJson) {
    try {
      const settings = JSON.parse(settingsJson);
      // Validate settings structure
      if (settings && Array.isArray(settings.rules)) {
        return await this.saveSettings(settings);
      }
      return false;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }
}