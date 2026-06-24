<?php
// ─── Config ───────────────────────────────────────────────────────────────
$UPLOAD_DIR = __DIR__ . '/uploads';
$MAX_SIZE   = 10 * 1024 * 1024;    // 10 MB
$MAX_FILES  = 5;
$TTL        = 7 * 24 * 60 * 60;    // 7 days

// ─── CORS ─────────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido']);
    exit;
}

// ─── Limpieza periódica (archivos > 7 días) ──────────────────────────────
if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
} else {
    $now = time();
    foreach (glob($UPLOAD_DIR . '/*') as $f) {
        if (is_file($f) && ($now - filemtime($f)) > $TTL) {
            unlink($f);
        }
    }
}

// ─── Validar archivos ─────────────────────────────────────────────────────
if (!isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No se recibieron archivos']);
    exit;
}

$files = $_FILES['files'];
$uploaded = [];

// Normalizar a array si es un solo archivo
if (!is_array($files['name'])) {
    $files = [
        'name'     => [$files['name']],
        'type'     => [$files['type']],
        'tmp_name' => [$files['tmp_name']],
        'error'    => [$files['error']],
        'size'     => [$files['size']],
    ];
}

$count = count($files['name']);
if ($count > $MAX_FILES) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => "Máximo $MAX_FILES archivos"]);
    exit;
}

for ($i = 0; $i < $count; $i++) {
    if ($files['error'][$i] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Error al subir: ' . $files['name'][$i]]);
        exit;
    }

    $tmpPath  = $files['tmp_name'][$i];
    $origName = $files['name'][$i];
    $size     = $files['size'][$i];

    // Validar tamaño
    if ($size > $MAX_SIZE) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => "$origName supera 10 MB"]);
        exit;
    }

    // Validar extensión
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if ($ext !== 'pdf') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => "$origName no es un PDF"]);
        exit;
    }

    // Validar magic bytes (%PDF-)
    $handle = fopen($tmpPath, 'rb');
    $header = fread($handle, 5);
    fclose($handle);
    if ($header !== '%PDF-') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => "$origName no es un PDF válido"]);
        exit;
    }

    // Guardar con nombre único
    $safeName = preg_replace('/[^a-zA-Z0-9._\-]/', '_', $origName);
    $uniqName = time() . '_' . bin2hex(random_bytes(4)) . '_' . $safeName;
    $destPath = $UPLOAD_DIR . '/' . $uniqName;

    if (!move_uploaded_file($tmpPath, $destPath)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error al guardar ' . $origName]);
        exit;
    }

    $uploaded[] = [
        'name' => $origName,
        'url'  => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
                  . '://' . $_SERVER['HTTP_HOST']
                  . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/')
                  . '/uploads/' . $uniqName,
    ];
}

echo json_encode(['ok' => true, 'files' => $uploaded]);
