# MCMTip Bot
#### author: @dcryptt

[See bot specification below]

## Installation for Ubuntu 16.04 LTS:
### 1. Install node, npm and project dependencies
#### 1a. Install node & npm
```
sudo apt-get update
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt-get install nodejs
```

Check versions:
```
node -v 
> v12.8.0

npm -v
> 6.10.2
```

#### 1b. Install project dependencies
```
cd <mcmtip repo dir>
npm install --save discord.js mysql node-schedule mysqldump
mkdir mysql_dumps
```

### 2. Install SQL server (https://medium.com/technoetics/installing-and-setting-up-mysql-with-nodejs-in-ubuntu-75e0c0a693ba)
```
sudo apt-get install mysql-server
(Remember the root password you provided here)
mysql --version
> mysql  Ver 14.14 Distrib 5.7.27, for Linux (x86_64) using  EditLine wrapper
(Check if service is running)
service mysql status
(If it shows status: Unknown job: mysql):
sudo service mysql start
mysql -u root -p
(insert root password)
create database mcmtip;
use mcmtip;
CREATE TABLE IF NOT EXISTS `d_users` (`username` varchar(255) NOT NULL, `userid` varchar(255) NOT NULL, `rank` varchar(255) DEFAULT NULL, `available_mcm` int(11) NOT NULL, `received_mcm` int(11) NOT NULL);
```


### 3. Create discord bot: https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/ (up to step 5)
- You should be logged into your own discord. Go to discordapp.com/developers/applications/me
- Create a "New Application", name is arbitrary (e.g. MCMTipBot).
- In new application, click "Bot" under Settings. Click "Add Bot".
- In bot settings page, get bot token "Click to reveal token". Save it somewhere safe. Do not share it. Also disable the "Public Bot" setting.
- Under "General Information", find your Client ID. Copy the number and add it to this URL, in the place of word CLIENTID.
`https://discordapp.com/oauth2/authorize?&client_id=CLIENTID&scope=bot&permissions=8`
- Open the URL in a browser. This should open a discord page where you can invite the bot to your server.
- Once done, check that the bot account is in the server from your usual discord account.


### 4. MCMTip bot
Edit files with own configuration:

    - mysql_config.json
      - host (localhost), user (root), password, database (mcmtip unless changed), port (on linux should be 3306)
    - botSettings.json
      - token: new generated token from own bot created in setup
      - mcm_guild_id: Make sure to set ID to YOUR server (currently set to a test server ID.)


### 5. Run the bot!
```
node bot.js
```