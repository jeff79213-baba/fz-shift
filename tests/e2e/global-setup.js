// 測試設置腳本
async function globalSetup() {
  const { spawn } = require('child_process');
  const path = require('path');
  
  // 檢查 Firebase 仿真是否已在運行
  const { execSync } = require('child_process');
  
  try {
    // 嘗試檢查仿真服務是否已在運行
    execSync('curl -s http://localhost:5000 > /dev/null || exit 1', { stdio: 'pipe' });
    console.log('Firebase 仿真服務已在運行中');
  } catch {
    console.log('啟動 Firebase 仿真服務...');
    // 啟動仿真服務
    const firebaseProcess = spawn('firebase', ['emulators:start', '--only', 'auth,firestore,functions,hosting'], {
      stdio: 'pipe',
      detached: true
    });
    
    // 等待仿真服務就緒
    await new Promise(resolve => {
      firebaseProcess.stdout.on('data', (data) => {
        if (data.toString().includes(' emulators started ')) {
          resolve();
        }
      });
    });
    
    // 保存進程以便後續
    firebaseProcess.unref();
  }
}

module.exports = { globalSetup };
