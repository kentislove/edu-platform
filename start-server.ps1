# EduPlatform 本地開發伺服器啟動腳本

Write-Host "🚀 啟動 EduPlatform 本地伺服器..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 伺服器位置: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📍 網路位置: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  請確保在 Google Cloud Console 中添加以下授權來源:" -ForegroundColor Yellow
Write-Host "   - http://localhost:8000" -ForegroundColor Yellow
Write-Host "   - http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 停止伺服器" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# 啟動 Python HTTP 伺服器
python -m http.server 8000
