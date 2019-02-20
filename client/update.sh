#/bin/bash
mkdir ~/tally-client
cd ~/tally-client
rm package-lock.json
wget http://switch-intercom/client/index.js -O index.js
wget http://switch-intercom/client/config.json -O config.json
wget http://switch-intercom/client/package.json -O package.json
npm install
sudo /sbin/shutdown -r now