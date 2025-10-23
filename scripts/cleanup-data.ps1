# Data Directory Cleanup Script
# Removes files older than 7 days from the data directory

param(
    [int]$DaysOld = 7,
    [switch]$WhatIf
)

$dataDir = Join-Path $PSScriptRoot "backend\data"
$cutoffDate = (Get-Date).AddDays(-$DaysOld)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "PrintChakra - Data Cleanup Utility" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Data Directory: $dataDir" -ForegroundColor Yellow
Write-Host "Removing files older than: $cutoffDate" -ForegroundColor Yellow
Write-Host ""

if ($WhatIf) {
    Write-Host "⚠️  DRY RUN MODE - No files will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# Function to clean a directory
function Clean-Directory {
    param(
        [string]$Path,
        [string]$Name
    )
    
    if (Test-Path $Path) {
        $files = Get-ChildItem -Path $Path -File -Recurse | Where-Object {
            $_.Name -ne ".gitkeep" -and $_.LastWriteTime -lt $cutoffDate
        }
        
        if ($files.Count -gt 0) {
            Write-Host "📁 $Name" -ForegroundColor Cyan
            Write-Host "   Found $($files.Count) old files" -ForegroundColor Gray
            
            $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
            $sizeMB = [math]::Round($totalSize / 1MB, 2)
            
            Write-Host "   Total size: $sizeMB MB" -ForegroundColor Gray
            
            if ($WhatIf) {
                foreach ($file in $files) {
                    Write-Host "   Would delete: $($file.Name) ($(Get-Date $file.LastWriteTime -Format 'yyyy-MM-dd'))" -ForegroundColor DarkGray
                }
            } else {
                foreach ($file in $files) {
                    Remove-Item $file.FullName -Force
                    Write-Host "   ✓ Deleted: $($file.Name)" -ForegroundColor Green
                }
            }
            Write-Host ""
            return $files.Count
        } else {
            Write-Host "📁 $Name - No old files found" -ForegroundColor Green
            return 0
        }
    } else {
        Write-Host "⚠️  $Name - Directory not found" -ForegroundColor Yellow
        return 0
    }
}

# Clean each directory
$totalCleaned = 0

$totalCleaned += Clean-Directory -Path (Join-Path $dataDir "uploads") -Name "Uploads"
$totalCleaned += Clean-Directory -Path (Join-Path $dataDir "processed") -Name "Processed Images"
$totalCleaned += Clean-Directory -Path (Join-Path $dataDir "processed_text") -Name "Processed Text"
$totalCleaned += Clean-Directory -Path (Join-Path $dataDir "pdfs") -Name "PDFs"
$totalCleaned += Clean-Directory -Path (Join-Path $dataDir "converted") -Name "Converted Files"

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($WhatIf) {
    Write-Host "Would delete: $totalCleaned files" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run without -WhatIf to actually delete files" -ForegroundColor Yellow
} else {
    if ($totalCleaned -gt 0) {
        Write-Host "✅ Successfully deleted: $totalCleaned files" -ForegroundColor Green
    } else {
        Write-Host "✅ No old files to clean" -ForegroundColor Green
    }
}

Write-Host ""

# Show current disk usage
Write-Host "Current Disk Usage:" -ForegroundColor Cyan
Get-ChildItem -Path $dataDir -Recurse -File | 
    Group-Object Directory | 
    Select-Object @{N='Directory';E={$_.Name | Split-Path -Leaf}}, 
                  @{N='Files';E={$_.Count}}, 
                  @{N='Size (MB)';E={[math]::Round(($_.Group | Measure-Object Length -Sum).Sum / 1MB, 2)}} |
    Format-Table -AutoSize
