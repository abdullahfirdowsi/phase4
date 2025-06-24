# Fix SCSS files with incorrect line endings
Write-Host "Fixing SCSS line endings..." -ForegroundColor Green

$scssFiles = Get-ChildItem -Path "src" -Recurse -Include "*.scss"

foreach ($file in $scssFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix the incorrect line endings introduced by the previous script
    if ($content -match '`r`n') {
        Write-Host "Fixing: $($file.FullName)" -ForegroundColor Yellow
        $content = $content -replace '`r`n', "`r`n"
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Fixed" -ForegroundColor Green
    }
}

Write-Host "Line ending fixes completed!" -ForegroundColor Green
