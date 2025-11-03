
$sqlStatements = Get-Content -Path "c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\update_statements.sql"

foreach ($sql in $sqlStatements) {
    $migrationName = "update_study_" + [System.Guid]::NewGuid().ToString().Replace("-", "")
    $command = "mcp_supabase_apply_migration(name='" + $migrationName + "', query='" + $sql.Replace("'", "''") + "')"
    Invoke-Expression $command
}