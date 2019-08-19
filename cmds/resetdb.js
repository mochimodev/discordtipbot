const Discord = require("discord.js");
const mysqldump = require("mysqldump");
const fs = require("fs");

const mysql_config = require("../mysql_config.json");

module.exports.run = async (bot, message, args, con, guild_id, log_file) => {

	//Get guild
	const guild = bot.guilds.get(guild_id);

	//Check if user has admin permissions to execute (only stackoverflo with rank "Satochi" should be able to run this)
	let target = message.author;

	let target_roles = guild.members.find(m => m.id = target.id).roles.map(r => r.name);
	console.log(`Target roles: ${target_roles}`);

	if (!target_roles.includes("Satochi")) {
		console.log(`Attempt made by ${target.username} to reset d_users!`)
		return;
	}

	if (args[0] != "YESIAMSURE") {
		message.reply(`are you SURE you want to reset the db?!`)
		.then(msg => {
			msg.delete(5000)
		})
		.catch();
		return;
	}

	//Create a compressed data dump file of table d_users. Only when dump is complete, continue with reset.
	let d = new Date();
	let d_formatted = `${d.getDate()}${d.getMonth()+1}${d.getFullYear()}_${d.getHours()}${d.getMinutes()}${d.getSeconds()}`
	var dump_filename = `mysql_dumps/${d_formatted}_dump.sql.gz`
	console.log(dump_filename)
	mysqldump({
	    connection: {
			host: mysql_config["host"], 
			user: mysql_config["user"],
			password: mysql_config["password"],
			database: mysql_config["database"].toLowerCase(),
			port: mysql_config["port"]
	    },
	    dumpToFile: dump_filename,
	    compressFile: true,
	}).then(() => {

		//Delete table if exists
		con.query("TRUNCATE TABLE d_users");

		//For each member in server, create database entry and provide MCM quantity to those with approved rank
		guild.members.forEach(member => {

			console.log(member.user.username)

			//Set available_mcm depending on role
			let member_roles = member.roles.map(r => r.name);
			console.log(member_roles);

			let available_mcm_amount = 0;
			let rank = "Member"; //default value for non-ranked users
			if (member_roles.includes("Almost Trigg")) {
				rank = "Almost Trigg";
				available_mcm_amount = 50;
			} 
			else if (member_roles.includes("Mochigod")) {
				rank = "Mochigod";
				available_mcm_amount = 25;
			}
			else if (member_roles.includes("Mochipro")) {
				rank = "Mochipro";
				available_mcm_amount = 10;
			}
			else if (member_roles.includes("Mochibro")) {
				rank = "Mochibro";
				available_mcm_amount = 5;
			}

			console.log(available_mcm_amount)
			let query = `INSERT INTO d_users (username, userid, rank, available_mcm, received_mcm) VALUES ('${member.user.username}', ${member.user.id}, '${rank}', ${available_mcm_amount}, 0)`
			con.query(query, console.log);
		});

		message.channel.send("Table d_users has been reset!")

		//Append reset action to log file
		let log_msg = `\n${d_formatted}: !resetdb executed by ${target.username}. Dump filename: ${dump_filename}`
		fs.appendFileSync(log_file, `${log_msg}`);
	});


}

module.exports.help = {
	name: "resetdb"
}
