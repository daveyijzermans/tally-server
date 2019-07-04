#/bin/bash
mkdir ~/tally-client
cd ~/tally-client
rm package-lock.json
wget http://192.168.10.113/client/index.js -O index.js
wget http://192.168.10.113/client/config.json -O config.json
wget http://192.168.10.113/client/package.client.json -O package.json
npm install
sudo /sbin/shutdown -r now
