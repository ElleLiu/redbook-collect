// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "checkAndCollect") {
    const noteContainer = document.querySelector('#noteContainer');
    const isNotePage = noteContainer !== null;
    
    if (!isNotePage) {
      sendResponse({ isNotePage: false });
      return true;
    }
    
    try {
      const data = collectNoteData(noteContainer);
      sendResponse({ isNotePage: true, data: data });
    } catch (error) {
      console.error('提取出错:', error);
      sendResponse({ isNotePage: true, error: error.message });
    }
    return true;
  }
});

function collectNoteData(container) {
  const url = window.location.href;

  // 🔥【核心功能】提取作品 ID (24位 Hex 字符)
  let noteId = "";
  try {
      // 策略1: 从 URL 匹配 /explore/xxxxxxxx
      const idMatch = url.match(/\/explore\/([a-fA-F0-9]{24})/);
      if (idMatch) {
          noteId = idMatch[1];
      } else {
          // 策略2: 兜底查找 URL 中的 ID 特征
          const parts = url.split('/');
          const possibleId = parts.find(p => /^[a-fA-F0-9]{24}$/.test(p.split('?')[0]));
          if (possibleId) noteId = possibleId.split('?')[0];
      }
  } catch (e) { console.error("ID提取失败", e); }
  
  if (!noteId) noteId = "unknown_" + new Date().getTime(); // 防止空 ID 报错

  // --- 以下是常规采集逻辑 ---
  const usernameEl = container.querySelector('span.username') || container.querySelector('.author-wrapper .name');
  const username = usernameEl ? usernameEl.textContent.trim() : '未找到作者';

  let title = "";
  const titleEl = container.querySelector('.title') || container.querySelector('#title');
  if (titleEl) title = titleEl.textContent.trim();

  const descEl = container.querySelector('.desc') || container.querySelector('.note-text');
  const content = descEl ? descEl.textContent.trim() : '';

  if (!title && content) {
      const cleanContent = content.replace(/[\r\n]/g, " "); 
      title = "[摘] " + cleanContent.substring(0, 20) + "...";
  } else if (!title) title = "无标题";

  const tags = Array.from(container.querySelectorAll('a.tag')).map(t => t.textContent.trim());

  let rawDate = "";
  const dateElA = container.querySelector('.date');
  if (dateElA) rawDate = dateElA.textContent.trim();
  if (!rawDate) {
    const bottomEl = container.querySelector('.bottom-container');
    if (bottomEl) rawDate = bottomEl.textContent.trim();
  }
  if (!rawDate) {
     const allSpans = container.querySelectorAll('.interaction-container span');
     for (let span of allSpans) {
        if (span.textContent.match(/202|天前|小时前|分钟前|昨天/)) {
            rawDate = span.textContent; break;
        }
     }
  }
  const formattedDate = parseRedBookTime(rawDate);

  let imageUrls = [];
  const imgElements = container.querySelectorAll('.media-container img, .note-slider img, .swiper-slide img');
  if (imgElements.length > 0) {
      imageUrls = Array.from(imgElements)
        .map(img => img.src || img.getAttribute('src'))
        .filter(src => src && !src.includes('avatar') && !src.includes('spectrum'));
  }
  if (imageUrls.length === 0) {
      const metaImg = document.querySelector('meta[name="og:image"]');
      if (metaImg) imageUrls.push(metaImg.content);
  }
  const imagesStr = [...new Set(imageUrls)].join('\n');

  const getNumber = (selector) => {
    const el = container.querySelector(selector);
    return el ? (parseInt(el.textContent.trim()) || 0) : 0;
  };

  console.log('✅ 采集成功! ID:', noteId);

  return {
    url,
    noteId, // 🔥 返回 ID
    author: username,
    title,
    content,
    tags,
    date: formattedDate,
    images: imagesStr,
    likes: getNumber('.like-wrapper .count'),
    collects: getNumber('.collect-wrapper .count'),
    comments: getNumber('.chat-wrapper .count')
  };
}

function parseRedBookTime(timeStr) {
    if (!timeStr) return "";
    let cleanStr = timeStr.replace("编辑于", "").trim();
    const now = new Date();
    const minMatch = cleanStr.match(/(\d+)分钟前/);
    if (minMatch) return formatTime(new Date(now.getTime() - minMatch[1] * 60 * 1000));
    const hourMatch = cleanStr.match(/(\d+)小时前/);
    if (hourMatch) return formatTime(new Date(now.getTime() - hourMatch[1] * 60 * 60 * 1000));
    if (cleanStr.includes("昨天")) {
        const past = new Date(now);
        past.setDate(past.getDate() - 1);
        const timeMatch = cleanStr.match(/(\d{1,2}):(\d{1,2})/);
        if (timeMatch) { past.setHours(timeMatch[1]); past.setMinutes(timeMatch[2]); past.setSeconds(0); }
        return formatTime(past);
    }
    const dayMatch = cleanStr.match(/(\d+)天前/);
    if (dayMatch) return formatTime(new Date(now.getTime() - dayMatch[1] * 24 * 60 * 60 * 1000));
    const shortDateMatch = cleanStr.match(/(\d{1,2})-(\d{1,2})/);
    if (shortDateMatch && !cleanStr.match(/\d{4}-\d{1,2}-\d{1,2}/)) {
        return `${now.getFullYear()}-${shortDateMatch[1].padStart(2, '0')}-${shortDateMatch[2].padStart(2, '0')} 00:00:00`;
    }
    const fullDateMatch = cleanStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (fullDateMatch) return fullDateMatch[0] + " 00:00:00";
    return cleanStr.split(' ')[0]; 
}

function formatTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
}