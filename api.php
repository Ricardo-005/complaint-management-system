<?php
// 1. SILENCIAR ERRORES PARA EVITAR "CARGA INFINITA"
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

// 2. CONEXIÓN
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "uac_panel_db";

$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Error DB"]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// --- GET (LEER) ---
if ($method === 'GET') {
    if ($action === 'listar') {
        $busqueda = $conn->real_escape_string($_GET['busqueda'] ?? '');
        $estatus = $conn->real_escape_string($_GET['estatus'] ?? 'all');
        
        $sql = "SELECT * FROM denuncias WHERE 1=1";
        if ($estatus != 'all') $sql .= " AND estatus = '$estatus'";
        if (!empty($busqueda)) $sql .= " AND (numero_expediente LIKE '%$busqueda%' OR nombre_ciudadano LIKE '%$busqueda%' OR cedula_ciudadano LIKE '%$busqueda%' OR cuadrante LIKE '%$busqueda%')";
        
        $sql .= " ORDER BY fecha_registro DESC"; // Ordenar por fecha más reciente
        
        $result = $conn->query($sql);
        $data = [];
        if ($result) while($row = $result->fetch_assoc()) $data[] = $row;
        echo json_encode($data);
    }
    elseif ($action === 'estadisticas') {
        $stats = [ 'por_mes' => [], 'por_cuadrante' => [], 'por_cuadrante_mes' => [], 'total_global' => 0 ];
        
        $res = $conn->query("SELECT COUNT(*) as total FROM denuncias");
        if($res) $stats['total_global'] = $res->fetch_assoc()['total'];

        $res = $conn->query("SELECT cuadrante, COUNT(*) as total FROM denuncias GROUP BY cuadrante");
        if($res) while($r = $res->fetch_assoc()) $stats['por_cuadrante'][] = $r;

        $res = $conn->query("SELECT DATE_FORMAT(fecha_registro, '%Y-%m') as mes, COUNT(*) as total FROM denuncias GROUP BY mes ORDER BY mes DESC LIMIT 6");
        if($res) while($r = $res->fetch_assoc()) $stats['por_mes'][] = $r;

        $res = $conn->query("SELECT cuadrante, DATE_FORMAT(fecha_registro, '%Y-%m') as mes, COUNT(*) as total FROM denuncias GROUP BY cuadrante, mes ORDER BY mes DESC");
        if($res) while($r = $res->fetch_assoc()) $stats['por_cuadrante_mes'][] = $r;

        echo json_encode($stats);
    }
    elseif ($action === 'buscar_cedula') {
        $ced = $conn->real_escape_string($_GET['cedula'] ?? '');
        $res = $conn->query("SELECT * FROM denuncias WHERE cedula_ciudadano = '$ced' ORDER BY fecha_registro DESC");
        $data = [];
        if($res) while($r = $res->fetch_assoc()) $data[] = $r;
        echo json_encode($data);
    }
}

// --- POST (GUARDAR) ---
if ($method === 'POST') {
    $d = json_decode(file_get_contents("php://input"), true);
    $acc = $d['accion'] ?? '';

    if ($acc === 'crear') {
        $exp = $conn->real_escape_string($d['expediente']);
        $nom = $conn->real_escape_string($d['nombre']);
        $ced = $conn->real_escape_string($d['cedula']);
        $del = $conn->real_escape_string($d['delito']);
        $cua = $conn->real_escape_string($d['cuadrante']);
        $desc = $conn->real_escape_string($d['descripcion']);
        $asig = $conn->real_escape_string($d['asignado']);
        
        // --- LÓGICA DE FECHA (NUEVO) ---
        $fechaManual = $conn->real_escape_string($d['fecha'] ?? '');
        
        if (!empty($fechaManual)) {
            // Si puso fecha manual, usamos esa y le agregamos la hora actual
            $fechaFinal = $fechaManual . ' ' . date('H:i:s');
        } else {
            // Si no puso nada, usamos la fecha y hora de AHORA MISMO
            $fechaFinal = date('Y-m-d H:i:s');
        }

        $sql = "INSERT INTO denuncias (numero_expediente, nombre_ciudadano, cedula_ciudadano, tipo_delito, cuadrante, descripcion, asignado_a, fecha_registro) 
                VALUES ('$exp', '$nom', '$ced', '$del', '$cua', '$desc', '$asig', '$fechaFinal')";

        if ($conn->query($sql)) echo json_encode(["mensaje" => "Ok"]);
        else echo json_encode(["error" => $conn->error]);
    }

    elseif ($acc === 'editar') {
        $id = $conn->real_escape_string($d['id']);
        $exp = $conn->real_escape_string($d['expediente']);
        $nom = $conn->real_escape_string($d['nombre']);
        $ced = $conn->real_escape_string($d['cedula']);
        $del = $conn->real_escape_string($d['delito']);
        $cua = $conn->real_escape_string($d['cuadrante']);
        $desc = $conn->real_escape_string($d['descripcion']);
        $asig = $conn->real_escape_string($d['asignado']);
        
        $sql = "UPDATE denuncias SET numero_expediente='$exp', nombre_ciudadano='$nom', cedula_ciudadano='$ced', tipo_delito='$del', cuadrante='$cua', descripcion='$desc', asignado_a='$asig' WHERE id='$id'";
        if($conn->query($sql)) echo json_encode(["mensaje" => "Ok"]);
    }

    elseif ($acc === 'eliminar') {
        $id = $conn->real_escape_string($d['id']);
        $conn->query("DELETE FROM denuncias WHERE id='$id'");
        echo json_encode(["mensaje" => "Ok"]);
    }
    
    elseif ($acc === 'cerrar') {
        $id = $conn->real_escape_string($d['id']);
        $conn->query("UPDATE denuncias SET estatus='cerrada' WHERE id='$id'");
        echo json_encode(["mensaje" => "Ok"]);
    }
}
$conn->close();
?>