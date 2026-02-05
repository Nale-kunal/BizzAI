$file = 'f:\Inventory Management\Tushar''s Code\BizzAI\frontend\src\pages\Dashboard.jsx'
$content = Get-Content $file -Raw

# Pattern to match the vertical card structure and convert to horizontal
# This will match cards that still have the old structure with label and value separated
$pattern = '(?s)(<div className="flex items-center space-x-3">)\s*(<div className="p-2 bg-gradient.*?</div>)\s*(</div>)\s*(<p className="text-gray-600.*?uppercase tracking-wide mb-1\.5">)(.*?)(</p>)\s*(<p className="text-xl font-bold.*?>)(.*?)(</p>)'
$replacement = '$1$2<div>$7$8$9$4$5$6</div>$3'

$content = $content -replace $pattern, $replacement

Set-Content $file -Value $content -NoNewline
Write-Host "Restructured card HTML to horizontal layout!"
