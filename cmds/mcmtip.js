const Discord = require("discord.js");
const fs = require("fs");

module.exports.run = async (bot, message, args, con, guild_id, log_file) => {
	//Get guild
	const guild = bot.guilds.get(guild_id);

	//Target is the user who wrote the message (command)
	let target = message.author;

	//Get list of roles the target has
	let target_roles = guild.members.find(m => m.id === target.id).roles.map(r => r.name);

	// ########## Function 1 ##########  
	// !mcmtip 
	// with no arguments -> send back target tip details
	if (args.length == 0) {
		con.query(`SELECT * FROM d_users WHERE userid = '${target.id}'`, (err, rows) => {
			if(err) throw err;
			if(!rows[0]) return message.channel.send("Error: user not found");

			let available_mcm = rows[0].available_mcm;
			let received_mcm = rows[0].received_mcm;

			let return_message =  `Hi <@${target.id}>!\nYou have [${available_mcm} MCM] to tip to other users.\nYou have received a total of [${received_mcm} MCM] in tips.\nTo see the list of mcmtip commands, please type **!mcmtip help**.`;

			message.channel.send(return_message);
			return;
		});		
	}
	// ########## End of function 1 ##########  


	// ########## Function 2 ##########  
	// !mcmtip [@username] [amount]
	else if (args.length == 2) {

		//Case: no tagged user found in command
		if (!message.mentions.users.size) {
			message.reply("you need to tag a user in order to tip them: !mcmtip [@username] [amount]")
			.then(msg => {
				msg.delete(5000)
			})
			.catch();
			return;
		}

		//Case: AMOUNT is not a number
		if (isNaN(args[1])) {
			message.reply("you must provide the amount of MCM you want to tip as an integer: !mcmtip [@username] [amount]")
			.then(msg => {
				msg.delete(5000)
			})
			.catch();
			return;
		}

		//Case: AMOUNT is not an integer
   		let n = Math.floor(Number(args[1]));
    	if (!(n !== Infinity && String(n) === args[1] && n > 0)) {
			message.reply("you can only tip in whole MCM increments.")
			.then(msg => {
				msg.delete(5000)
			})
			.catch();
			return;
		}


		let tip_receiver = message.mentions.users.first(); 

		//Case: tagged username (ID) is same as the target username (ID)
		if (tip_receiver.id === target.id) {
			message.reply("even though you're probably pretty awesome, you still can't tip YOURSELF.")
			.then(msg => {
				msg.delete(5000)
			})
			.catch();
			return;
		}

		//First check that target user exists in d_users
		con.query(`SELECT * FROM d_users WHERE userid = '${tip_receiver.id}'`, (err, rows) => {
			if(err) throw err;

			//If user was not found in d_users, scrape guild (channel) members to see if he's been added
			if(!rows[0]) {
				//Get server ID
				// let guild_id = message.guild.id;

				//Get server member list
				const guild_member_list = bot.guilds.get(guild_id);

				//If user exists in member list, update d_users with that user
				let user_found = guild_member_list.members.find('id', tip_receiver.id);
				if (user_found) {
					let query = `INSERT INTO d_users (username, userid, rank, available_mcm, received_mcm) VALUES ('${tip_receiver.username}', ${tip_receiver.id}, NULL, 0, 0)`
					con.query(query);	
				} else {
					//Not sure if even possible to tag a user who is not in channel.
					//This would be handled in the case "no tagged user found in channel".
					message.reply("I can't seem to find that user on the Mochimo server, sorry!") 
					.then(msg => {
						msg.delete(5000)
					})
					.catch();
					return;		
				}		
			}
		});

		//Get tip amount
		let mcm_amount = args[1];

		//Get record for target user
		con.query(`SELECT * FROM d_users WHERE userid = '${target.id}'`, (err, rows) => {

			//Get target's tip amount available in d_users
			let available_mcm = rows[0].available_mcm;

		 	//Case: the amount is greater than the the user's available-mcm
			if (available_mcm < mcm_amount) {
				message.reply("please check your balance with: !mcmtip, and try again.");
				return;
			}

			//Case: tip command is successful and tip amount is available
			let remaining_mcm = available_mcm - mcm_amount;

			//Update target available_mcm (bounty giver)
			con.query(`UPDATE d_users SET available_mcm = ${remaining_mcm} WHERE userid = ${target.id}`, (err, rows) => {
				if(err) throw err;

				//Update bounty receiver
				con.query(`UPDATE d_users SET received_mcm = received_mcm + ${mcm_amount} WHERE userid = ${tip_receiver.id}`, (err, rows) => {
					if(err) throw err;

					message.channel.send(`Congratulations, <@${tip_receiver.id}>, you've been given a **${mcm_amount} MCM** tip by <@${target.id}>!`)

					//Append successful tip to log file
					let d = new Date();
					let d_formatted = `${d.getDate()}${d.getMonth()+1}${d.getFullYear()}_${d.getHours()}${d.getMinutes()}${d.getSeconds()}`
					let log_msg = `\n${d_formatted}: Tip of ${mcm_amount}MCM given FROM ${target.username} TO ${tip_receiver.username}`
					fs.appendFileSync(log_file, `${log_msg}`);
					return;
				})
			})
		});
	}
	// ########## End of function 2 ##########  


	else if (args.length == 1) {

		// ########## Function 3 ##########  
		// !mcmtip claim
		if (args[0] === "claim") {

			con.query(`SELECT * FROM d_users WHERE userid = '${target.id}'`, (err, rows) => {
				if(err) throw err;
				if(!rows[0]) return message.channel.send("Error: user not found");

				let received_mcm = rows[0].received_mcm;

				//Case: user has not received any tips
				if (received_mcm === 0) {
					message.reply("sorry, you don't have a balance to claim.")
					.then(msg => {
						msg.delete(5000);
					})
					.catch();
					return;
				}

				//Case: user has received tips
				const open_bounties_channel = bot.channels.find('name', "open-bounties") //get #open-bounties channel
				open_bounties_channel.send(`RECORD: <@${target.id}>, Claiming Tip Bounties, ${received_mcm} MCM`);
				message.reply(`A bounty has been issued for you in the amount of ${received_mcm} in the #open-bounties channel.`)
				.then(msg => {
					msg.delete(5000);
				})
				.catch();

				//Set user's received-mcm to 0
				con.query(`UPDATE d_users SET received_mcm = 0 WHERE userid = ${target.id}`, (err, rows) => {
					if(err) throw err;
				})				


			})
		}
		// ########## End of function 3 ##########  

	

		// ########## Function 4 ##########  
		// !mcmtip help
		else if (args[0] === "help") {
			let help_message = "To use the tip bot:\nCheck your balances with: **!mcmtip**\nClaim your tips with: **!mcmtip claim**\nSend a tip with: **!mcmtip [@username] [amount]**";

			if(target_roles.includes("Core Contributor")) {
				help_message = `${help_message}\nAs a **Core Contributor**, make it rain with: **!mcmtip makeitrain** (all Mochibro or higher rank members will receive 1MCM!)`
			}
			help_message = `${help_message}\n~MCMTip Bot v1.0 by **@dcryptt**`
			message.channel.send(`${help_message}`);
			return;
		}
		// ########## End of function 4 ##########  


		// ########## Function 5 ##########  		
		else if (args[0] == "makeitrain") {

			//In case someone without a Core Contributor rank executes the makeitrain command
			if (!target_roles.includes("Core Contributor")) {
				console.log(`Attempt made by ${target.username} to makeitrain!`)
				message.reply(`unfortunately, only Core Contributors can make it rain!`)
				.then(msg => {
					msg.delete(5000);
				})
				.catch();				
				return;
			}

			//If a Core Contributor executes makeitrain
			let rain_receiving_ranks = ["Almost Trigg", "Core Contributor", "Mochigod", "Moderator", "Mochipro", "Mochibro"]

			//Increment +1MCM received_mcm for all those with rain_receiving_Ranks
			let raincount = 0;
			guild.members.forEach(member => {

				let member_roles = member.roles.map(r => r.name);

				let rank_intersection = member_roles.filter(x => rain_receiving_ranks.includes(x));

				if (rank_intersection.length > 0) {
					let query = `UPDATE d_users SET received_mcm = received_mcm + 1 WHERE userid = ${member.user.id}`
					con.query(query, console.log);
					raincount += 1;
				}
			});


			message.channel.send(`<@${target.id}> has just made it rain 1MCM to ${raincount} ranked members!`)

			//Append successful makeitrain to log file
			let d = new Date();
			let d_formatted = `${d.getDate()}${d.getMonth()+1}${d.getFullYear()}_${d.getHours()}${d.getMinutes()}${d.getSeconds()}`
			let log_msg = `\n${d_formatted}: makeitrain command by ${target.username} was executed for a total of ${raincount} members!`
			fs.appendFileSync(log_file, `${log_msg}`);
			return;


		}
		// ########## End of function 5 ##########  

		//Case: any other type of invalid arguments for the 1 argument provided
		else {
			message.reply("you've given an invalid command. Please type **!mcmtip** help for usage details.")
			.then(msg => {
				msg.delete(5000)
			})
			.catch();
			return;
		} 

	}

	//Case: for any other numbers of invalid arguments
	else {
		message.reply("you've given an invalid command. Please type **!mcmtip** help for usage details.")
		.then(msg => {
			msg.delete(5000)
		})
		.catch();
		return;
	} 
}


module.exports.help = {
	name: "mcmtip"
}
