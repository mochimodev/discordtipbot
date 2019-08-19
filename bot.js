//Node libraries
const fs = require("fs");
const mysql = require("mysql");
const Discord = require("discord.js");
const schedule = require('node-schedule');

//MCMtip dependencies
const botSettings = require("./botSettings.json");
const prefix = botSettings.prefix
const mysql_config = require("./mysql_config.json")
const scheduled_updatedb = require("./scripts/scheduled_updatedb.js")

const log_file = "./mcmtip_log.txt"

const bot = new Discord.Client({disableEveryone: true});
bot.commands = new Discord.Collection();

fs.readdir("./cmds/", (err, files) => {
	if (err) console.error(err);

	let jsFiles = files.filter(f => f.split(".").pop() === "js"); //get all .js files in cmd dir
	if (jsFiles.length <= 0) {
		console.log("No commands to load!");
		return;
	}

	console.log(`Loading ${jsFiles.length} commands...`);
	jsFiles.forEach((f, i) => {
		let props = require(`./cmds/${f}`);
		console.log(`${i+1}: ${f} loaded`);
		bot.commands.set(props.help.name, props);
	});

})


bot.on("ready", async () => {
	console.log(`${bot.user.username} bot is ready!`);
});


//MySQL database connection
var con = mysql.createConnection({
	host: mysql_config["host"], 
	user: mysql_config["user"],
	password: mysql_config["password"],
	database: mysql_config["database"],
	port: mysql_config["port"]
});

//Connect to MySQL
con.connect(err => {
	if(err) throw err;
	console.log("Connected to database!");
})


//Monthly work flow to be triggered on 1st of each month
var rule = new schedule.RecurrenceRule();
rule.month = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
rule.date = 1;
rule.hour = 0;
rule.minute = 0;

var j = schedule.scheduleJob(rule, function() {
	scheduled_updatedb.run(bot, con, botSettings.mcm_guild_id, log_file);
});


//Async function for incoming messages
bot.on("message", async message => {
	console.log(`Message received ${message.content}`);
	if (message.author.bot) return; //if the user is a bot do nothing

	if (message.channel.type === "dm") return; //if message was done in a dm do nothing

	let messageArray = message.content.split(" "); //message into list
	let command = messageArray[0]; //get command 
	let args = messageArray.slice(1); //remove command from argument list

	if (!command.startsWith(prefix)) return; //if message is not a bot command, ignore

	/*
	//If command is not in list
	let available_commands = ["!mcmtip", "!updatedb", "!resetdb"]
	//Since there is also the mochibot, there are other commands other than the ones above...
	if (!available_commands.includes(command)) {
		message.reply("you've given an invalid command. Please type !mcmtip help for usage details.")
		.then(msg => {
			msg.delete(5000)
		})
		.catch();
		return;
	}
	*/

	let cmd = bot.commands.get(command.slice(prefix.length)); //remove prefix to get command string
	if(cmd) cmd.run(bot, message, args, con, botSettings.mcm_guild_id, log_file); //run command by <command>.js file
})




bot.login(botSettings.token);