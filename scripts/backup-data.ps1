# Data Directory Backup Script
# Creates a compressed backup of the data directory

param(
    [string]$OutputPath = ".",
    [switch]$IncludeTimestamp = $true
)

$dataDir = Join-Path $PSScriptRoot "backend\data"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "PrintChakra - Data Backup Utility" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if data directory exists
if (-not (Test-Path $dataDir)) {
    Write-Host "❌ Error: Data directory not found at $dataDir" -ForegroundColor Red
    exit 1
}

# Prepare backup filename
if ($IncludeTimestamp) {
    $backupName = "printchakra_backup_$timestamp.zip"
} else {
    $backupName = "printchakra_backup.zip"
}

$backupPath = Join-Path $OutputPath $backupName

Write-Host "📁 Source: $dataDir" -ForegroundColor Yellow
Write-Host "💾 Backup: $backupPath" -ForegroundColor Yellow
Write-Host ""

# Calculate current size
Write-Host "Analyzing data directory..." -ForegroundColor Cyan
$files = Get-ChildItem -Path $dataDir -Recurse -File
$fileCount = $files.Count
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "   Files: $fileCount" -ForegroundColor Gray
Write-Host "   Size: $sizeMB MB" -ForegroundColor Gray
Write-Host ""

# Show breakdown by directory
Write-Host "Directory Breakdown:" -ForegroundColor Cyan
$breakdown = @(
    @{Name="Uploads"; Path="uploads"},
    @{Name="Processed"; Path="processed"},
    @{Name="Text Files"; Path="processed_text"},
    @{Name="PDFs"; Path="pdfs"},
    @{Name="Converted"; Path="converted"}
)

foreach ($item in $breakdown) {
    $path = Join-Path $dataDir $item.Path
    if (Test-Path $path) {
        $dirFiles = Get-ChildItem -Path $path -File -Recurse
        $dirCount = $dirFiles.Count
        $dirSize = [math]::Round(($dirFiles | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        Write-Host "   $($item.Name): $dirCount files ($dirSize MB)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Creating backup..." -ForegroundColor Cyan

try {
    # Create backup
    Compress-Archive -Path $dataDir -DestinationPath $backupPath -Force -CompressionLevel Optimal
    
    # Verify backup
    if (Test-Path $backupPath) {
        $backupSize = [math]::Round((Get-Item $backupPath).Length / 1MB, 2)
        $compressionRatio = [math]::Round(($backupSize / $sizeMB) * 100, 1)
        
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "✅ Backup Created Successfully!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Backup Statistics:" -ForegroundColor Cyan
        Write-Host "   Original Size: $sizeMB MB" -ForegroundColor Gray
        Write-Host "   Backup Size: $backupSize MB" -ForegroundColor Gray
        Write-Host "   Compression: $compressionRatio%" -ForegroundColor Gray
        Write-Host "   Location: $backupPath" -ForegroundColor Gray
        Write-Host ""
        
        # Show backup file info
        $backupFile = Get-Item $backupPath
        Write-Host "📦 Backup File:" -ForegroundColor Cyan
        Write-Host "   Name: $($backupFile.Name)" -ForegroundColor Gray
        Write-Host "   Created: $(Get-Date $backupFile.CreationTime -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
        Write-Host ""
        
        # Restore instructions
        Write-Host "💡 To restore this backup:" -ForegroundColor Yellow
        Write-Host "   Expand-Archive -Path '$backupPath' -DestinationPath 'backend' -Force" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "❌ Error: Backup file was not created" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error creating backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# List recent backups
Write-Host "📋 Recent Backups:" -ForegroundColor Cyan
Get-ChildItem -Path $OutputPath -Filter "printchakra_backup*.zip" | 
    Sort-Object CreationTime -Descending | 
    Select-Object -First 5 |
    ForEach-Object {
        $age = (Get-Date) - $_.CreationTime
        $ageStr = if ($age.Days -gt 0) { "$($age.Days) days ago" } 
                  elseif ($age.Hours -gt 0) { "$($age.Hours) hours ago" }
                  else { "$($age.Minutes) minutes ago" }
        
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "   $($_.Name) - $size MB ($ageStr)" -ForegroundColor Gray
    }

Write-Host ""
Write-Host "✅ Backup complete!" -ForegroundColor Green
