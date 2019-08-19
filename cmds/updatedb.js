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

	if (!target_roles.includes("Satochi")) {
		console.log(`Attempt made by ${target.username} to reset d_users!`)
		return;
	}

	//Create a compressed data dump file of table d_users. Only when dump is complete, continue with update.
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

		con.query(`SELECT userid from d_users`, (err, rows) => {
			if(err) throw err;
			if(!rows[0]) throw "Error: no users found";

			//Get all user ids from d_users
			let d_users_ids = rows.map(u => u.userid);

			//Get all user ids from guild (channel)
			let guild_members_ids = guild.members.map(u => u.id);

			//Get set differences
			let ids_to_add = guild_members_ids.filter(x => !d_users_ids.includes(x));

			let ids_to_remove = d_users_ids.filter(x => !guild_members_ids.includes(x));

			//Iterate over all members in guild (channel).
			//For new members, add to d_users
			//For members that have left, remove from d_users
			//For rank members, reset available_mcm amounts
			let total_available_mcm = 0; //how much total mcm is being set for tips 
			guild.members.forEach(member => {

				//Find new discord users that were not yet added to d_users
				if (ids_to_add.includes(member.user.id)) {
					let insert_query = `INSERT INTO d_users (username, userid, rank, available_mcm, received_mcm) VALUES ('${member.user.username}', ${member.user.id}, NULL, 0, 0)`
					con.query(query, console.log);	
				}

				//Find discord users that have left the channel and remove from d_users
				else if (ids_to_remove.includes(member.user.id)) {
					let delete_query = `DELETE FROM d_users WHERE userid = ${member.user.id}`;
					con.query(query, console.log);	
				}


				//Reset available_mcm for all those with ranks
				let member_roles = member.roles.map(r => r.name);
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

				if (rank != "Member") {
					let query = `UPDATE d_users SET rank = '${rank}', available_mcm = ${available_mcm_amount} WHERE userid = ${member.user.id}`
					con.query(query, console.log);
				}

				total_available_mcm += available_mcm_amount;
			});

			console.log(`Total available_mcm given for tips: ${total_available_mcm}`);

			//Confirm list lengths are now identical
			con.query(`SELECT userid from d_users`, (err, updated_rows) => {
				if(err) throw err;
				if(!updated_rows[0]) throw "Error: no users found";

				if(updated_rows.length != guild_members_ids.length) {
					console.log("MISMATCH between channel users and d_users!");
				}
			});


			//Send update message to channel
			const monthNames = ["January", "February", "March", "April", "May", "June",
			  "July", "August", "September", "October", "November", "December"
			];
			let month = monthNames[new Date().getMonth()]
			guild.channels.find(c => c.name === `general`).send(`**Monthly MCM available tips have been reset for ${month}!**`);
		});		

		//Append update action to log file
		let log_msg = `\n${d_formatted}: !updatedb executed by ${target.username}. Dump filename: ${dump_filename}`
		fs.appendFileSync(log_file, `${log_msg}`);

	});
}

module.exports.help = {
	name: "updatedb"
}
