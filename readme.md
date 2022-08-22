# Supervisor multi-server dashboard


## Introduction

This is a simple, quick and dirty dashboard that gives you an
at-a-glance look at the state of all your [supervisor](http://supervisord.org/)
using webservers. Also provides the ability to stop and start individual
processes. It uses

  * [Twitter Bootstrap](http://twitter.github.com/bootstrap/)
  * [jQuery](http://jquery.com/)
  * [Backbone.js](http://documentcloud.github.com/backbone/)
  * [The Incutio XML-RPC Library](http://scripts.incutio.com/xmlrpc/)


## Requirements

Supervisor also needs to be configured to allow XML-RPC access on
port 9001.

## Configuration

Copy config.php.dist as config.php and edit as appropriate.

Apache config changes:

```apache
Alias /supervisorui/ "/path/to/supervisorui/web/"

<Directory "/path/to/supervisorui/web">
	Order deny,allow
	Deny from all
	Allow from 127.0.0.1 <other private ip's here>
</Directory>
```

Supervisor (/etc/supervisord.conf) changes to enable XML-RPC
access:

```ini
[inet_http_server]         ; inet (TCP) server disabled by default
port=*:9001
```

Restart apache and supervisord for these changes to take effect

## Screenshot

![screenshot](https://github.com/TortugaLabs/SupervisorUI-mf/raw/master/screenshot.png)


## Authors

- [Alejandro Liu](https://github.com/alejandroliu)
- [Marcus Gatt](https://github.com/mrgatt)

## License

Released under [The BSD 3 clause License](http://www.opensource.org/licenses/BSD-3-Clause)

- Copyright &copy; 2022 Alejandro Liu
- Copyright &copy; 2012 Luxbet Pty Ltd.
- All Rights reserved

# Changes

- 2022.08:
  - Make it so that it updates automatically
  - Removed dependancy on the [Silex](http://silex.sensiolabs.org/) phar archive.
  - updated to PHP8
  - make it possible to specify port numbers
  - added links to supervisor's built-in UI, and actions to reload
    and restart supervisor.

# Backlog

- tweak the server display
- implement sendsignal

# Issues

- I am not able to call API functions that have complext parameters.
- [supervisord API](http://supervisord.org/api.html#process-control)
- send signal:
  - USR1, graceful restart (apache)
  - HUP, restart now (apache)
  - signalProcess(name, signal)
    - Send an arbitrary UNIX signal to the process named by name
    - @param string name Name of the process to signal (or ‘group:name’)
    - @param string signal Signal to send, as name (‘HUP’) or number (‘1’)
    - @return boolean


```html
<button type="button" class="sigusr1 btn btn-mini btn-warning" title="Send USR1 signal">
 <i class="icon-white icon-exclamation-sign"></i>
</button>
<button type="button" class="sighup btn btn-mini btn-warning" title="Send HUP signal">
 <i class="icon-white icon-repeat"></i>
</button>
```
