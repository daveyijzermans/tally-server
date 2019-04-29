# Configuration

There are a couple of config files that need to be created before running the server.

## config/admin.json

This file holds some general server settings, names and global parameters.

| Key | Default | Description |
| --- | --- | --- |
| serverName | Administration | Page title
| serverHost | hostname.local | Server hostname/ip, just for show
| adminPass | md5password | MD5 hashed password to access the admin pages
| updateMixerNames | true | Whether to update mixer inputs label with the corresponding users' names. Can be set from the admin page as well.
| clientKey | 123456789 | Unique key used for identifying to APIs
| clientName | tally-server | Unique client name used for identifying to APIs

## config/servers.json

In this file you config the servers you wish the server to connect to.

| type | name | hostname |
| --- | --- | --- |
| Server type (see below) | Server nice name | Server hostname/ip address |

### Mumble (type: `mumble`)

| Key | Default | Description |
| --- | --- | --- |
| username | Tallybot | Username to connect to Mumble server |
| password | serverpassword | Server password to connect to Mumble server, if needed |
| key | ./config/key.pem | Path to private key file |
| cert | ./config/cert.pem | Path to certificate file |
| cycleChannels | ["Root","Cameras","Engineering","Production"] | Array of channel names that users can be in |

### vMix (type: `vmix`)

| Key | Default | Description |
| --- | --- | --- |
| wol | 00:00:00:00:00:00 | MAC address to sent WOL packets to |
| winUserPass | user%pass | Username and password to allow remote shutdown over samba |
| linked | vMix 1 | Link mixer to other mixer name |

### Aten matrix (type: `aten`)

| Key | Default | Description |
| --- | --- | --- |
| username | administrator | Username to connect to TCP server |
| password | password | Password to connect to TCP server (plain text) |
| matrix | [[inputs], [outputs]] | Description of the connections to and from matrix. matrix[0] should be inputs, matrix[1] should be ouputs. Skip in- and outputs 0! Index starts at 1! See example config. |

### Videohub matrix (type: `videohub`)

| Key | Default | Description |
| --- | --- | --- |
| matrix | [[inputs], [outputs]] | Description of the connections to and from matrix. matrix[0] should be inputs, matrix[1] should be ouputs. Skip in- and outputs 0! Index starts at 1! See example config. |

### Netgear managed switch (type: `netgear`)

| Key | Default | Description |
| --- | --- | --- |
| username | administrator | Username to connect to TCP server |
| password | password | Password to connect to TCP server (plain text) |

### Huawei 4G dongle (type: `huawei`)

| Key | Default | Description |
| --- | --- | --- |
| url | http://192.168.8.1 | URL to the Hilink administration page |

### APC (type: `apc`)

No extra options

### ATEM (type: `atem`)

| Key | Default | Description |
| --- | --- | --- |
| linked | vMix 1 | Link mixer to other mixer name |