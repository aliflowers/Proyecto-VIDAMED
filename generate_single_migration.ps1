
$sqlStatements = Get-Content -Path "c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\update_statements.sql"
$migrationContent = "BEGIN;\n"
$migrationContent += $sqlStatements -join "\n"
$migrationContent += "\nCOMMIT;"

$migrationContent | Out-File -FilePath "c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\single_migration.sql" -Encoding utf8