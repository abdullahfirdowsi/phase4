# Simple fix for SCSS @use statements
$files = @(
    "src\pages\Dashboard\SideBar\Sidebar.scss",
    "src\pages\Dashboard\ChatScreen\ChatScreen.scss", 
    "src\pages\Dashboard\AdminDashboard\AdminDashboard.scss",
    "src\pages\Dashboard\DashboardHome\DashboardHome.scss",
    "src\pages\Dashboard\QuizSystem\QuizSystem.scss",
    "src\components\SearchWidget\SearchWidget.scss",
    "src\pages\Dashboard\ChatScreen\ChatInput.scss",
    "src\pages\Dashboard\ChatScreen\AIMessage.scss",
    "src\components\AnalyticsWidget\AnalyticsWidget.scss"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        # Fix the malformed @use statements
        $content = $content -replace '@use "([^"]*)" as v;`r`n@use "([^"]*)";', '@use "$1" as v;
@use "$2";'
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Fixed: $file" -ForegroundColor Green
    }
}
