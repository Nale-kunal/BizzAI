$file = 'f:\Inventory Management\Tushar''s Code\BizzAI\frontend\src\pages\Dashboard.jsx'
$content = Get-Content $file -Raw

# Replace the vertical card structure with horizontal layout for all overview cards
# Pattern: icon on top -> icon on left with text on right

$content = $content -replace '(?s)(<div className="flex items-center justify-between mb-1\.5">)\s*(<div className="p-1\.5 bg-gradient.*?</div>)\s*(</div>)\s*(<p className="text-gray-600.*?uppercase tracking-wide mb-1\.5">)(.*?)(</p>)\s*(<p className="text-lg font-bold.*?>)(.*?)(</p>)', '<div className="flex items-center space-x-3">$2<div>$7$8$9$4$5$6</div></div>'

Set-Content $file -Value $content -NoNewline
Write-Host "Dashboard overview cards converted to horizontal layout!"
