SFTP forwarding server.  Forwards files to REST-ful endpoint selected based on
the user who uploaded the files.  Includes a REST-ful administration API to ease
integration with web-based application.

Installation
============
The SFTP server can be installed using npm.  The recommended approach is to
install the package globally as root.

```sh
sudo -H npm install -g @zingle/sftpd
```

Running
=======
To run the SFTP daemon, execute the **sftpd** command.  By default, when the
**sftpd** command executes, it looks for a file named `sftpd.conf` in the
current directory to get its configuration.  You can also pass the path to the
config file as an optional argument to the command.

```sh
# load config from ./sftp.conf
sftpd

# load config from /etc/ftp.conf
sftpd /etc/ftp.conf
```

Configuration
=============
This section describes the configuration file loaded by the **sftpd** command.

Format
------
The configuration file must be a well-formed JSON document.  Check the next
section, [Settings](#settings) for details about what keys are recognized.

Settings
--------
The following configuration keys are recognized.
*Note: this section represents nested keys by using "." delimiters*.

**admin.user**: basic authentication username used to access the admin API  
**admin.pass**: basic authentication password used to access the admin API  
**admin.port** *(default: 2200)*: port on which admin API listens  
**sftp.banner** *(default ???)*: banner message to present to SFTP user  
**sftp.home**: path where SFTP user home directories are found  
**sftp.hostKeys**: array of PEM-encoded host keys for SFTP endpoint  
**sftp.port** *(default: 22)*: port on which SFTP server listens  

Administration
==============
Additional administration changes not available in the configuration can be
handled through the included REST-ful Admin API.

Admin API
---------

### Authentication
All requests to the Admin API must include an `Authorization` header with basic
authentication credentials matching the configured admin user and password.

### Request Body
All API endpoints that accept a request body expect the request body to be in
JSON format and an appropriate `Content-Type` header included in the request
headers.

### Resource: /user
The `/user` endpoint is a service endpoint where new users can be created.

#### POST /user: add new SFTP user
**username**: login for SFTP  
**password**: login password for SFTP (optional)  
**key**: PEM-encoded public key for SFTP key-based authentication (optional)  
**forwardURL**: delivery target where user's files are delivered (optional)  

#### 303 See Other
On success, a **303** response will be returned with the user URL in the
`Location` header.

### Resource: /user/{username}
The `/user/{username}` endpoint provides information about an existing user.

#### GET /user/{username}: fetch user details

#### 200 OK
On success, a **200** response will be returned with a JSON body describing the
user details.

**username**: login for SFTP  
**uri**: relative URI of user resource in Admin API  
**hash**: hash of SFTP password  
**key**: PEM-encoded public key for SFTP key-based authentication  
**forwardURL**: delivery target where user's files are delivered  
