# Fix duplicate v.v. prefixes in SCSS files
$files = Get-ChildItem -Path "src" -Recurse -Include "*.scss"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'v\.v\.\$') {
        Write-Host "Fixing duplicates in: $($file.FullName)" -ForegroundColor Yellow
        $content = $content -replace 'v\.v\.\$', 'v.$'
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Fixed" -ForegroundColor Green
    }
}

Write-Host "Duplicate prefix fix completed!" -ForegroundColor Green
