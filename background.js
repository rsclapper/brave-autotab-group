import { StorageManager } from './utils/storage.js';
import { GroupingEngine } from './utils/grouping.js';
import { RuleEngine } from './utils/rules.js';

class TabGroupManager {
  constructor() {
    this.storageManager = new StorageManager();
    this.groupingEngine = new GroupingEngine();
    this.ruleEngine = new RuleEngine();
    this.isEnabled = true;
    this.init();
  }

  async init() {
    console.log('Auto-Tab Group extension started');
    
    // Load settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Group existing tabs on startup
    if (this.isEnabled) {
      await this.groupExistingTabs();
    }
  }

  async loadSettings() {
    const settings = await this.storageManager.getSettings();
    this.isEnabled = settings.enabled;
    this.ruleEngine.setRules(settings.rules);
    console.log('Settings loaded:', settings);
  }

  setupEventListeners() {
    // Listen for new tabs
    chrome.tabs.onCreated.addListener((tab) => {
      if (this.isEnabled && tab.url && !tab.url.startsWith('chrome://')) {
        this.handleNewTab(tab);
      }
    });

    // Listen for tab updates (URL changes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (this.isEnabled && changeInfo.url && !changeInfo.url.startsWith('chrome://')) {
        this.handleTabUpdate(tab);
      }
    });

    // Listen for storage changes (settings updates)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.settings) {
        this.loadSettings();
      }
    });

    // Listen for messages from popup/options
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }

  async handleNewTab(tab) {
    try {
      await this.groupingEngine.processTab(tab, this.ruleEngine);
    } catch (error) {
      console.error('Error handling new tab:', error);
    }
  }

  async handleTabUpdate(tab) {
    try {
      // Ungroup from previous group if needed
      if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        const currentGroup = await chrome.tabGroups.get(tab.groupId);
        const newRule = this.ruleEngine.findMatchingRule(tab.url);
        
        if (newRule && newRule.name !== currentGroup.title) {
          await chrome.tabs.ungroup([tab.id]);
          await this.groupingEngine.processTab(tab, this.ruleEngine);
        }
      } else {
        await this.groupingEngine.processTab(tab, this.ruleEngine);
      }
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }

  async groupExistingTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const validTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://')
      );
      
      for (const tab of validTabs) {
        await this.groupingEngine.processTab(tab, this.ruleEngine);
      }
      
      console.log(`Processed ${validTabs.length} existing tabs`);
    } catch (error) {
      console.error('Error grouping existing tabs:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'toggleEnabled':
          this.isEnabled = request.enabled;
          await this.storageManager.updateSettings({ enabled: request.enabled });
          sendResponse({ success: true });
          break;

        case 'getStatus':
          sendResponse({ enabled: this.isEnabled });
          break;

        case 'groupAllTabs':
          await this.groupExistingTabs();
          sendResponse({ success: true });
          break;

        case 'ungroupAllTabs':
          await this.ungroupAllTabs();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async ungroupAllTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const groupedTabs = tabs.filter(tab => 
        tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
      );
      
      if (groupedTabs.length > 0) {
        const tabIds = groupedTabs.map(tab => tab.id);
        await chrome.tabs.ungroup(tabIds);
      }
      
      console.log(`Ungrouped ${groupedTabs.length} tabs`);
    } catch (error) {
      console.error('Error ungrouping all tabs:', error);
    }
  }
}

// Initialize the extension
new TabGroupManager();