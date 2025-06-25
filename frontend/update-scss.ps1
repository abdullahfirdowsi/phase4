# PowerShell script to update SCSS files from @import to @use
Write-Host "Starting SCSS migration from @import to @use..." -ForegroundColor Green

# Get all SCSS files that contain @import statements for variables or themes
$scssFiles = Get-ChildItem -Path "src" -Recurse -Include "*.scss" | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match '@import.*variables' -or $content -match '@import.*themes'
}

foreach ($file in $scssFiles) {
    Write-Host "Processing: $($file.FullName)" -ForegroundColor Yellow
    
    # Read the file content
    $content = Get-Content $file.FullName -Raw
    
    # Skip if already using @use
    if ($content -match '@use.*variables.*as v') {
        Write-Host "  Already using @use, skipping..." -ForegroundColor Gray
        continue
    }
    
    # Replace @import with @use for variables and themes
    $content = $content -replace '@import\s+"([^"]*)/variables";\s*\r?\n@import\s+"([^"]*)/themes";', '@use "$1/variables" as v;`r`n@use "$2/themes";'
    $content = $content -replace '@import\s+"([^"]*)/variables";', '@use "$1/variables" as v;'
    $content = $content -replace '@import\s+"([^"]*)/themes";', '@use "$1/themes";'
    
    # Replace variable references with namespaced versions
    $variableReplacements = @{
        '$navbar-height' = 'v.$navbar-height'
        '$sidebar-width' = 'v.$sidebar-width'
        '$breakpoint-mobile' = 'v.$breakpoint-mobile'
        '$breakpoint-tablet' = 'v.$breakpoint-tablet'
        '$breakpoint-desktop' = 'v.$breakpoint-desktop'
        '$font-family-base' = 'v.$font-family-base'
        '$font-weight-light' = 'v.$font-weight-light'
        '$font-weight-normal' = 'v.$font-weight-normal'
        '$font-weight-medium' = 'v.$font-weight-medium'
        '$font-weight-semibold' = 'v.$font-weight-semibold'
        '$font-weight-bold' = 'v.$font-weight-bold'
        '$font-weight-extrabold' = 'v.$font-weight-extrabold'
        '$border-radius' = 'v.$border-radius'
        '$border-radius-xs' = 'v.$border-radius-xs'
        '$border-radius-sm' = 'v.$border-radius-sm'
        '$border-radius-md' = 'v.$border-radius-md'
        '$border-radius-lg' = 'v.$border-radius-lg'
        '$border-radius-xl' = 'v.$border-radius-xl'
        '$border-radius-2xl' = 'v.$border-radius-2xl'
        '$border-radius-full' = 'v.$border-radius-full'
        '$transition-base' = 'v.$transition-base'
        '$transition-fast' = 'v.$transition-fast'
        '$transition-slow' = 'v.$transition-slow'
        '$box-shadow' = 'v.$box-shadow'
        '$box-shadow-xs' = 'v.$box-shadow-xs'
        '$box-shadow-sm' = 'v.$box-shadow-sm'
        '$box-shadow-md' = 'v.$box-shadow-md'
        '$box-shadow-lg' = 'v.$box-shadow-lg'
        '$box-shadow-xl' = 'v.$box-shadow-xl'
        '$box-shadow-2xl' = 'v.$box-shadow-2xl'
        '$btn-border-radius' = 'v.$btn-border-radius'
        '$btn-font-weight' = 'v.$btn-font-weight'
        '$btn-padding-y' = 'v.$btn-padding-y'
        '$btn-padding-x' = 'v.$btn-padding-x'
        '$btn-padding-y-sm' = 'v.$btn-padding-y-sm'
        '$btn-padding-x-sm' = 'v.$btn-padding-x-sm'
        '$btn-padding-y-lg' = 'v.$btn-padding-y-lg'
        '$btn-padding-x-lg' = 'v.$btn-padding-x-lg'
        '$card-border-radius' = 'v.$card-border-radius'
        '$card-box-shadow' = 'v.$card-box-shadow'
        '$card-padding' = 'v.$card-padding'
        '$input-border-radius' = 'v.$input-border-radius'
        '$input-focus-border-color' = 'v.$input-focus-border-color'
        '$input-padding-y' = 'v.$input-padding-y'
        '$input-padding-x' = 'v.$input-padding-x'
        '$z-dropdown' = 'v.$z-dropdown'
        '$z-sticky' = 'v.$z-sticky'
        '$z-fixed' = 'v.$z-fixed'
        '$z-modal-backdrop' = 'v.$z-modal-backdrop'
        '$z-modal' = 'v.$z-modal'
        '$z-popover' = 'v.$z-popover'
        '$z-tooltip' = 'v.$z-tooltip'
        '$z-chat-widget' = 'v.$z-chat-widget'
    }
    
    foreach ($old in $variableReplacements.Keys) {
        $new = $variableReplacements[$old]
        $content = $content -replace [regex]::Escape($old), $new
    }
    
    # Write the updated content back to the file
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "  Updated successfully" -ForegroundColor Green
}

Write-Host "SCSS migration completed!" -ForegroundColor Green
