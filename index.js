"use strict";

const { Plugin, Setting, Dialog, showMessage, fetchSyncPost, getActiveEditor } = require("siyuan");

const SETTINGS_FILE = "settings.json";
const DOCK_TYPE = "siyuan-to-wiki-dock";
const DEFAULT_SETTINGS = {
  apiBaseUrl: "",
  siteUrl: "",
  apiKey: "",
  mappings: {},
  lastPublished: null,
};

module.exports = class SiyuanToWikiPlugin extends Plugin {
  constructor(...args) {
    super(...args);
    this.settings = { ...DEFAULT_SETTINGS };
    this.dock = null;
    this.logs = [];
    this.logDialog = null;
    this.publishedDialog = null;
    this.publishedFilter = "";
    this.menuObserver = null;
  }

  async onload() {
    await this.loadSettings();
    this.setupSettings();
    this.registerMenus();
    this.setupMenuObserver();
    this.addDock({
      config: {
        position: "LeftBottom",
        size: {
          width: 320,
          height: 0,
        },
        icon: "iconSettings",
        title: "思源推送 Wiki",
      },
      data: {},
      type: DOCK_TYPE,
      init: (dock) => {
        this.dock = dock;
        this.renderDock(dock.element);
      },
      update: () => {
        if (this.dock) {
          this.renderDock(this.dock.element);
        }
      },
      destroy: () => {
        this.dock = null;
      },
    });
    this.addTopBar({
      icon: "iconSettings",
      title: "思源推送 Wiki 设置",
      position: "right",
      callback: () => this.openSetting(),
    });
    this.registerCommand({
      command: "siyuan-to-wiki-open-settings",
      description: "Open Siyuan To Wiki settings",
      callback: () => this.openSetting(),
    });
    this.registerCommand({
      command: "siyuan-to-wiki-publish-current",
      description: "Publish current document to Wiki",
      callback: () => this.publishFromMenu(),
    });

    showMessage("SiYuan To Wiki plugin loaded", 3000, "info");
    this.addLog("info", "插件已加载");
    setTimeout(() => this.openSetting(), 800);
    console.log("[siyuan-to-wiki] plugin loaded with settings", {
      apiBaseUrl: this.settings.apiBaseUrl,
      hasApiKey: Boolean(this.settings.apiKey),
    });
  }

  openSetting() {
    if (this.setting) {
      this.setting.open("思源推送 Wiki");
    }
  }

  async onunload() {
    this.menuObserver?.disconnect();
    this.menuObserver = null;
    await this.saveSettings();
    console.log("[siyuan-to-wiki] plugin unloaded");
  }

  async loadSettings() {
    const saved = await this.loadData(SETTINGS_FILE);
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(saved || {}),
    };
    this.settings.apiBaseUrl = String(this.settings.apiBaseUrl || "").trim().replace(/\/+$/, "");
    this.settings.siteUrl = String(this.settings.siteUrl || "").trim().replace(/\/+$/, "");
    this.settings.apiKey = String(this.settings.apiKey || "").trim();
    this.settings.mappings = this.normalizeMappings(this.settings.mappings);
  }

  async saveSettings() {
    await this.saveData(SETTINGS_FILE, this.settings);
  }

  renderDock(container) {
    container.innerHTML = `
      <div class="siyuan-to-wiki-dock">
        <div class="siyuan-to-wiki-dock__header">
          <svg class="siyuan-to-wiki-dock__icon"><use xlink:href="#iconSettings"></use></svg>
          <span>思源推送 Wiki</span>
        </div>
        <label class="siyuan-to-wiki-dock__section">
          <span class="siyuan-to-wiki-dock__label">API Base URL</span>
          <input
            id="siyuan-to-wiki-dock-base-url"
            class="b3-text-field siyuan-to-wiki-dock__input"
            placeholder="https://your-wiki.example.com/api/v1"
            value="${this.escapeAttr(this.settings.apiBaseUrl)}"
          />
        </label>
        <label class="siyuan-to-wiki-dock__section">
          <span class="siyuan-to-wiki-dock__label">API Key</span>
          <input
            id="siyuan-to-wiki-dock-api-key"
            type="password"
            class="b3-text-field siyuan-to-wiki-dock__input"
            placeholder="Paste your API key here"
            value="${this.escapeAttr(this.settings.apiKey)}"
          />
        </label>
        <label class="siyuan-to-wiki-dock__section">
          <span class="siyuan-to-wiki-dock__label">站点 URL</span>
          <input
            id="siyuan-to-wiki-dock-site-url"
            class="b3-text-field siyuan-to-wiki-dock__input"
            placeholder="https://your-wiki.example.com"
            value="${this.escapeAttr(this.settings.siteUrl)}"
          />
        </label>
        <div id="siyuan-to-wiki-dock-status" class="siyuan-to-wiki-dock__status">已就绪，先配置 API 再测试连接。</div>
        <div class="siyuan-to-wiki-dock__actions">
          <div class="siyuan-to-wiki-dock__row">
            <button id="siyuan-to-wiki-dock-save" class="b3-button b3-button--outline siyuan-to-wiki-dock__button">保存配置</button>
            <button id="siyuan-to-wiki-dock-open" class="b3-button b3-button--cancel siyuan-to-wiki-dock__button">弹窗设置</button>
          </div>
          <div class="siyuan-to-wiki-dock__row">
            <button id="siyuan-to-wiki-dock-test" class="b3-button b3-button--outline siyuan-to-wiki-dock__button">测试连接</button>
            <button id="siyuan-to-wiki-dock-publish" class="b3-button b3-button--text siyuan-to-wiki-dock__button">发布当前文档</button>
          </div>
          <div class="siyuan-to-wiki-dock__row">
            <button id="siyuan-to-wiki-dock-open-last" class="b3-button b3-button--outline siyuan-to-wiki-dock__button">已发布列表</button>
            <button id="siyuan-to-wiki-dock-logs" class="b3-button b3-button--outline siyuan-to-wiki-dock__button">查看日志</button>
          </div>
          <div class="siyuan-to-wiki-dock__hint">${this.renderLastPublishedHint()}</div>
        </div>
      </div>
    `;

    const saveButton = container.querySelector("#siyuan-to-wiki-dock-save");
    const openButton = container.querySelector("#siyuan-to-wiki-dock-open");
    const testButton = container.querySelector("#siyuan-to-wiki-dock-test");
    const publishButton = container.querySelector("#siyuan-to-wiki-dock-publish");
    const openLastButton = container.querySelector("#siyuan-to-wiki-dock-open-last");
    const logsButton = container.querySelector("#siyuan-to-wiki-dock-logs");
    const baseUrlInput = container.querySelector("#siyuan-to-wiki-dock-base-url");
    const apiKeyInput = container.querySelector("#siyuan-to-wiki-dock-api-key");
    const siteUrlInput = container.querySelector("#siyuan-to-wiki-dock-site-url");
    const statusElement = container.querySelector("#siyuan-to-wiki-dock-status");
    const hintElement = container.querySelector(".siyuan-to-wiki-dock__hint");

    saveButton?.addEventListener("click", async () => {
      this.settings.apiBaseUrl = (baseUrlInput?.value || "").trim().replace(/\/+$/, "");
      this.settings.apiKey = (apiKeyInput?.value || "").trim();
      this.settings.siteUrl = (siteUrlInput?.value || "").trim().replace(/\/+$/, "");
      await this.saveSettings();
      this.setDockStatus("配置已保存。");
      this.addLog("info", `配置已保存，API：${this.settings.apiBaseUrl || "未填写"}，站点：${this.settings.siteUrl || "未填写"}`);
      showMessage("Siyuan To Wiki 配置已保存", 3000, "info");
    });

    openButton?.addEventListener("click", () => this.openSetting());
    testButton?.addEventListener("click", async () => {
      this.settings.apiBaseUrl = (baseUrlInput?.value || "").trim().replace(/\/+$/, "");
      this.settings.apiKey = (apiKeyInput?.value || "").trim();
      this.settings.siteUrl = (siteUrlInput?.value || "").trim().replace(/\/+$/, "");
      await this.saveSettings();
      this.setDockStatus("正在测试连接...");
      this.addLog("info", "开始测试连接");
      const result = await this.testConnection();
      this.setDockStatus(result.message);
      this.addLog(result.success ? "success" : "error", result.message);
      showMessage(result.message, 4000, result.success ? "info" : "error");
    });
    publishButton?.addEventListener("click", async () => {
      this.settings.apiBaseUrl = (baseUrlInput?.value || "").trim().replace(/\/+$/, "");
      this.settings.apiKey = (apiKeyInput?.value || "").trim();
      this.settings.siteUrl = (siteUrlInput?.value || "").trim().replace(/\/+$/, "");
      await this.saveSettings();
      this.setDockStatus("正在读取当前文档...");
      this.addLog("info", "开始发布当前文档");
      const result = await this.publishCurrentDocument();
      this.setDockStatus(result.message);
      this.addLog(result.success ? "success" : "error", result.message);
      showMessage(result.message, 5000, result.success ? "info" : "error");
    });
    openLastButton?.addEventListener("click", () => {
      const hasPublishedNotes = Object.keys(this.settings.mappings || {}).length > 0;
      if (!hasPublishedNotes) {
        const fallbackMessage = "还没有已发布的笔记记录";
        this.setDockStatus(fallbackMessage);
        this.addLog("error", fallbackMessage);
        showMessage(fallbackMessage, 4000, "error");
        return;
      }
      this.openPublishedDialog();
    });
    hintElement?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const link = target.closest(".siyuan-to-wiki-dock__hint-link");
      const url = link?.getAttribute("data-url");
      if (!url) {
        return;
      }
      event.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
      this.addLog("info", `从最近发布链接打开页面：${url}`);
    });
    logsButton?.addEventListener("click", () => this.openLogDialog());
    if (statusElement && !(statusElement.textContent || "").trim()) {
      statusElement.textContent = "已就绪，先配置 API 再测试连接。";
    }
  }

  renderLastPublishedHint() {
    const lastPublished = this.settings.lastPublished;
    if (!lastPublished?.title) {
      return "最近发布：暂无";
    }
    const modeLabel = lastPublished.mode === "update" ? "更新" : "新建";
    const linkLabel = lastPublished.url
      ? `<a class="siyuan-to-wiki-dock__hint-link" href="${this.escapeAttr(lastPublished.url)}" data-url="${this.escapeAttr(lastPublished.url)}">打开 ${this.escapeHtml(lastPublished.title)}</a>`
      : `slug：${this.escapeHtml(lastPublished.slug || "未记录")}`;
    return `最近发布：${this.escapeHtml(lastPublished.title)}（${this.escapeHtml(modeLabel)}） ${linkLabel}`;
  }

  setDockStatus(message) {
    if (!this.dock?.element) {
      return;
    }
    const statusElement = this.dock.element.querySelector("#siyuan-to-wiki-dock-status");
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  addLog(level, message) {
    this.logs.unshift({
      level,
      message,
      time: this.formatTime(new Date()),
    });
    this.logs = this.logs.slice(0, 50);
    this.renderLogs();
  }

  renderLogs() {
    if (!this.logDialog?.element) {
      return;
    }
    const logsElement = this.logDialog.element.querySelector("#siyuan-to-wiki-log-dialog-list");
    if (logsElement) {
      logsElement.innerHTML = this.renderLogsHtml();
    }
  }

  openLogDialog() {
    if (this.logDialog) {
      this.renderLogs();
      return;
    }
    this.logDialog = new Dialog({
      title: "思源推送 Wiki 日志",
      width: "720px",
      height: "520px",
      content: `
        <div class="b3-dialog__content siyuan-to-wiki-log-dialog">
          <div class="siyuan-to-wiki-log-dialog__toolbar">
            <button id="siyuan-to-wiki-log-dialog-clear" class="b3-button b3-button--cancel">清空日志</button>
          </div>
          <div id="siyuan-to-wiki-log-dialog-list" class="siyuan-to-wiki-log-dialog__list">${this.renderLogsHtml()}</div>
        </div>
      `,
      destroyCallback: () => {
        this.logDialog = null;
      },
    });

    const clearButton = this.logDialog.element.querySelector("#siyuan-to-wiki-log-dialog-clear");
    clearButton?.addEventListener("click", () => {
      this.logs = [];
      this.renderLogs();
      this.addLog("info", "日志已清空");
    });
  }

  openPublishedDialog() {
    if (this.publishedDialog) {
      this.renderPublishedList();
      return;
    }
    this.publishedDialog = new Dialog({
      title: "已发布笔记",
      width: "820px",
      height: "560px",
      content: `
        <div class="b3-dialog__content siyuan-to-wiki-published-dialog">
          <div class="siyuan-to-wiki-published-dialog__toolbar">
            <div class="siyuan-to-wiki-published-dialog__summary">共 ${this.getPublishedEntries().length} 条已发布记录</div>
            <input id="siyuan-to-wiki-published-dialog-search" class="b3-text-field siyuan-to-wiki-published-dialog__search" placeholder="搜索标题、slug 或链接" value="${this.escapeAttr(this.publishedFilter)}" />
          </div>
          <div id="siyuan-to-wiki-published-dialog-list" class="siyuan-to-wiki-published-dialog__list">${this.renderPublishedListHtml()}</div>
        </div>
      `,
      destroyCallback: () => {
        this.publishedDialog = null;
      },
    });

    const searchInput = this.publishedDialog.element.querySelector("#siyuan-to-wiki-published-dialog-search");
    searchInput?.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      this.publishedFilter = target.value || "";
      this.renderPublishedList();
    });

    const listElement = this.publishedDialog.element.querySelector("#siyuan-to-wiki-published-dialog-list");
    listElement?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const actionButton = target.closest("[data-action]");
      const action = actionButton?.getAttribute("data-action");
      const url = actionButton?.getAttribute("data-url");
      const docId = actionButton?.getAttribute("data-doc-id");
      const currentSlug = actionButton?.getAttribute("data-slug") || "";
      if (!action) {
        return;
      }
      event.preventDefault();
      if (action === "open-link") {
        if (!url) {
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
        this.addLog("info", `从已发布列表打开页面：${url}`);
        return;
      }
      if (action === "copy-link") {
        if (!url) {
          return;
        }
        this.copyToClipboard(url, "链接已复制");
        return;
      }
      if (action === "delete-record") {
        if (!docId) {
          return;
        }
        this.deletePublishedRecord(docId);
        return;
      }
      if (action === "republish") {
        if (!docId) {
          return;
        }
        this.republishByDocId(docId);
        return;
      }
      if (action === "rebind-slug") {
        if (!docId) {
          return;
        }
        this.rebindPublishedSlug(docId, currentSlug);
      }
    });
  }

  renderPublishedList() {
    if (!this.publishedDialog?.element) {
      return;
    }
    const summaryElement = this.publishedDialog.element.querySelector(".siyuan-to-wiki-published-dialog__summary");
    if (summaryElement) {
      summaryElement.textContent = `共 ${this.getFilteredPublishedEntries().length} 条匹配记录`;
    }
    const searchInput = this.publishedDialog.element.querySelector("#siyuan-to-wiki-published-dialog-search");
    if (searchInput && searchInput.value !== this.publishedFilter) {
      searchInput.value = this.publishedFilter;
    }
    const listElement = this.publishedDialog.element.querySelector("#siyuan-to-wiki-published-dialog-list");
    if (listElement) {
      listElement.innerHTML = this.renderPublishedListHtml();
    }
  }

  renderPublishedListHtml() {
    const entries = this.getFilteredPublishedEntries();
    const activeDocId = this.getActiveDocId();
    if (!entries.length) {
      return '<div class="siyuan-to-wiki-published-dialog__empty">没有匹配的已发布记录，可以换个关键词试试。</div>';
    }
    return entries
      .map((entry) => `
        <div class="siyuan-to-wiki-published-dialog__item ${entry.docId === activeDocId ? "siyuan-to-wiki-published-dialog__item--active" : ""}">
          <div class="siyuan-to-wiki-published-dialog__head">
            <div class="siyuan-to-wiki-published-dialog__title">${this.escapeHtml(entry.title || "未命名笔记")}</div>
            <span class="siyuan-to-wiki-published-dialog__status siyuan-to-wiki-published-dialog__status--${this.escapeStatus(entry.status)}">${this.escapeHtml(this.getStatusLabel(entry.status))}</span>
          </div>
          <div class="siyuan-to-wiki-published-dialog__meta">文档 ID：${this.escapeHtml(entry.docId)}</div>
          <div class="siyuan-to-wiki-published-dialog__meta">Slug：${this.escapeHtml(entry.slug || "未记录")}</div>
          <div class="siyuan-to-wiki-published-dialog__meta">链接：${entry.url ? `<a class="siyuan-to-wiki-published-dialog__link" href="${this.escapeAttr(entry.url)}" data-action="open-link" data-url="${this.escapeAttr(entry.url)}">${this.escapeHtml(entry.url)}</a>` : "暂无可打开链接"}</div>
          <div class="siyuan-to-wiki-published-dialog__meta">最近同步：${this.escapeHtml(entry.publishedAt ? this.formatDisplayTime(entry.publishedAt) : "未知")}</div>
          <div class="siyuan-to-wiki-published-dialog__meta">同步方式：${this.escapeHtml(entry.mode === "update" ? "更新" : "新建")}</div>
          <div class="siyuan-to-wiki-published-dialog__meta">${entry.docId === activeDocId ? "当前打开文档" : "非当前文档"}</div>
          <div class="siyuan-to-wiki-published-dialog__actions">
            <button class="b3-button b3-button--outline" data-action="open-link" data-url="${this.escapeAttr(entry.url || "")}" ${entry.url ? "" : "disabled"}>打开链接</button>
            <button class="b3-button b3-button--outline" data-action="copy-link" data-url="${this.escapeAttr(entry.url || "")}" ${entry.url ? "" : "disabled"}>复制链接</button>
            <button class="b3-button b3-button--outline" data-action="republish" data-doc-id="${this.escapeAttr(entry.docId)}">重新发布</button>
            <button class="b3-button b3-button--outline" data-action="rebind-slug" data-doc-id="${this.escapeAttr(entry.docId)}" data-slug="${this.escapeAttr(entry.slug || "")}">重新绑定</button>
            <button class="b3-button b3-button--cancel" data-action="delete-record" data-doc-id="${this.escapeAttr(entry.docId)}">删除记录</button>
          </div>
        </div>
      `)
      .join("");
  }

  renderLogsHtml() {
    if (!this.logs.length) {
      return '<div class="siyuan-to-wiki-log-dialog__empty">还没有日志，执行一次测试或发布后会显示在这里。</div>';
    }
    return this.logs
      .map((item) => `
        <div class="siyuan-to-wiki-log-dialog__item">
          <div class="siyuan-to-wiki-log-dialog__meta">
            <span class="siyuan-to-wiki-log-dialog__time">${this.escapeHtml(item.time)}</span>
            <span class="siyuan-to-wiki-log-dialog__level siyuan-to-wiki-log-dialog__level--${this.escapeLevel(item.level)}">${this.escapeHtml(item.level.toUpperCase())}</span>
          </div>
          <div class="siyuan-to-wiki-log-dialog__message">${this.escapeHtml(item.message)}</div>
        </div>
      `)
      .join("");
  }

  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  escapeLevel(value) {
    return ["info", "success", "error"].includes(value) ? value : "info";
  }

  async testConnection() {
    if (!this.settings.apiBaseUrl || !this.settings.apiKey) {
      return { success: false, message: "请先填写 API Base URL 和 API Key" };
    }

    this.addLog("info", `请求连接检查：${this.settings.apiBaseUrl}/auth/me`);
    const authResult = await this.requestWiki("/auth/me", { method: "GET" });
    if (authResult.ok) {
      return { success: true, message: `连接成功：/auth/me (${authResult.httpCode})` };
    }
    if (authResult.httpCode === 401) {
      return { success: false, message: "认证失败：API Key 无效或已过期" };
    }
    if (authResult.httpCode === 403) {
      return { success: false, message: "权限不足：当前 API Key 无法访问该 Wiki" };
    }

    this.addLog("info", `回退检查接口：${this.settings.apiBaseUrl}/spaces`);
    const spacesResult = await this.requestWiki("/spaces", { method: "GET" });
    if (spacesResult.ok) {
      return { success: true, message: `连接成功：/spaces (${spacesResult.httpCode})` };
    }
    return {
      success: false,
      message: `连接失败：${spacesResult.message || authResult.message || "未知错误"}`,
    };
  }

  async publishCurrentDocument() {
    const currentDoc = await this.getCurrentDocument();
    if (!currentDoc.success) {
      return currentDoc;
    }
    return this.publishDocument(currentDoc);
  }

  async publishDocument(currentDoc) {
    if (!this.settings.apiBaseUrl || !this.settings.apiKey) {
      return { success: false, message: "请先填写 API Base URL 和 API Key" };
    }

    this.setDockStatus(`正在发布《${currentDoc.title}》...`);
    this.addLog("info", `已读取文档：${currentDoc.title} (${currentDoc.docId})`);
    const mappingInfo = this.getMappingEntry(currentDoc.docId);
    const mappingSlug = mappingInfo?.slug;
    if (mappingSlug) {
      const mappedSlug = mappingSlug;
      this.addLog("info", `检测到历史映射，尝试更新页面：${mappedSlug}`);
      const shouldSyncTitle = Boolean(currentDoc.title && currentDoc.title !== mappingInfo.title);
      let updateResult = await this.requestWiki(`/pages/${mappedSlug}`, {
        method: "PUT",
        body: JSON.stringify({
          content: currentDoc.content,
        }),
      });
      if (updateResult.ok) {
        const publishedUrl = this.getPublishedPageUrl(updateResult.data, mappedSlug);
        let status = "synced";
        if (shouldSyncTitle) {
          this.addLog("info", `检测到标题变更，尝试单独同步标题：${currentDoc.title}`);
          const titleResult = await this.requestWiki(`/pages/${mappedSlug}`, {
            method: "PUT",
            body: JSON.stringify({
              title: currentDoc.title,
            }),
          });
          if (!titleResult.ok) {
            status = "content-only";
            this.addLog("error", `标题同步失败，已仅同步内容：${titleResult.message || titleResult.httpCode}`);
          } else {
            this.addLog("success", `标题同步成功：${currentDoc.title}`);
          }
        }
        this.settings.mappings[currentDoc.docId] = this.buildMappingEntry(currentDoc.docId, {
          title: currentDoc.title,
          slug: mappedSlug,
          url: publishedUrl,
          mode: "update",
          status,
        });
        await this.updateLastPublished({
          title: currentDoc.title,
          slug: mappedSlug,
          url: publishedUrl,
          mode: "update",
        });
        this.renderPublishedList();
        this.addLog("success", publishedUrl ? `更新完成，可打开页面：${publishedUrl}` : `更新完成，slug：${mappedSlug}`);
        return { success: true, message: status === "content-only" ? `更新成功：${currentDoc.title}（标题未同步到远端）` : `更新成功：${currentDoc.title}` };
      }
      if (updateResult.httpCode !== 404) {
        return { success: false, message: `更新失败：${updateResult.message || updateResult.httpCode}` };
      }
      this.addLog("info", `历史映射未命中，改为新建页面：${mappedSlug}`);
    }

    const createResult = await this.requestWiki("/pages", {
      method: "POST",
      body: JSON.stringify({
        title: currentDoc.title,
        content: currentDoc.content,
        visibility: "public",
      }),
    });

    if (!createResult.ok) {
      return { success: false, message: `发布失败：${createResult.message || createResult.httpCode}` };
    }

    const createdSlug = this.extractSlug(createResult.data);
    const publishedUrl = this.getPublishedPageUrl(createResult.data, createdSlug);
    if (createdSlug) {
      this.settings.mappings[currentDoc.docId] = this.buildMappingEntry(currentDoc.docId, {
        title: currentDoc.title,
        slug: createdSlug,
        url: publishedUrl,
        mode: "create",
        status: "synced",
      });
      this.addLog("success", `已记录页面映射：${currentDoc.docId} -> ${createdSlug}`);
    }
    await this.updateLastPublished({
      title: currentDoc.title,
      slug: createdSlug,
      url: publishedUrl,
      mode: "create",
    });
    this.renderPublishedList();
    this.addLog("success", publishedUrl ? `新建完成，可打开页面：${publishedUrl}` : `新建完成，slug：${createdSlug || "未返回"}`);
    return { success: true, message: `发布成功：${currentDoc.title}` };
  }

  async getCurrentDocument() {
    const editor = getActiveEditor?.(false);
    const rootID = editor?.protyle?.block?.rootID;
    if (!rootID) {
      return { success: false, message: "未找到当前打开的文档，请先聚焦一个文档页签" };
    }

    const title =
      editor?.protyle?.title?.editElement?.textContent?.trim() ||
      "Untitled";
    const response = await fetchSyncPost("/api/export/exportMdContent", {
      id: rootID,
      refMode: 3,
      embedMode: 1,
      yfm: false,
      fillCSSVar: false,
      adjustHeadingLevel: false,
    });

    if (response.code !== 0 || !response.data?.content) {
      return { success: false, message: "读取当前文档 Markdown 失败" };
    }

    return {
      success: true,
      docId: rootID,
      title,
      content: response.data.content,
    };
  }

  async getDocumentById(docId, fallbackTitle = "Untitled") {
    const response = await fetchSyncPost("/api/export/exportMdContent", {
      id: docId,
      refMode: 3,
      embedMode: 1,
      yfm: false,
      fillCSSVar: false,
      adjustHeadingLevel: false,
    });

    if (response.code !== 0 || !response.data?.content) {
      return { success: false, message: "读取目标文档 Markdown 失败" };
    }

    return {
      success: true,
      docId,
      title: fallbackTitle || "Untitled",
      content: response.data.content,
    };
  }

  async republishByDocId(docId) {
    const entry = this.getMappingEntry(docId);
    if (!entry) {
      showMessage("未找到对应的发布记录", 3000, "error");
      return;
    }
    this.setDockStatus(`正在重新发布《${entry.title || docId}》...`);
    this.addLog("info", `从已发布列表重新发布：${entry.title || docId} (${docId})`);
    const result = await this.getDocumentById(docId, entry.title || "Untitled");
    if (!result.success) {
      this.addLog("error", result.message);
      showMessage(result.message, 4000, "error");
      return;
    }
    const publishResult = await this.publishDocument(result);
    this.setDockStatus(publishResult.message);
    this.addLog(publishResult.success ? "success" : "error", publishResult.message);
    showMessage(publishResult.message, 5000, publishResult.success ? "info" : "error");
  }

  async publishFromMenu(docId, title) {
    const sourceDoc = docId
      ? await this.getDocumentById(docId, title || this.getMappingEntry(docId)?.title || "Untitled")
      : await this.getCurrentDocument();
    if (!sourceDoc.success) {
      showMessage(sourceDoc.message, 4000, "error");
      this.addLog("error", sourceDoc.message);
      return;
    }
    const result = await this.publishDocument(sourceDoc);
    this.setDockStatus(result.message);
    this.addLog(result.success ? "success" : "error", result.message);
    showMessage(result.message, 5000, result.success ? "info" : "error");
  }

  async requestWiki(path, init) {
    try {
      this.addLog("info", `请求接口：${(init?.method || "GET").toUpperCase()} ${path}`);
      const response = await fetch(`${this.settings.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.settings.apiKey}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const text = await response.text();
      if (contentType.includes("text/html")) {
        this.addLog("error", `接口返回 HTML：${path}`);
        return {
          ok: false,
          httpCode: response.status,
          message: "当前 Base URL 返回的是网页 HTML，不是 JSON API。请填写真实的 API 地址，例如 https://your-wiki.example.com/api/v1",
          data: {},
        };
      }
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (error) {
        data = {};
        if (text) {
          this.addLog("error", `接口返回非 JSON：${path}`);
          return {
            ok: false,
            httpCode: response.status,
            message: `接口返回了非 JSON 内容，请检查 Base URL 是否正确（当前路径：${path}）`,
            data: {},
          };
        }
      }
      if (!response.ok) {
        const allowHeader = response.headers.get("allow");
        const detailParts = [`HTTP ${response.status}`];
        if (allowHeader) {
          detailParts.push(`Allow: ${allowHeader}`);
        }
        if (data?.message) {
          detailParts.push(`message: ${data.message}`);
        } else if (text) {
          detailParts.push(`body: ${text.slice(0, 180)}`);
        }
        this.addLog("error", `接口失败：${path} -> ${detailParts.join(" | ")}`);
        return {
          ok: false,
          httpCode: response.status,
          message: data?.message || text.slice(0, 180) || `HTTP ${response.status}`,
          data,
        };
      }
      this.addLog("success", `接口成功：${path} -> HTTP ${response.status}`);
      return {
        ok: true,
        httpCode: response.status,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        httpCode: 0,
        message: error instanceof Error ? error.message : "网络错误",
        data: {},
      };
    }
  }

  escapeAttr(value) {
    return this.escapeHtml(value).replace(/"/g, "&quot;");
  }

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  getActiveDocId() {
    const editor = getActiveEditor?.(false);
    return editor?.protyle?.block?.rootID || "";
  }

  getMappingEntry(docId) {
    const mapping = this.settings.mappings?.[docId];
    if (!mapping) {
      return null;
    }
    if (typeof mapping === "string") {
      return this.buildMappingEntry(docId, {
        slug: mapping,
      });
    }
    return this.buildMappingEntry(docId, mapping);
  }

  buildMappingEntry(docId, data) {
    return {
      docId,
      title: String(data?.title || ""),
      slug: String(data?.slug || ""),
      url: String(data?.url || ""),
      mode: data?.mode === "update" ? "update" : "create",
      status: this.escapeStatus(data?.status || "synced"),
      publishedAt: data?.publishedAt || new Date().toISOString(),
    };
  }

  normalizeMappings(mappings) {
    const normalized = {};
    const source = mappings && typeof mappings === "object" ? mappings : {};
    Object.entries(source).forEach(([docId, value]) => {
      if (!value) {
        return;
      }
      normalized[docId] = this.buildMappingEntry(docId, typeof value === "string" ? { slug: value } : value);
    });
    return normalized;
  }

  getPublishedEntries() {
    return Object.values(this.settings.mappings || {})
      .map((entry) => this.buildMappingEntry(entry.docId || "", entry))
      .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  }

  getFilteredPublishedEntries() {
    const keyword = String(this.publishedFilter || "").trim().toLowerCase();
    const entries = this.getPublishedEntries();
    if (!keyword) {
      return entries;
    }
    return entries.filter((entry) => {
      const haystack = [
        entry.title,
        entry.slug,
        entry.url,
        entry.docId,
        this.getStatusLabel(entry.status),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }

  getStatusLabel(status) {
    if (status === "content-only") {
      return "仅内容同步";
    }
    if (status === "error") {
      return "异常";
    }
    return "已同步";
  }

  escapeStatus(status) {
    return ["synced", "content-only", "error"].includes(status) ? status : "synced";
  }

  formatDisplayTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  async copyToClipboard(text, successMessage) {
    if (!text) {
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      this.addLog("success", `${successMessage}：${text}`);
      showMessage(successMessage, 3000, "info");
    } catch (error) {
      const message = "复制链接失败";
      this.addLog("error", `${message}：${text}`);
      showMessage(message, 3000, "error");
    }
  }

  async deletePublishedRecord(docId) {
    const entry = this.getMappingEntry(docId);
    if (!entry) {
      return;
    }
    const confirmed = window.confirm(`确定删除《${entry.title || docId}》的已发布记录吗？这不会删除远端页面，只会移除本地映射。`);
    if (!confirmed) {
      return;
    }
    delete this.settings.mappings[docId];
    if (this.settings.lastPublished?.docId === docId || this.settings.lastPublished?.slug === entry.slug) {
      this.settings.lastPublished = null;
    }
    await this.saveSettings();
    this.renderPublishedList();
    this.refreshDockHint();
    this.addLog("info", `已删除发布记录：${entry.title || docId}`);
    showMessage("已删除发布记录", 3000, "info");
  }

  async rebindPublishedSlug(docId, currentSlug) {
    const entry = this.getMappingEntry(docId);
    if (!entry) {
      return;
    }
    const nextSlug = window.prompt("请输入新的 slug", currentSlug || entry.slug || "");
    if (nextSlug === null) {
      return;
    }
    const normalizedSlug = nextSlug.trim().replace(/^\/+|\/+$/g, "");
    if (!normalizedSlug) {
      showMessage("slug 不能为空", 3000, "error");
      return;
    }
    const nextUrl = this.getPublishedPageUrl({}, normalizedSlug);
    this.settings.mappings[docId] = this.buildMappingEntry(docId, {
      ...entry,
      slug: normalizedSlug,
      url: nextUrl,
      status: "synced",
    });
    if (this.settings.lastPublished?.slug === entry.slug) {
      this.settings.lastPublished = {
        ...this.settings.lastPublished,
        docId,
        slug: normalizedSlug,
        url: nextUrl,
      };
    }
    await this.saveSettings();
    this.renderPublishedList();
    this.refreshDockHint();
    this.addLog("info", `已重新绑定 slug：${entry.title || docId} -> ${normalizedSlug}`);
    showMessage("已更新 slug 绑定", 3000, "info");
  }

  refreshDockHint() {
    if (!this.dock?.element) {
      return;
    }
    const hintElement = this.dock.element.querySelector(".siyuan-to-wiki-dock__hint");
    if (hintElement) {
      hintElement.innerHTML = this.renderLastPublishedHint();
    }
  }

  registerMenus() {
    this.eventBus.on("click-editortitleicon", (event) => {
      const detail = event.detail || {};
      this.addDirectMenuItem({
        icon: "iconUpload",
        label: "发布到 Wiki",
        click: () => {
          const docId = detail?.protyle?.block?.rootID || detail?.protyle?.block?.id;
          const title = detail?.data?.name || detail?.data?.title || "";
          this.publishFromMenu(docId, title);
        },
      }, detail.menu);
    });

    this.eventBus.on("open-menu-content", (event) => {
      const detail = event.detail || {};
      this.addDirectMenuItem({
        icon: "iconUpload",
        label: "发布到 Wiki",
        click: () => {
          const docId = detail?.protyle?.block?.rootID || detail?.protyle?.block?.id;
          const title = this.getMappingEntry(docId)?.title || "";
          this.publishFromMenu(docId, title);
        },
      }, detail.menu);
    });
  }

  addDirectMenuItem(item, fallbackMenu) {
    const globalMenu = window?.siyuan?.menus?.menu;
    if (globalMenu?.addItem) {
      globalMenu.addItem(item);
      return;
    }
    fallbackMenu?.addItem(item);
  }

  setupMenuObserver() {
    const menuElement = document.getElementById("commonMenu");
    if (!menuElement) {
      return;
    }
    const inject = () => this.injectPublishMenuItem();
    this.menuObserver = new MutationObserver(() => {
      inject();
    });
    this.menuObserver.observe(menuElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "data-name", "data-from"],
    });
  }

  injectPublishMenuItem() {
    const menuElement = document.getElementById("commonMenu");
    const globalMenu = window?.siyuan?.menus?.menu;
    if (!menuElement || !globalMenu) {
      return;
    }
    if (menuElement.classList.contains("fn__none")) {
      return;
    }
    const menuName = menuElement.getAttribute("data-name") || "";
    const menuFrom = menuElement.getAttribute("data-from") || "";
    const isSupportedMenu = menuName === "titleMenu" || menuName === "inline-context" || menuFrom.includes("title-protyle");
    if (!isSupportedMenu) {
      return;
    }
    if (menuElement.querySelector('[data-id="siyuan-to-wiki-publish"]')) {
      return;
    }
    globalMenu.addItem({
      id: "siyuan-to-wiki-publish",
      icon: "iconUpload",
      label: "发布到 Wiki",
      click: () => this.publishFromMenu(),
    });
  }

  extractSlug(data) {
    if (!data || typeof data !== "object") {
      return "";
    }
    if (typeof data.slug === "string") {
      return data.slug;
    }
    if (data.data && typeof data.data.slug === "string") {
      return data.data.slug;
    }
    return "";
  }

  getPublishedPageUrl(data, slug) {
    if (data?.url && typeof data.url === "string") {
      return data.url;
    }
    if (data?.data?.url && typeof data.data.url === "string") {
      return data.data.url;
    }
    if (!slug) {
      return "";
    }
    if (this.settings.siteUrl) {
      return `${this.settings.siteUrl}/pages/${slug}`;
    }
    try {
      const apiUrl = new URL(this.settings.apiBaseUrl);
      if (apiUrl.hostname.endsWith("workers.dev")) {
        const rememberedUrl = this.settings.lastPublished?.url;
        if (rememberedUrl) {
          const remembered = new URL(rememberedUrl);
          return `${remembered.origin}/pages/${slug}`;
        }
        return "";
      }
      return `${apiUrl.origin}/pages/${slug}`;
    } catch (error) {
      return "";
    }
  }

  async updateLastPublished(payload) {
    this.settings.lastPublished = {
      title: payload.title || "",
      slug: payload.slug || "",
      url: payload.url || "",
      mode: payload.mode || "create",
      publishedAt: new Date().toISOString(),
    };
    await this.saveSettings();
    if (this.dock?.element) {
      const hintElement = this.dock.element.querySelector(".siyuan-to-wiki-dock__hint");
      if (hintElement) {
        hintElement.innerHTML = this.renderLastPublishedHint();
      }
    }
  }

  setupSettings() {
    this.setting = new Setting({
      width: "640px",
      confirmCallback: async () => {
        const baseUrlInput = document.getElementById("siyuan-to-wiki-api-base-url");
        const apiKeyInput = document.getElementById("siyuan-to-wiki-api-key");
        const siteUrlInput = document.getElementById("siyuan-to-wiki-site-url");
        this.settings.apiBaseUrl = (baseUrlInput?.value || "").trim().replace(/\/+$/, "");
        this.settings.apiKey = (apiKeyInput?.value || "").trim();
        this.settings.siteUrl = (siteUrlInput?.value || "").trim().replace(/\/+$/, "");
        await this.saveSettings();
        showMessage("Siyuan To Wiki 配置已保存", 3000, "info");
      },
    });

    this.setting.addItem({
      title: "API Base URL",
      description: "Wiki API 地址，例如 https://your-wiki.example.com/api/v1",
      createActionElement: () => {
        const input = document.createElement("input");
        input.id = "siyuan-to-wiki-api-base-url";
        input.className = "b3-text-field fn__flex-center fn__size200";
        input.placeholder = "https://your-wiki.example.com/api/v1";
        input.value = this.settings.apiBaseUrl;
        return input;
      },
    });

    this.setting.addItem({
      title: "API Key",
      description: "用于访问目标 Wiki 的 API 密钥",
      createActionElement: () => {
        const input = document.createElement("input");
        input.id = "siyuan-to-wiki-api-key";
        input.type = "password";
        input.className = "b3-text-field fn__flex-center fn__size200";
        input.placeholder = "Paste your API key here";
        input.value = this.settings.apiKey;
        return input;
      },
    });

    this.setting.addItem({
      title: "站点 URL",
      description: "用于拼接可打开的页面链接，例如 https://your-wiki.example.com",
      createActionElement: () => {
        const input = document.createElement("input");
        input.id = "siyuan-to-wiki-site-url";
        input.className = "b3-text-field fn__flex-center fn__size200";
        input.placeholder = "https://your-wiki.example.com";
        input.value = this.settings.siteUrl;
        return input;
      },
    });
  }
};
