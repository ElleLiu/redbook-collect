document.addEventListener('DOMContentLoaded', function() {
  // 验证版本号
  const header = document.querySelector('h1');
  if(header) header.textContent = "小红书采集 v2.1 (极速版)";

  const configForm = document.getElementById('configForm');
  const actionPanel = document.getElementById('actionPanel');
  const loadingPanel = document.getElementById('loadingPanel');
  const resultPanel = document.getElementById('resultPanel');
  const status = document.getElementById('status');
  const resultMessage = document.getElementById('resultMessage');
  const saveConfigBtn = document.getElementById('saveConfig');
  const collectBtn = document.getElementById('collectBtn');
  const configBtn = document.getElementById('configBtn');
  const closeBtn = document.getElementById('closeBtn');
  const openOptionsPageLink = document.getElementById('openOptionsPage');
  const tableUrlInput = document.getElementById('tableUrl');
  const appTokenInput = document.getElementById('appToken');
  const appSecretInput = document.getElementById('appSecret');
  
  initializeUI();
  
  saveConfigBtn.addEventListener('click', function() {
    const tableUrl = tableUrlInput.value.trim();
    const appToken = appTokenInput.value.trim();
    const appSecret = appSecretInput.value.trim();
    if (!tableUrl || !appToken || !appSecret) { showResult('请填写所有配置', false); return; }
    try {
      const urlParams = parseTableUrl(tableUrl);
      chrome.storage.sync.set({ tableUrl, appToken, appSecret, baseAppToken: urlParams.appToken, tableId: urlParams.tableId }, () => {
        showActionPanel('配置已保存');
      });
    } catch (error) { showResult(error.message, false); }
  });
  
  collectBtn.addEventListener('click', function() {
    showLoadingPanel('1. 正在分析笔记...');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "checkAndCollect"}, function(response) {
        if (chrome.runtime.lastError || !response || !response.isNotePage) {
          showResult('请在笔记详情页使用', false); return;
        }
        
        chrome.storage.sync.get(['appToken', 'appSecret', 'baseAppToken', 'tableId'], function(config) {
          if (!config.appToken) { showResult('请先配置插件', false); return; }
          
          showLoadingPanel('2. 准备数据...');
          
          const noteText = document.getElementById('noteText') ? document.getElementById('noteText').value.trim() : "";
          const keywordText = document.getElementById('keywordText') ? document.getElementById('keywordText').value.trim() : "";
          
          const requestData = {
            fields: {
              "note_id": response.data.noteId, 
              "url": response.data.url,
              "发布日期": response.data.date,
              "图片链接": response.data.images,
              "标题": response.data.title,
              "作者": response.data.author,
              "正文": response.data.content,
              "标签": response.data.tags,
              "点赞": response.data.likes,
              "收藏": response.data.collects,
              "评论": response.data.comments,
              "批注": noteText,
              "关键词": keywordText
            }
          };

          getFeishuToken(config.appToken, config.appSecret).then(token => {
              // 🔥 文案已修改
              showLoadingPanel('3. 检查是否最新记录...');
              return searchRecord(config.baseAppToken, config.tableId, token, response.data.noteId)
                .then(searchResult => {
                  if (searchResult.total > 0) {
                    // 🚨 发现重复 -> 更新
                    const recordId = searchResult.items[0].record_id;
                    showLoadingPanel(`发现旧记录 (ID: ${response.data.noteId})，正在更新...`);
                    return updateRecord(config.baseAppToken, config.tableId, token, recordId, requestData)
                      .then(() => '记录已更新至最新状态！♻️');
                  } else {
                    // ✅ 未发现 -> 新建
                    showLoadingPanel('正在写入新记录...');
                    return submitToFeishu(config.baseAppToken, config.tableId, token, requestData)
                      .then(() => '新记录写入成功！✅');
                  }
                });
            })
            .then(msg => showResult(msg, true))
            .catch(err => showResult('操作失败: ' + err.message, false));
        });
      });
    });
  });

  // --- 辅助函数 ---
  configBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  closeBtn.addEventListener('click', () => showActionPanel(''));
  openOptionsPageLink.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
  
  function initializeUI() {
    chrome.storage.sync.get(['tableUrl', 'appToken', 'appSecret'], function(config) {
      if (config.tableUrl) { 
        tableUrlInput.value = config.tableUrl; appTokenInput.value = config.appToken; appSecretInput.value = config.appSecret;
        showActionPanel('准备就绪');
      } else showConfigForm();
    });
  }
  function showConfigForm() { configForm.style.display = 'block'; actionPanel.style.display = 'none'; loadingPanel.style.display = 'none'; resultPanel.style.display = 'none'; }
  function showActionPanel(msg) { configForm.style.display = 'none'; actionPanel.style.display = 'block'; loadingPanel.style.display = 'none'; resultPanel.style.display = 'none'; if(msg) status.textContent = msg; }
  function showLoadingPanel(msg) { loadingPanel.style.display = 'block'; actionPanel.style.display = 'none'; document.getElementById('loadingText').textContent = msg; }
  function showResult(msg, success) { loadingPanel.style.display = 'none'; resultPanel.style.display = 'block'; resultMessage.textContent = msg; resultMessage.className = success ? 'result-message success' : 'result-message error'; }
  
  function parseTableUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const params = new URLSearchParams(urlObj.search);
      return { appToken: pathParts[pathParts.length - 1], tableId: params.get('table') };
    } catch (e) { throw new Error('表格URL无效'); }
  }

  function getFeishuToken(appId, appSecret) {
    return sendMessage({ action: 'getFeishuToken', appId, appSecret }).then(r => r.token);
  }
  function searchRecord(appToken, tableId, accessToken, noteId) {
    return sendMessage({ action: 'searchRecord', appToken, tableId, accessToken, noteId }).then(r => r.data);
  }
  function updateRecord(appToken, tableId, accessToken, recordId, data) {
    return sendMessage({ action: 'updateRecord', appToken, tableId, accessToken, recordId, data }).then(r => r.result);
  }
  function submitToFeishu(appToken, tableId, accessToken, data) {
    return sendMessage({ action: 'submitToFeishu', appToken, tableId, accessToken, data }).then(r => r.result);
  }
  
  function sendMessage(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, response => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (!response || !response.success) reject(new Error(response ? response.error : '未知错误'));
        else resolve(response);
      });
    });
  }
});