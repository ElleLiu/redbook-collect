// 监听来自sidebar的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  
  if (request.action === 'getFeishuToken') {
    getTenantAccessToken(request.appId, request.appSecret)
      .then(token => sendResponse({ success: true, token: token }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; 
  }

  // 查重逻辑
  if (request.action === 'searchRecord') {
    searchFeishuRecord_Optimized(request.appToken, request.tableId, request.accessToken, request.noteId)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'updateRecord') {
    updateFeishuRecord(request.appToken, request.tableId, request.accessToken, request.recordId, request.data)
      .then(result => sendResponse({ success: true, result: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'submitToFeishu') {
    createFeishuRecord(request.appToken, request.tableId, request.accessToken, request.data)
      .then(result => sendResponse({ success: true, result: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// --- 辅助函数 ---

async function getTenantAccessToken(appId, appSecret) {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ "app_id": appId, "app_secret": appSecret })
  });
  const data = await response.json();
  if (data.code !== 0) throw new Error(data.msg);
  return data.tenant_access_token;
}

// ⚡️ 极速查重版：只拉取 200 条，且只拉取 note_id 字段
async function searchFeishuRecord_Optimized(appToken, tableId, accessToken, targetNoteId) {
  // 构造优化参数：
  // 1. page_size=200 (减少数量)
  // 2. field_names=["note_id"] (只拉取这一列，极大减少数据传输量)
  const fieldsParam = encodeURIComponent('["note_id"]');
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=200&field_names=${fieldsParam}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  const data = await response.json();
  if (data.code !== 0) throw new Error("同步检查失败: " + data.msg);

  // 在内存里比对
  const foundItem = data.data.items.find(item => {
    const idInTable = item.fields["note_id"]; // 现在 item.fields 里只有这一个字段，非常轻量
    return idInTable && String(idInTable).trim() === String(targetNoteId).trim();
  });

  if (foundItem) {
    return { total: 1, items: [foundItem] };
  } else {
    return { total: 0, items: [] };
  }
}

async function updateFeishuRecord(appToken, tableId, accessToken, recordId, fields) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: fields.fields })
  });
  const data = await response.json();
  if (data.code !== 0) throw new Error("更新失败: " + data.msg);
  return data.data;
}

async function createFeishuRecord(appToken, tableId, accessToken, fields) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fields)
  });
  const data = await response.json();
  if (data.code !== 0) throw new Error(data.msg);
  return data.data;
}