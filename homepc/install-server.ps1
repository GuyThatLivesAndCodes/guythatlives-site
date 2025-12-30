# Remote PC Control Server - Easy Installer (PowerShell)
# Downloads and sets up the server automatically

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Remote PC Control Server - Easy Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org"
    Write-Host "Download the LTS version and run the installer."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Create server directory
Write-Host "Creating server directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "remote-pc-server" | Out-Null
Set-Location -Path "remote-pc-server"

Write-Host ""
Write-Host "Downloading server files..." -ForegroundColor Yellow
Write-Host ""

# Download files from GitHub raw URLs
$baseUrl = "https://raw.githubusercontent.com/GuyThatLivesAndCodes/guythatlives-site/claude/remote-pc-web-control-YblmU/homepc/server"

$files = @{
    "server.js" = "$baseUrl/server.js"
    "discovery-server.js" = "$baseUrl/discovery-server.js"
    "package.json" = "$baseUrl/package.json"
    ".env.example" = "$baseUrl/.env.example"
    ".gitignore" = "$baseUrl/.gitignore"
}

$i = 1
$total = $files.Count

foreach ($file in $files.GetEnumerator()) {
    Write-Host "[$i/$total] Downloading $($file.Key)..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $file.Value -OutFile $file.Key -ErrorAction Stop
        $i++
    } catch {
        Write-Host "Failed to download $($file.Key): $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Files downloaded successfully!" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host ""

try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to install dependencies." -ForegroundColor Red
    Write-Host ""
    Write-Host "If you see an error about 'robotjs', you may need to install build tools:" -ForegroundColor Yellow
    Write-Host "  npm install -g windows-build-tools" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating configuration file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "IMPORTANT: You need to edit the .env file!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please set:"
    Write-Host "  - PASSWORD: Your secure password"
    Write-Host "  - COMPUTER_NAME: A friendly name for this PC"
    Write-Host ""
    Write-Host "The .env file is located at:"
    Write-Host "  $PWD\.env"
    Write-Host ""

    $openEnv = Read-Host "Would you like to open .env now? (Y/N)"
    if ($openEnv -eq "Y" -or $openEnv -eq "y") {
        notepad .env
    }
} else {
    Write-Host "Configuration file (.env) already exists." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Quick Start Guide" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Edit .env file and set your PASSWORD and COMPUTER_NAME"
Write-Host ""
Write-Host "2. Start the discovery server (in a separate window):"
Write-Host "   npm run discovery" -ForegroundColor Green
Write-Host ""
Write-Host "3. Start this PC's server:"
Write-Host "   npm start" -ForegroundColor Green
Write-Host ""
Write-Host "4. Go to https://guythatlives.net/homepc in your browser"
Write-Host ""
Write-Host "Full documentation:"
Write-Host "https://github.com/GuyThatLivesAndCodes/guythatlives-site/tree/claude/remote-pc-web-control-YblmU/homepc"
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$startNow = Read-Host "Would you like to start the server now? (Y/N)"
if ($startNow -eq "Y" -or $startNow -eq "y") {
    Write-Host ""
    Write-Host "Starting server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    npm start
}

Write-Host ""
Write-Host "Installation script finished!" -ForegroundColor Green
Write-Host "You can run 'npm start' anytime to start the server."
Write-Host ""
Read-Host "Press Enter to exit"
