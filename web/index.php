<?php
require_once(__DIR__.'/../src/Supervisor/IXR_Library.php');
require_once(__DIR__.'/../src/Supervisor/API.php');
define('VERSION',trim(file_get_contents(__DIR__.'/../VERSION')));

$api_root = $_SERVER['SCRIPT_NAME'].'/';
$url_root = dirname($_SERVER['SCRIPT_NAME']);
if ($url_root != '/') $url_root .= '/';

$servers = require(__DIR__.'/../config.php');

function check_server($addr) {
  global $servers;
  foreach ($servers as $n) {
    if ($n['ip'] == $addr) return $n;
  }
  return null;
}

function dispatcher($route) {
  global $servers;

  Header('Content-type: text/plain');
  if ($route == '/server/list.json') {
    foreach (array_keys($servers) as $server_id) {
      $servers[$server_id]['id'] = $server_id;
    }
    echo json_encode($servers);
    return;
  }
  if (preg_match('/\/server\/(reload|restart)\/(\d+)\/(.*)$/',$route,$mv)) {
    list(,$cmd,$id,$addr) = $mv;
    if (is_null(check_server($addr))) return 'Unknown server '.$addr;

    $api = new \Supervisor\API;
    if ($cmd == 'reload') {
      $res = $api->reloadConfig($addr);
    } elseif ($cmd == 'restart') {
      $res = $api->restart($addr);
    } else {
      return 'Unknown command: "' . $cmd.'"';
    }
    header('Location: '.$_SERVER['SCRIPT_NAME']);

    var_dump($res);

    print_r($mv);
    return;
  }
  if (preg_match('/\/server\/details\/(\d+)\/(.*)$/',$route,$mv)) {
    list(,$id,$addr) = $mv;
    $n = check_server($addr);
    if (is_null($n)) return 'Unknown server '.$addr;
    $name = $n['name'];

    $api = new \Supervisor\API;
    $details = array_merge([
	'version' => $api->getSupervisorVersion($addr).' (API:'.$api->getAPIVersion($addr).')',
	'pid' => $api->getPID($addr),
      ],
      $api->getState($addr),
      [
	'name' => $name,
	'ip' => $addr,
      ]);
    echo json_encode($details);
    return;
  }

  if (preg_match('/\/service\/(\d+)\/([^\/]+)$/',$route,$mv)) {
    list(,$id,$addr) = $mv;
    if (is_null(check_server($addr))) return 'Unknown server '.$addr;

    $api = new \Supervisor\API;
    $services = $api->getAllProcessInfo($addr);
    echo json_encode($services);
    return;
  }

  //~ if (preg_match('/\/service\/(\d+)\/([^\/]+)\/([^\/]+)\/signal\/([^\/]+)$/',$route,$mv)) {
    //~ list(,$id,$addr,$service,$signal) = $mv;
    //~ if (is_null(check_server($addr))) return 'Unknown server '.$addr;

    //~ $api = new \Supervisor\API;
    //~ $res = $api->signalProcess($addr,$service,1);

    //~ print_r([$mv,$res]);
    //~ return;
  //~ }


  if (preg_match('/\/service\/(\d+)\/([^\/]+)\/([^\/]+)$/',$route,$mv)) {
    list(,$id,$addr,$service) = $mv;
    if (is_null(check_server($addr))) return 'Unknown server '.$addr;

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') == 'POST') {
      $req = json_decode(file_get_contents('php://input'), true);
      if (!$req) return 'Unable to decode JSON';

      $res = false;

      $api = new \Supervisor\API;
      $cstate = $api->getProcessInfo($addr,$service);
      if (isset($cstate['error'])) {
	echo json_encode($cstate);
	return;
      }
      if (!isset($req['running'])) {
	echo json_encode(['error'=>['code'=>'','msg'=>'Error missing state in request']]);
	return;
      }
      if ($req['running'] && $cstate['state'] == $api::STATE_RUNNING) {
	$res = $api->stopProcess($addr,$service);
      } elseif (!$req['running'] && $cstate['state'] != $api::STATE_RUNNING)  {
	$res = $api->startProcess($addr,$service);
      } else {
	$res = ['error'=>['code'=>'',
	  'msg'=>'Invalid state requested'
	]];
      }
      if (!$res) {
	$res = $res = ['error'=>['code'=>'','msg'=>'Error state for '.$service]];
      }
      echo json_encode($res);
      return;
    } else {
      $api = new \Supervisor\API;
      $res = $api->getProcessInfo($addr,$service);
      echo json_encode($res);
      return;
    }
  }
  return 'Not implemented';
}

if (empty($_SERVER['PATH_INFO'])) {
  include(__DIR__.'/../views/supervisorui.html');
} else {
  $res = dispatcher($_SERVER['PATH_INFO']);
  if ($res) {
    http_response_code(500);
    echo $res;
  }
}



//~ $id_cnt = 0;
//~ function idgen(): int {
  //~ global $id_cnt;
  //~ return ++$id_cnt;
//~ }

//~ function run_cmds() {
  //~ if (!isset($_GET['cmd'])) return;
  //~ switch ($_GET['cmd']) {
  //~ case 'stopstart':
    //~ if (!(isset($_GET['mode']) && isset($_GET['ip']) && isset($_GET['name']))) return 'Missing arguments for stopstart command';
    //~ list($mode,$ip,$name) = [$_GET['mode'],$_GET['ip'],$_GET['name']];

    //~ $api = new \Supervisor\API;
    //~ if ($mode) { // Is running...
      //~ $res = $api->stopProcess($ip,$name);
      //~ return $res ? ('Succesfully stopped '.$name.' on '.$ip) :
		    //~ ('Error stoping '.$name.' on '.$ip);
    //~ } else {
      //~ $res = $api->startProcess($ip,$name);
      //~ return $res ? ('Succesfully started '.$name.' on '.$ip) :
		    //~ ('Error starting '.$name.' on '.$ip);
    //~ }
    //~ break;
  //~ default:
    //~ return 'Unknown command: '.$_GET['cmd'];
  //~ }
//~ }


//~ $msg = run_cmds();

//~ $status = [];
//~ foreach ($servs as $name => $ip) {
  //~ $api = new \Supervisor\API;
  //~ $status[$name] = [
    //~ 'ip' => $ip,
    //~ 'supervisor' => $api->getIdentification($ip)
		//~ .' '.$api->getSupervisorVersion($ip)
		//~ .' (API:'.$api->getAPIVersion($ip).')',
    //~ 'pid' => $api->getPID($ip),
    //~ 'services' => $api->getAllProcessInfo($ip),
  //~ ];
  //~ foreach ($status[$name]['services'] as &$srv) {
    //~ $srv['running'] = $srv['state'] == $api::STATE_RUNNING;
  //~ }
//~ }


