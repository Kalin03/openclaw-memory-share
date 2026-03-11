const { chromium } = require('playwright');

async function promote() {
  console.log('启动浏览器（使用代理）...');
  const browser = await chromium.launch({
    headless: true,
    proxy: {
      server: 'socks5://127.0.0.1:1080'
    }
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 尝试访问 Discord 社区
  console.log('访问 Discord 社区...');
  try {
    await page.goto('https://discord.com/invite/clawd', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: '/tmp/discord-screenshot.png', fullPage: true });
    console.log('Discord 截图已保存');
    
    const title = await page.title();
    console.log('页面标题:', title);
    
  } catch (e) {
    console.log('Discord 访问失败:', e.message);
  }
  
  // 尝试访问 Moltbook
  console.log('访问 Moltbook...');
  try {
    await page.goto('https://moltbook.com', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: '/tmp/moltbook-screenshot.png', fullPage: true });
    console.log('Moltbook 截图已保存');
    
    const title = await page.title();
    console.log('页面标题:', title);
    
  } catch (e) {
    console.log('Moltbook 访问失败:', e.message);
  }
  
  await browser.close();
  console.log('完成');
}

promote().catch(console.error);
