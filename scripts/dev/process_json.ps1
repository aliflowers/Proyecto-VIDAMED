
$jsonContent = Get-Content -Path "c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\vidamed-laboratorio-parametros.json" -Raw | ConvertFrom-Json
$sqlStatements = @()

foreach ($examen in $jsonContent.examenes) {
    $nombre = $examen.nombre.Replace("'", "''")
    $parametrosJson = $examen.parametros | ConvertTo-Json -Compress
    $escapedParametrosJson = $parametrosJson.Replace("'", "''")
    $sql = "UPDATE public.estudios SET campos_formulario = '$escapedParametrosJson' WHERE nombre = '$nombre';"
    $sqlStatements += $sql
}

$sqlStatements | Out-File -FilePath "c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\update_statements.sql" -Encoding utf8
