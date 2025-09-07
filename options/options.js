import { StorageManager } from '../utils/storage.js';
import { RuleEngine } from '../utils/rules.js';
import { HistoryAnalyzer } from '../utils/history-analyzer.js';

class OptionsManager {
  constructor() {
    this.storageManager = new StorageManager();
    this.ruleEngine = new RuleEngine();
    this.historyAnalyzer = new HistoryAnalyzer();
    this.currentSettings = null;
    this.editingRuleId = null;
    this.currentSuggestions = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.renderUI();
  }

  async loadSettings() {
    try {
      this.currentSettings = await this.storageManager.getSettings();
      this.ruleEngine.setRules(this.currentSettings.rules);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showStatus('Error loading settings', 'error');
    }
  }

  setupEventListeners() {
    // General settings
    document.getElementById('enabledToggle').addEventListener('change', (e) => {
      this.currentSettings.enabled = e.target.checked;
    });

    document.getElementById('domainGroupingToggle').addEventListener('change', (e) => {
      this.currentSettings.groupByDomain = e.target.checked;
    });

    document.getElementById('autoCollapseToggle').addEventListener('change', (e) => {
      this.currentSettings.autoCollapseGroups = e.target.checked;
    });

    document.getElementById('maxTabsInput').addEventListener('change', (e) => {
      this.currentSettings.maxTabsPerGroup = parseInt(e.target.value) || 50;
    });

    document.getElementById('groupSortSelect').addEventListener('change', (e) => {
      this.currentSettings.groupSortOrder = e.target.value;
    });

    // Header actions
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Rules management
    document.getElementById('addRuleBtn').addEventListener('click', () => {
      this.openRuleModal();
    });

    // Import/Export
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      this.importSettings(e.target.files[0]);
    });

    // Suggestions
    document.getElementById('analyzePlaceholderBtn').addEventListener('click', () => {
      this.analyzeHistoryAndGenerateSuggestions();
    });

    // Modal events
    this.setupModalEvents();
  }

  setupModalEvents() {
    // Rule modal
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeRuleModal();
    });

    document.getElementById('ruleModal').addEventListener('click', (e) => {
      if (e.target.id === 'ruleModal') {
        this.closeRuleModal();
      }
    });

    document.getElementById('ruleForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRule();
    });

    document.getElementById('testRuleBtn').addEventListener('click', () => {
      this.openTestModal();
    });

    // Test modal
    document.getElementById('closeTestModal').addEventListener('click', () => {
      this.closeTestModal();
    });

    document.getElementById('testModal').addEventListener('click', (e) => {
      if (e.target.id === 'testModal') {
        this.closeTestModal();
      }
    });

    document.getElementById('runTestBtn').addEventListener('click', () => {
      this.runRuleTest();
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeRuleModal();
        this.closeTestModal();
      }
    });
  }

  renderUI() {
    this.renderGeneralSettings();
    this.renderRules();
  }

  renderGeneralSettings() {
    document.getElementById('enabledToggle').checked = this.currentSettings.enabled;
    document.getElementById('domainGroupingToggle').checked = this.currentSettings.groupByDomain;
    document.getElementById('autoCollapseToggle').checked = this.currentSettings.autoCollapseGroups;
    document.getElementById('maxTabsInput').value = this.currentSettings.maxTabsPerGroup;
    document.getElementById('groupSortSelect').value = this.currentSettings.groupSortOrder || 'created';
  }

  renderRules() {
    const rulesList = document.getElementById('rulesList');
    
    if (!this.currentSettings.rules || this.currentSettings.rules.length === 0) {
      rulesList.innerHTML = '<div class="loading">No rules configured</div>';
      return;
    }

    rulesList.innerHTML = this.currentSettings.rules.map(rule => `
      <div class="rule-item" data-rule-id="${rule.id}">
        <div class="rule-info">
          <div class="rule-color color-${rule.color}"></div>
          <div class="rule-details">
            <div class="rule-name">${this.escapeHtml(rule.name)}</div>
            <div class="rule-patterns">
              ${rule.patterns.slice(0, 3).map(p => this.escapeHtml(p)).join(', ')}${rule.patterns.length > 3 ? ` +${rule.patterns.length - 3} more` : ''}
            </div>
          </div>
          <div class="rule-status ${rule.enabled ? 'enabled' : 'disabled'}">
            ${rule.enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <div class="rule-actions">
          <button class="rule-btn" data-action="edit" data-rule-id="${rule.id}">Edit</button>
          <button class="rule-btn" data-action="toggle" data-rule-id="${rule.id}">
            ${rule.enabled ? 'Disable' : 'Enable'}
          </button>
          <button class="rule-btn danger" data-action="delete" data-rule-id="${rule.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for rule actions
    rulesList.addEventListener('click', (e) => {
      if (e.target.classList.contains('rule-btn')) {
        const action = e.target.dataset.action;
        const ruleId = e.target.dataset.ruleId;
        this.handleRuleAction(action, ruleId);
      }
    });
  }

  async handleRuleAction(action, ruleId) {
    const rule = this.currentSettings.rules.find(r => r.id === ruleId);
    if (!rule) return;

    switch (action) {
      case 'edit':
        this.editRule(rule);
        break;

      case 'toggle':
        rule.enabled = !rule.enabled;
        this.renderRules();
        break;

      case 'delete':
        if (confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
          this.deleteRule(ruleId);
        }
        break;
    }
  }

  deleteRule(ruleId) {
    this.currentSettings.rules = this.currentSettings.rules.filter(r => r.id !== ruleId);
    this.renderRules();
  }

  openRuleModal(rule = null) {
    this.editingRuleId = rule ? rule.id : null;
    
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = rule ? 'Edit Rule' : 'Add New Rule';

    if (rule) {
      document.getElementById('ruleName').value = rule.name;
      document.getElementById('ruleColor').value = rule.color;
      document.getElementById('rulePatterns').value = rule.patterns.join('\n');
      document.getElementById('ruleEnabled').checked = rule.enabled;
    } else {
      document.getElementById('ruleForm').reset();
      document.getElementById('ruleEnabled').checked = true;
    }

    document.getElementById('ruleModal').classList.remove('hidden');
  }

  closeRuleModal() {
    document.getElementById('ruleModal').classList.add('hidden');
    this.editingRuleId = null;
  }

  editRule(rule) {
    this.openRuleModal(rule);
  }

  saveRule() {
    const name = document.getElementById('ruleName').value.trim();
    const color = document.getElementById('ruleColor').value;
    const patternsText = document.getElementById('rulePatterns').value.trim();
    const enabled = document.getElementById('ruleEnabled').checked;

    if (!name || !patternsText) {
      this.showStatus('Please fill in all required fields', 'error');
      return;
    }

    const patterns = patternsText.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (patterns.length === 0) {
      this.showStatus('Please add at least one URL pattern', 'error');
      return;
    }

    const ruleData = {
      name,
      color,
      patterns,
      enabled
    };

    if (this.editingRuleId) {
      // Edit existing rule
      const ruleIndex = this.currentSettings.rules.findIndex(r => r.id === this.editingRuleId);
      if (ruleIndex !== -1) {
        this.currentSettings.rules[ruleIndex] = {
          ...this.currentSettings.rules[ruleIndex],
          ...ruleData
        };
      }
    } else {
      // Add new rule
      const newRule = {
        id: this.generateRuleId(),
        ...ruleData
      };
      this.currentSettings.rules.push(newRule);
    }

    this.renderRules();
    this.closeRuleModal();
    this.showStatus('Rule saved successfully', 'success');
  }

  openTestModal() {
    // Get current rule data from form
    const patterns = document.getElementById('rulePatterns').value.trim()
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (patterns.length === 0) {
      this.showStatus('Please add URL patterns first', 'error');
      return;
    }

    this.testPatterns = patterns;
    document.getElementById('testModal').classList.remove('hidden');
    document.getElementById('testUrl').focus();
  }

  closeTestModal() {
    document.getElementById('testModal').classList.add('hidden');
    document.getElementById('testResults').innerHTML = '';
  }

  runRuleTest() {
    const testUrl = document.getElementById('testUrl').value.trim();
    const resultsDiv = document.getElementById('testResults');

    if (!testUrl) {
      resultsDiv.innerHTML = '<div class="test-results error">Please enter a URL to test</div>';
      return;
    }

    try {
      const urlObj = new URL(testUrl);
      const hostname = urlObj.hostname.toLowerCase();
      
      let matchFound = false;
      let matchedPattern = '';

      for (const pattern of this.testPatterns) {
        if (this.ruleEngine.matchesPattern(hostname, testUrl.toLowerCase(), pattern.toLowerCase())) {
          matchFound = true;
          matchedPattern = pattern;
          break;
        }
      }

      if (matchFound) {
        resultsDiv.innerHTML = `
          <div class="test-results success">
            ✅ URL matches pattern: <strong>${this.escapeHtml(matchedPattern)}</strong>
            <br>Hostname: ${this.escapeHtml(hostname)}
          </div>
        `;
      } else {
        resultsDiv.innerHTML = `
          <div class="test-results error">
            ❌ URL does not match any pattern
            <br>Hostname: ${this.escapeHtml(hostname)}
          </div>
        `;
      }
    } catch (error) {
      resultsDiv.innerHTML = '<div class="test-results error">❌ Invalid URL format</div>';
    }
  }

  async saveSettings() {
    try {
      const success = await this.storageManager.saveSettings(this.currentSettings);
      if (success) {
        this.showStatus('Settings saved successfully', 'success');
      } else {
        this.showStatus('Error saving settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings', 'error');
    }
  }

  async resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        this.currentSettings = this.storageManager.defaultSettings;
        this.renderUI();
        await this.saveSettings();
        this.showStatus('Settings reset to defaults', 'success');
      } catch (error) {
        console.error('Error resetting settings:', error);
        this.showStatus('Error resetting settings', 'error');
      }
    }
  }

  async exportSettings() {
    try {
      const settingsJson = await this.storageManager.exportSettings();
      if (settingsJson) {
        const blob = new Blob([settingsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auto-tab-group-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showStatus('Settings exported successfully', 'success');
      } else {
        this.showStatus('Error exporting settings', 'error');
      }
    } catch (error) {
      console.error('Error exporting settings:', error);
      this.showStatus('Error exporting settings', 'error');
    }
  }

  async importSettings(file) {
    if (!file) return;

    try {
      const text = await this.readFileAsText(file);
      const success = await this.storageManager.importSettings(text);
      
      if (success) {
        await this.loadSettings();
        this.renderUI();
        this.showStatus('Settings imported successfully', 'success');
      } else {
        this.showStatus('Invalid settings file format', 'error');
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      this.showStatus('Error importing settings', 'error');
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  generateRuleId() {
    return 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  showStatus(message, type) {
    const statusBar = document.getElementById('statusBar');
    const statusText = statusBar.querySelector('.status-text');
    
    statusText.textContent = message;
    statusBar.className = `status-bar ${type}`;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusBar.classList.add('hidden');
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async analyzeHistoryAndGenerateSuggestions() {
    try {
      const analyzeBtn = document.getElementById('analyzePlaceholderBtn');
      const suggestionsList = document.getElementById('suggestionsList');
      
      // Show loading state
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analyzing...';
      suggestionsList.innerHTML = '<div class="loading">Analyzing your browsing history...</div>';
      
      // Analyze history
      const analysisResult = await this.historyAnalyzer.analyzeHistory(7);
      
      // Filter out suggestions that overlap with existing rules
      const filteredSuggestions = await this.historyAnalyzer.filterExistingSuggestions(
        analysisResult.suggestions, 
        this.currentSettings.rules
      );
      
      this.currentSuggestions = filteredSuggestions;
      this.renderSuggestions(filteredSuggestions);
      
      // Reset button
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Refresh Analysis';
      
      if (filteredSuggestions.length === 0) {
        this.showStatus('No new rule suggestions found based on your recent browsing history', 'info');
      } else {
        this.showStatus(`Found ${filteredSuggestions.length} rule suggestions based on your browsing patterns`, 'success');
      }
      
    } catch (error) {
      console.error('Error analyzing history:', error);
      this.showStatus('Error analyzing browsing history. Please check permissions.', 'error');
      
      // Reset button
      const analyzeBtn = document.getElementById('analyzePlaceholderBtn');
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze History';
      
      document.getElementById('suggestionsList').innerHTML = 
        '<div class="suggestions-placeholder">Error loading suggestions. Please try again.</div>';
    }
  }

  renderSuggestions(suggestions) {
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (suggestions.length === 0) {
      suggestionsList.innerHTML = `
        <div class="suggestions-placeholder">
          No new rule suggestions found. Your current rules already cover your most visited sites!
        </div>
      `;
      return;
    }

    suggestionsList.innerHTML = suggestions.map(suggestion => `
      <div class="suggestion-item" data-suggestion-id="${suggestion.id}">
        <div class="suggestion-info">
          <div class="suggestion-header">
            <div class="suggestion-color color-${suggestion.color}"></div>
            <span class="suggestion-name">${this.escapeHtml(suggestion.name)}</span>
            <span class="suggestion-confidence">${suggestion.confidence}% confidence</span>
          </div>
          <div class="suggestion-details">
            <div class="suggestion-patterns">
              <strong>Domains:</strong> ${suggestion.patterns.slice(0, 3).map(p => this.escapeHtml(p)).join(', ')}${suggestion.patterns.length > 3 ? ` +${suggestion.patterns.length - 3} more` : ''}
            </div>
            <div class="suggestion-stats">
              <span class="suggestion-visits">${suggestion.totalVisits} visits</span> •
              <span class="suggestion-category">${this.escapeHtml(suggestion.category)}</span>
            </div>
          </div>
        </div>
        <div class="suggestion-actions">
          <button class="suggestion-btn accept" data-action="accept" data-suggestion-id="${suggestion.id}">
            Accept
          </button>
          <button class="suggestion-btn reject" data-action="reject" data-suggestion-id="${suggestion.id}">
            Dismiss
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners for suggestion actions
    suggestionsList.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-btn')) {
        const action = e.target.dataset.action;
        const suggestionId = e.target.dataset.suggestionId;
        this.handleSuggestionAction(action, suggestionId);
      }
    });
  }

  async handleSuggestionAction(action, suggestionId) {
    const suggestion = this.currentSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    try {
      if (action === 'accept') {
        // Convert suggestion to rule and add it
        const newRule = {
          id: this.generateRuleId(),
          name: suggestion.name,
          patterns: suggestion.patterns,
          color: suggestion.color,
          enabled: true
        };

        this.currentSettings.rules.push(newRule);
        await this.saveSettings();
        this.renderRules();
        
        this.showStatus(`Added rule "${suggestion.name}" successfully`, 'success');
      }

      // Remove suggestion from display (for both accept and reject)
      this.removeSuggestionFromDisplay(suggestionId);
      
    } catch (error) {
      console.error('Error handling suggestion action:', error);
      this.showStatus('Error processing suggestion', 'error');
    }
  }

  removeSuggestionFromDisplay(suggestionId) {
    const suggestionElement = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (suggestionElement) {
      suggestionElement.remove();
    }

    // Remove from current suggestions
    this.currentSuggestions = this.currentSuggestions.filter(s => s.id !== suggestionId);

    // If no more suggestions, show placeholder
    if (this.currentSuggestions.length === 0) {
      document.getElementById('suggestionsList').innerHTML = `
        <div class="suggestions-placeholder">
          All suggestions have been processed! Click "Refresh Analysis" to check for new ones.
        </div>
      `;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});