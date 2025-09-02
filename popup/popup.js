class PopupManager {
  constructor() {
    this.isEnabled = true;
    this.currentWindowId = null;
    this.init();
  }

  async init() {
    await this.getCurrentWindow();
    await this.loadStatus();
    this.setupEventListeners();
    await this.refreshData();
  }

  async getCurrentWindow() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentWindowId = tab.windowId;
    } catch (error) {
      console.error('Error getting current window:', error);
    }
  }

  async loadStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
      this.isEnabled = response.enabled;
      this.updateToggleButton();
    } catch (error) {
      console.error('Error loading status:', error);
    }
  }

  setupEventListeners() {
    // Toggle button
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.toggleEnabled();
    });

    // Action buttons
    document.getElementById('groupAllBtn').addEventListener('click', () => {
      this.groupAllTabs();
    });

    document.getElementById('ungroupAllBtn').addEventListener('click', () => {
      this.ungroupAllTabs();
    });

    document.getElementById('collapseAllBtn').addEventListener('click', () => {
      this.collapseAllGroups();
    });

    // Footer buttons
    document.getElementById('optionsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshData();
    });
  }

  async toggleEnabled() {
    try {
      this.isEnabled = !this.isEnabled;
      
      await chrome.runtime.sendMessage({
        action: 'toggleEnabled',
        enabled: this.isEnabled
      });

      this.updateToggleButton();
      
      if (this.isEnabled) {
        await this.groupAllTabs();
      }
    } catch (error) {
      console.error('Error toggling enabled state:', error);
      this.isEnabled = !this.isEnabled; // Revert on error
      this.updateToggleButton();
    }
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('toggleBtn');
    const toggleText = toggleBtn.querySelector('.toggle-text');
    
    if (this.isEnabled) {
      toggleBtn.className = 'toggle-btn enabled';
      toggleText.textContent = 'Enabled';
    } else {
      toggleBtn.className = 'toggle-btn disabled';
      toggleText.textContent = 'Disabled';
    }
  }

  async groupAllTabs() {
    try {
      this.setLoading(true);
      await chrome.runtime.sendMessage({ action: 'groupAllTabs' });
      setTimeout(() => this.refreshData(), 500); // Give time for grouping to complete
    } catch (error) {
      console.error('Error grouping all tabs:', error);
      this.setLoading(false);
    }
  }

  async ungroupAllTabs() {
    try {
      this.setLoading(true);
      await chrome.runtime.sendMessage({ action: 'ungroupAllTabs' });
      setTimeout(() => this.refreshData(), 500); // Give time for ungrouping to complete
    } catch (error) {
      console.error('Error ungrouping all tabs:', error);
      this.setLoading(false);
    }
  }

  async collapseAllGroups() {
    try {
      this.setLoading(true);
      
      // Get all tab groups in the current window
      const tabGroups = await chrome.tabGroups.query({ windowId: this.currentWindowId });
      
      // Collapse all groups
      const collapsePromises = tabGroups.map(group => 
        chrome.tabGroups.update(group.id, { collapsed: true })
      );
      
      await Promise.all(collapsePromises);
      
      setTimeout(() => this.refreshData(), 300); // Give time for collapsing to complete
    } catch (error) {
      console.error('Error collapsing all groups:', error);
      this.setLoading(false);
    }
  }

  async refreshData() {
    try {
      this.setLoading(true);
      
      // Import GroupingEngine to get tab info
      const { GroupingEngine } = await import('../utils/grouping.js');
      const groupingEngine = new GroupingEngine();
      
      const tabGroupInfo = await groupingEngine.getTabGroupInfo(this.currentWindowId);
      
      this.updateStats(tabGroupInfo);
      this.renderGroups(tabGroupInfo.groups);
      this.renderUngroupedTabs(tabGroupInfo.ungroupedTabs);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      this.setLoading(false);
    }
  }

  updateStats(tabGroupInfo) {
    document.getElementById('groupCount').textContent = tabGroupInfo.totalGroups;
    document.getElementById('tabCount').textContent = tabGroupInfo.totalTabs;
  }

  renderGroups(groups) {
    const groupsList = document.getElementById('groupsList');
    
    if (groups.length === 0) {
      groupsList.innerHTML = '<div class="empty">No groups found</div>';
      return;
    }

    groupsList.innerHTML = groups.map(group => `
      <div class="group-item" data-group-id="${group.id}">
        <div class="group-info">
          <div class="group-color color-${group.color}"></div>
          <span class="group-name">${this.escapeHtml(group.title || 'Untitled')}</span>
          <span class="group-count">${group.tabs.length}</span>
        </div>
        <div class="group-actions">
          <button class="group-btn" data-action="toggle-collapse" data-group-id="${group.id}">
            ${group.collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button class="group-btn" data-action="ungroup" data-group-id="${group.id}">
            Ungroup
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners for group actions
    groupsList.addEventListener('click', (e) => {
      if (e.target.classList.contains('group-btn')) {
        const action = e.target.dataset.action;
        const groupId = parseInt(e.target.dataset.groupId);
        this.handleGroupAction(action, groupId);
      }
    });
  }

  renderUngroupedTabs(ungroupedTabs) {
    const ungroupedList = document.getElementById('ungroupedList');
    
    if (ungroupedTabs.length === 0) {
      ungroupedList.innerHTML = '<div class="empty">All tabs are grouped</div>';
      return;
    }

    ungroupedList.innerHTML = ungroupedTabs.map(tab => {
      const domain = this.extractDomain(tab.url);
      return `
        <div class="tab-item" data-tab-id="${tab.id}">
          <img class="tab-favicon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23999" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'}" 
               onerror="this.style.display='none'">
          <span class="tab-title">${this.escapeHtml(this.truncateText(tab.title, 25))}</span>
          <span class="tab-domain">${this.escapeHtml(domain)}</span>
        </div>
      `;
    }).join('');
  }

  async handleGroupAction(action, groupId) {
    try {
      switch (action) {
        case 'toggle-collapse':
          const group = await chrome.tabGroups.get(groupId);
          await chrome.tabGroups.update(groupId, {
            collapsed: !group.collapsed
          });
          break;

        case 'ungroup':
          const tabs = await chrome.tabs.query({ groupId });
          const tabIds = tabs.map(tab => tab.id);
          await chrome.tabs.ungroup(tabIds);
          break;
      }
      
      // Refresh data after action
      setTimeout(() => this.refreshData(), 300);
    } catch (error) {
      console.error('Error handling group action:', error);
    }
  }

  setLoading(isLoading) {
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.disabled = isLoading;
    });

    if (isLoading) {
      document.getElementById('groupsList').innerHTML = '<div class="loading">Loading...</div>';
      document.getElementById('ungroupedList').innerHTML = '<div class="loading">Loading...</div>';
    }
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      return 'unknown';
    }
  }

  truncateText(text, maxLength) {
    if (text && text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text || 'Untitled';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});