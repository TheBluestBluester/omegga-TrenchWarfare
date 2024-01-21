const fs = require('fs');
const { brs } = OMEGGA_UTIL;
const raycast = require('./Raycast');
const weplist = require('./Weaponslist');

let brsfile = fs.readFileSync(__dirname + "/trench.brs");
const brsbrick = brs.read(brsfile);
brsfile = fs.readFileSync(__dirname + "/redf.brs");
const redbrs = brs.read(brsfile);
brsfile = fs.readFileSync(__dirname + "/bluf.brs");
const blubrs = brs.read(brsfile);
brsfile = fs.readFileSync(__dirname + "/Marker.brs");
const markerbrs = brs.read(brsfile);
brsfile = fs.readFileSync(__dirname + "/Gravestone.brs");
const gravestoneBRS = brs.read(brsfile);

const tminig = fs.readFileSync(__dirname + "/Minig and Env/TrenchMinigame.bp", 'utf8');
const tenv = fs.readFileSync(__dirname + "/Minig and Env/Trench wars env preset.bp", 'utf8');

let activeGrenades = [];
let checkForGrenades = true;

let trenchcolor = 44;
let lowest = 0;
let tl = [];

let blockinv = [];
let classlist = [];
let playerc = 0;
let timeout = [];
let voted = [];
let votetime = 0;
let mapid = 0;
let tick = 0;
let weapons;
let deadPlayers = {};
let revivePos = {};

let mapchoice = [];

let redspawnlist = [];
let bluspawnlist = [];

let mode = "";

let redpoints = 0;
let blupoints = 0;

let lineBuild = {};

// CTF
let gracetime = 60;

let prefallrpos = [];
let prefallbpos = [];
let oldrpos = [];
let oldbpos = [];
let redflagpos = [];
let bluflagpos = [];
let redupd = false;
let bluupd = false;

let reddef = [];
let bludef = [];

let redcarrier = '';
let blucarrier = '';

let redtimout = 0;
let blutimout = 0;
// CTF
// ZC
let zones = [];
let middleZone = 2;
// ZC
let votes = [];
let maps = [];
let roundended = true;

let flaginterval;

let clr = {
	red: '<color="f33">',
	blu: '<color="33f">',
	ylw: '<color="ff0">',
	rst: '<color="679">',
	dgrn: '<color="495">',
	imp: '<size="30">'
}

let modeColor = {
	
	CTF: clr.red + 'CTF',
	ZC: clr.blu + 'ZC'
	
}

class TrenchWarfare {
	
	
	
	constructor(omegga, config, store) {
		this.omegga = omegga;
		this.config = config;
		this.store = store
	}
	
	async Raycast(bpos, bsize, ppos, prot, steps, pheight) {
		const B1 = [bpos[0] - bsize[0],bpos[1] - bsize[1],bpos[2] - bsize[2]];
		const B2 = [bpos[0] + bsize[0],bpos[1] + bsize[1],bpos[2] + bsize[2]];
		const L1 = [ppos[0],ppos[1],ppos[2] + pheight]
		const yaw = prot[1];
		const pitch = prot[0];
		const deg2rad = Math.PI / 180;
		const dir = [
			Math.sin((-yaw + 90) * deg2rad) * steps * Math.cos(pitch * deg2rad),
			Math.cos((-yaw + 90) * deg2rad) * steps * Math.cos(pitch * deg2rad),
			Math.sin(pitch * deg2rad) * steps
		];
		const L2 = [L1[0] + dir[0],L1[1] + dir[1],L1[2] + dir[2]];
		let hit = await raycast.raybox(bpos, bsize[0], L1, L2);
		return hit;
	}
	
	async Subdivide(clp, bpos, bsize, cycleAmount){
		// This was alot easier to make than i expected.
		let finish = false;
		let cycles = 0;
		let briklist = [{p: bpos, s: bsize}];
		while(!finish && cycles < cycleAmount) {
			for(var i in briklist) {
				const brik = briklist[i];
				const B1 = [brik.p[0] - brik.s[0],brik.p[1] - brik.s[1],brik.p[2] - brik.s[2]];
				const B2 = [brik.p[0] + brik.s[0],brik.p[1] + brik.s[1],brik.p[2] + brik.s[2]];
				if(clp[0] >= B1[0] && clp[1] >= B1[1] && clp[2] >= B1[2] && clp[0] <= B2[0] && clp[1] <= B2[1] && clp[2] <= B2[2]) {
					const bp = brik.p;
					const bs = [brik.s[0] * 0.5, brik.s[1] * 0.5, brik.s[2] * 0.5];
					briklist.splice(i, 1);
					if(bs[0] <= 5) {
						finish = true;
						break;
					}
					// There are 100% better ways to do this but this will do.
					briklist.push({p: [bp[0] - bs[0], bp[1] - bs[1], bp[2] - bs[2]], s: bs});
					briklist.push({p: [bp[0] + bs[0], bp[1] - bs[1], bp[2] - bs[2]], s: bs});
					briklist.push({p: [bp[0] - bs[0], bp[1] + bs[1], bp[2] - bs[2]], s: bs});
					briklist.push({p: [bp[0] + bs[0], bp[1] + bs[1], bp[2] - bs[2]], s: bs});
					briklist.push({p: [bp[0] - bs[0], bp[1] - bs[1], bp[2] + bs[2]], s: bs});
					briklist.push({p: [bp[0] + bs[0], bp[1] - bs[1], bp[2] + bs[2]], s: bs});
					briklist.push({p: [bp[0] - bs[0], bp[1] + bs[1], bp[2] + bs[2]], s: bs});
					briklist.push({p: [bp[0] + bs[0], bp[1] + bs[1], bp[2] + bs[2]], s: bs});
					break;
				}
			}
			cycles++;
		}
		return briklist;
	}
	
	async interfunc(data) {
		try {
			if(roundended) {
				return;
			}
			if(data == null || !Object.keys(data).includes('player')) {
				return;
			}
			const player = await this.omegga.getPlayer(data.player.id);
			if(player == null) {
				return;
			}
			const team = await this.getTeam(1, player);
			if(team == null) {
				return;
			}
			const tclr = clr[team.name.substr(0,3).toLowerCase()];
			switch(data.message) {
				case 'red':
					if(team.name == 'BlueTeam' || redflagpos != reddef) {
						redcarrier = player.name;
						await this.omegga.clearBricks('00000000-0000-0000-0000-000000000333', {quiet: true});
						redtimout = 0;
						this.omegga.broadcast('<b>' + tclr + player.name + '</> has taken the ' + clr.red + 'red flag!</>');
					}
					break;
				case 'blu':
					if(team.name == 'RedTeam' || bluflagpos != bludef) {
						blucarrier = player.name;
						await this.omegga.clearBricks('00000000-0000-0000-0000-000000000111', {quiet: true});
						blutimout = 0;
						this.omegga.broadcast('<b>' + tclr + player.name + '</> has taken the ' + clr.blu + 'blue flag!</>');
					}
					break;
				case 'redflag':
					if(player.name == blucarrier) {
						bluflagpos = bludef;
						redpoints++;
						blucarrier = '';
						bluupd = true;
						const score = await player.getScore(1);
						player.setScore(1,score + 1);
						this.omegga.broadcast('<b>' + clr.red + player.name + '</> has captured the ' + clr.blu + 'blue flag!</> (' + clr.red + redpoints + '</> - ' + clr.blu + blupoints + '</>)');
						if(redpoints >= 3) {
							this.announceEnd();
						}
					}
					if(player.name == redcarrier && team.name == 'RedTeam') {
						redflagpos = reddef;
						redcarrier = '';
						redupd = true;
						this.omegga.broadcast('<b>' + clr.red + player.name + '</> has returned the ' + clr.red + 'red flag!</>');
					}
					break;
				case 'blueflag':
					if(player.name == redcarrier) {
						redflagpos = reddef;
						blupoints++;
						redcarrier = '';
						redupd = true;
						const score = await player.getScore(1);
						player.setScore(1,score + 1);
						this.omegga.broadcast('<b>' + clr.blu + player.name + '</> has captured the ' + clr.red + 'red flag!</> (' + clr.red + redpoints + '</> - ' + clr.blu + blupoints + '</>)');
						if(blupoints >= 3) {
							this.announceEnd();
						}
					}
					if(player.name == blucarrier && team.name == 'BlueTeam') {
						bluflagpos = bludef;
						blucarrier = '';
						bluupd = true;
						this.omegga.broadcast('<b>' + clr.blu + player.name + '</> has returned the ' + clr.blu + 'blue flag!</>');
					}
					break;
			}
			
			if(!data.message.includes('trench')) {
				return;
			}
			if(timeout.includes(player.id)) {
				return;
			}
			timeout.push(player.id);
			setTimeout(() => timeout.splice(timeout.indexOf(player.id),1), 200);
			let inv = blockinv.filter(inv => inv.player == data.player.id);
			if(inv.length == 0) {
				blockinv.push({player: player.id, count: 64});
				inv = {player: player.id, count: 64};
			}
			else {
				inv = inv[0];
			}
			const index = blockinv.findIndex(function(v) { return v.player == inv.player });
			const [ppos,crouch,playerRot] = await Promise.all([player.getPosition(), this.isCrouching(player), this.GetRotation(player.controller)]);
			const size = data.brick_size;
			const pos = data.position;
			const blocksize = 10;
			const clas = classlist.filter(cl => cl.player == player.name)[0];
			const builder = (clas.class == 'trenchie');
			if(playerRot == null) {
				return;
			}
			if(crouch) {
				const hit = await this.Raycast(pos,size,ppos,playerRot,300,10);
				if(hit == false) {
					return;
				}
				if(inv.count < 0) {
					blockinv[index].count = 0;
				}
				if(inv.count <= 0) {
					return;
				}
				const n = hit.n;
				let posh = hit.h;
				if(size[0] <= 10) {
					posh = [pos[0] + n[0] * 20, pos[1] + n[1] * 20, pos[2] + n[2] * 20];
				}
				else {
					let offset = [];
					let offset2 = [];
					if(n[0] != 0) {
						offset = [0,0,20];
						offset2 = [0,10,-10];
					}
					if(n[1] != 0) {
						offset = [0,0,20];
						offset2 = [10,0,-10];
					}
					if(n[2] != 0) {
						offset = [0,0,0];
						offset2 = [10,10,0];
					}
					const rel = [posh[0] - pos[0],posh[1] - pos[1],posh[2] - pos[2]];
					posh = [Math.floor((rel[0] + offset[0]) * 0.05) * 20 + pos[0] + offset2[0], Math.floor((rel[1] + offset[1]) * 0.05) * 20 + pos[1] + offset2[1], Math.floor((rel[2] + offset[2]) * 0.05) * 20 + pos[2] + offset2[2]];
					posh = [posh[0] + n[0] * 10, posh[1] + n[1] * 10, posh[2] + n[2] * 10];
				}
				
				let brick = this.copyBrick(brsbrick.bricks[0]);
				brick.size = [blocksize,blocksize,blocksize];
				brick.material_index = 0;
				brick.color = team.color;
				brick.components.BCD_Interact.ConsoleTag = 'trench ' + team.name;
				
				if(data.player.name in lineBuild) {
					
					let startPos = lineBuild[player.name];
					if(startPos.length === 0) {
						lineBuild[player.name] = posh;
						this.omegga.middlePrint(player.name, '<b>Line start set.</>');
						return;
					}
					const relative = [
						posh[0] - startPos[0],
						posh[1] - startPos[1],
						posh[2] - startPos[2]
					];
					
					let brickList = [];
					let dir = 0;
					if(Math.abs(relative[1]) > Math.abs(relative[0])) {
						dir = 1;
					}
					if(relative[2] < 0) {
						startPos[2] += relative[2]
						relative[2] *= -1;
					}
					
					let mult = 1;
					if(builder) {
						mult = 0.5;
					}
					
					let nextBlockPos = this.copyArray(startPos);
					if(relative[0] === 0 || relative[1] === 0) {
						
						for(let i=0;i<Math.abs(relative[dir]) * 0.05 + 1;i++) {
							
							for(let i2=0;i2<relative[2] * 0.05 + 1;i2++) {
								brick.position = this.copyArray(nextBlockPos);
								brick.position[2] += 20 * i2;
								const colliding = await this.checkColliding(brick.position, [10,10,10]);
								if(colliding) {
									continue;
								}
								if(brickList.length * mult >= inv.count) {
									break;
								}
								
								brickList.push(this.copyBrick(brick));
								tl.push({p: brick.position, s: brick.size, c: team.color});
							}
							
							nextBlockPos[dir] += 20 * Math.sign(relative[dir]);
							
						}
						
					}
					else {
						
						let cycles = 0;
						while(cycles < 100) {
							
							cycles++;
							
							for(let i2=0;i2<relative[2] * 0.05 + 1;i2++) {
								brick.position = this.copyArray(nextBlockPos);
								brick.position[2] += 20 * i2;
								//console.log(brick.position);
								const colliding = await this.checkColliding(brick.position, [10,10,10]);
								if(colliding) {
									continue;
								}
								if(brickList.length * mult >= inv.count) {
									break;
								}
								
								brickList.push(this.copyBrick(brick));
								tl.push({p: brick.position, s: brick.size, c: team.color});
							}
							
							nextBlockPos[dir] += 20 * Math.sign(relative[dir]);
							const progress = (nextBlockPos[dir] - startPos[dir]) / relative[dir];
							
							if(progress > 1) {
								break;
							}
							
							if(relative[1-dir] * progress - (nextBlockPos[1-dir] - startPos[1-dir]) < -10) {
								nextBlockPos[1-dir] -= 20;
							}
							else if(relative[1-dir] * progress - (nextBlockPos[1-dir] - startPos[1-dir]) > 10) {
								nextBlockPos[1-dir] += 20;
							}
							
						}
						
					}
					
					if(brickList.length === 0) {
						this.omegga.middlePrint(player.name, '<b>Failed to place.</>');
						return;
					}
					
					const toload = {...brsbrick, bricks: brickList};
					this.omegga.loadSaveData(toload, {quiet: true});
					
					inv.count -= brickList.length * mult;
					blockinv[index] = inv;
					this.omegga.middlePrint(player.name, '<b>Trench: ' + inv.count + ' (-' + (brickList.length * mult) + ')</>');
					lineBuild[player.name] = [];
					return
					
				}
				
				brick.position = posh;
				const toload = {...brsbrick, bricks: [brick]};
				if(
					Math.abs(posh[0] - ppos[0]) < 20 &&
					Math.abs(posh[1] - ppos[1]) < 20 &&
					Math.abs(posh[2] - ppos[2]) < 20 ) {
					this.omegga.middlePrint(player.name, '<b>You\'re blocking yourself!</>');
					return;
				}
				const colliding = await this.checkColliding(posh, [10,10,10]);
				if(colliding) {
					this.omegga.middlePrint(player.name, '<b>Failed to place.</>');
					return;
				}
				this.omegga.loadSaveData(toload, {quiet: true});
				if(builder) {
					inv.count -= 0.5;
				}
				else {
					inv.count--;
				}
				tl.push({p: brick.position, s: brick.size, c: team.color});
				blockinv[index] = inv;
				this.omegga.middlePrint(player.name, '<b>Trench: ' + inv.count + '</>');
				return;
			}
			if(gracetime > 0 && !data.message.includes(team.name)) {
				this.omegga.middlePrint(player.name, '<b>You can\'t dig during the grace period!');
				return;
			}
			if(data.message.includes('undiggable')) {
				this.omegga.middlePrint(player.name, 'You can only place trench here.');
				return;
			}
			if(size[0] <= 10) {
				await this.omegga.clearRegion({center: pos, extent: size});
				inv.count++;
				blockinv[index] = inv;
				this.omegga.middlePrint(player.name, '<b>Trench: ' + inv.count + '</>');
				tl.splice(tl.findIndex(b => b.p.join(' ') === pos.join(' ')), 1);
				return;
			}
			let hit = await this.Raycast(pos,size,ppos,playerRot,300,16);
			if(hit === false) {
				return;
			}
			hit = hit.h;
			const tlind = tl.findIndex(b => b.p.join('') == pos.join(''));
			
			const cubelist = await this.Subdivide(hit, pos, size, 10);
			const defaultb = brsbrick.bricks[0];
			let brlist = [];
			for(var i in cubelist) {
				const br = cubelist[i];
				let brick = this.copyBrick(defaultb);
				brick.size = br.s;
				brick.position = br.p;
				brick.material_index = 0;
				brick.color = tl[tlind].c;
				brick.components.BCD_Interact.ConsoleTag = 'trench ' + team.name;
				brlist.push(brick);
				tl.push({p: br.p, s: br.s, c: tl[tlind].c});
			}
			tl.splice(tlind, 1);
			this.omegga.clearRegion({center: pos, extent: size});
			inv.count++;
			blockinv[index] = inv;
			this.omegga.middlePrint(player.name, '<b>Trench: ' + inv.count + '</>');
			if(brlist.length > 0) {
				const toload = {...brsbrick, bricks: brlist};
				this.omegga.loadSaveData(toload, {quiet: true});
			}
		}
		catch(e) {
			console.log(e);
		}
	}
	
	copyBrick = (brick) => {
		
		let newBrick = {};
		
		const entries = Object.entries(brick);
		for(let [k, v] of entries) {
			
			let newValue = v;
			
			if(Array.isArray(newValue)) {
				
				let newArray = [];
				for(let i in newValue) {
					
					newArray.push(newValue[i]);
					
				}
				newValue = newArray;
				
			}
			
			newBrick[k] = newValue;
			
		}
		
		return newBrick;
		
	}
	copyArray = (array) => {
		
		let newArray = [];
		for(let i in array) {
			
			newArray.push(array[i]);
			
		}
		
		return newArray;
		
	}
	
	async isCrouching(player) {
		// Turns out omegga's isCrouched() doesn't actually check if the log matches the player's pawn. Which causes the plugin to think that the player is not crouching.
		try{
		const pawn = await this.omegga.getPlayer(player.id).getPawn();
		const reg = new RegExp(`.+?BP_FigureV2_C .+?PersistentLevel\.${pawn}\.bIsCrouched = (?<crouched>True|False)$`);
		const [
		{
			groups: { crouched },
		},
		] = await this.omegga.addWatcher(reg, {
			exec: () =>
			this.omegga.writeln(
				`GetAll BP_FigureV2_C bIsCrouched Name=${pawn}`
			),
			timeoutDelay: 100
		});
		return crouched == 'True';
		}catch(e){console.log(e)}
	}
	
	async getTeam(minig, player) {
		try {
		const minigames = await this.omegga.getMinigames();
		const minigame = minigames[minig];
		if(minigame == null) {
			return;
		}
		const teams = minigame.teams;
		let team = [];
		if((typeof player) == 'string') {
			const pl = await this.omegga.getPlayer(player);
			team = teams.filter(t => t.members.includes(pl));
		}
		else {
			team = teams.filter(t => t.members.includes(player));
		}
		return team[0];
		}catch(e){console.log(e)}
	}
	
	async checkColliding(pos, scale) {
		const colliding = tl.filter(b => Math.abs(pos[0] - b.p[0]) < scale[0] + b.s[0] &&
			Math.abs(pos[1] - b.p[1]) < scale[1] + b.s[1] &&
			Math.abs(pos[2] - b.p[2]) < scale[2] + b.s[2]
		);
		if(colliding.length > 0) {
			return true;
		}
		else {
			return false;
		}
	}
	
	// For some reason controller rotates with player's camera so i am using it to get player's camera rotation.
	async GetRotation(controller) {
		try{
		const rotRegExp = new RegExp(`${controller}\\.TransformComponent0.RelativeRotation = \\(Pitch=(?<x>[\\d\\.-]+),Yaw=(?<y>[\\d\\.-]+),Roll=(?<z>[\\d\\.-]+)\\)`);
		const [
		{
			groups: { x, y, z },
		},
		] = await this.omegga.addWatcher(rotRegExp, {
			exec: () =>
			this.omegga.writeln(
				`GetAll SceneComponent RelativeRotation Outer=${controller}`
			),
			timeoutDelay: 100
		});
		return [Number(x),Number(y),Number(z)];
		}catch(e){console.log(e)}
	}
	
	async initmaps() {
		const mapfolder = fs.readdirSync(__dirname + "/Map");
		const filteredfolder = mapfolder.filter(map => map.split('.')[1] == 'brs');
		if(filteredfolder.length > 0 && filteredfolder) {
			maps = filteredfolder;
			mapid = maps[0];
		}
		else {
			console.log('Warning! There is no maps in the Map folder.');
		}
	}
	
	async teleportPlayers() {
		const players = this.omegga.players;
		for(var p in players) {
			const player = players[p];
			const team = await this.getTeam(1, player);
			if(team == null) {
				continue;
			}
			let tppos = [];
			if(team.name === "RedTeam") {
				const rand = Math.floor(Math.random() * redspawnlist.length);
				tppos = redspawnlist[rand];
			}
			else {
				const rand = Math.floor(Math.random() * bluspawnlist.length);
				tppos = bluspawnlist[rand];
			}
			tppos[2] += 20;
			this.omegga.writeln("Chat.Command /TP \"" + player.name + "\" " + tppos.join(" ") + " 0");
			const f = classlist.filter(cl => cl.player == player.name);
			if(f.length === 0) {
				return;
			}
			const clas = f[0];
			this.setupClass(player, clas);
		}
	}
	
	async generalTick() {
		try{
		for(var c in classlist) {
			const pclass = classlist[c];
			if(pclass == null) {
				continue;
			}
			const player = await this.omegga.getPlayer(pclass.player);
			if(player == null) {
				continue;
			}
			if(pclass.class == 'machinegunner') {
				if(await this.isCrouching(player)) {
					player.heal(5);
				}
			}
			if(pclass.class == 'medic') {
				if(await this.isCrouching(player)) {
					
					const ownPos = await player.getPosition();
					const ownTeam = await this.getTeam(1, player);
					
					let isReviving = false;
					
					let deadPlayerList = Object.entries(deadPlayers);
					for(let dp in deadPlayerList) {
						
						const deadPlayer = deadPlayerList[dp];
						if(deadPlayer[1].heal >= 5) {
							continue;
						}
						
						const deadPos = deadPlayer[1].pos;
						const relative = [deadPos[0] - ownPos[0], deadPos[1] - ownPos[1], deadPos[2] - ownPos[2]];
						const distance = Math.sqrt(relative[0] ** 2 + relative[1] ** 2 + relative[2] ** 2);
						if(distance > 100) {
							continue;
						}
						
						if(ownTeam.name != deadPlayer[1].team) {
							continue;
						}
						//console.log(deadPlayer, ownPos, ownTeam);
						isReviving = true;
						deadPlayers[deadPlayer[0]].heal += 0.5;
						this.omegga.middlePrint(player.name, clr.dgrn + ('||').repeat(Math.min(deadPlayer[1].heal * 2, 10)) + '</>' + ('||').repeat(10 - Math.min(deadPlayer[1].heal * 2, 10)));
						if(deadPlayer[1].heal == 5) {
							revivePos[deadPlayer[0]] = deadPlayer[1].pos;
							this.omegga.whisper(deadPlayer[0], clr.dgrn + '<b>You have been revived! You will respawn in the position that you have died.</>');
						}
						
						break;
						
					}
					if(isReviving) {
						continue;
					}
					
					const minigames = await this.omegga.getMinigames();
					const minigame = minigames[1];
					if(minigame == null) {
						continue;
					}
					const teamPlayers = minigame.teams.find(t => t.name == ownTeam.name);
					//console.log(teamPlayers);
					for(let p in teamPlayers.members) {
						
						const tPlayer = teamPlayers.members[p];
						if(tPlayer.name == player.name) {
							continue;
						}
						
						const pos = await tPlayer.getPosition();
						const relative = [pos[0] - ownPos[0], pos[1] - ownPos[1], pos[2] - ownPos[2]];
						const distance = Math.sqrt(relative[0] ** 2 + relative[1] ** 2 + relative[2] ** 2);
						if(distance > 50) {
							continue;
						}
						
						tPlayer.heal(5);
						
					}
					
				}
			}
		}
		
		if(roundended) {
			return;
		}
		for(var c in classlist) {
			const clas = classlist[c];
			if(clas.timeout > 0) {
				classlist[c].timeout-=0.5;
			}	
		}
		if(votetime > 0) {
			votetime--;
		}
		if(votetime <= 30 && votetime > 10) {
			voted = [];
		}
		if(votetime === 30) {
			this.omegga.broadcast('<b>Not enough people have voted to switch maps!</>');
		}
		
		switch(mode) {
			
			case 'CTF':
				await this.ctftick();
				break;
			case 'ZC':
				await this.zctick();
				break;
			
		}
		
		// Grenade stuff
		if(!checkForGrenades) {
			return;
		}
		let grenades = await this.getGrenades();
		let exploded = activeGrenades.filter(g => !grenades.includes(g.id));
		if(exploded.length > 0) {
			//console.log(exploded);
			for(let e in exploded) {
				this.explosionSubdivide(exploded[e].pos,60);
			}
		}
		let newList = [];
		if(grenades.length == 0) {
			activeGrenades = [];
			return;
		}
		//console.log(grenades.length);
		for(let g in grenades) {
			const grenade = grenades[g];
			let pos = await this.getGrenadePos(grenade);
			if(!pos) {
				pos = activeGrenades.find(g => g.id == grenade);
				if(pos == null) {
					continue;
				}
				pos = pos.pos;
			}
			newList.push({id: grenade, pos: pos});
		}
		activeGrenades = newList;
		}catch(e){console.log(e);}
	}
	
	async recalculatePoints() {
		redpoints = zones.filter(z => z.capturedBy == 'RedTeam').length;
		blupoints = zones.filter(z => z.capturedBy == 'BlueTeam').length;
		//console.log(redpoints);
		//console.log(blupoints);
		if(redpoints == zones.length || blupoints == zones.length) {
			this.announceEnd();
		}
	}
	
	async zctick() {
		
		function changeZoneBias(index, direction) {
			
			let zone = zones[index];
			let prevValue = zone.bias;
			zone.bias = Math.min(20, Math.max(zone.bias + direction, -20));
			if(zone.capturedBy == 'None') {
				
				switch(zone.bias) {
					
					case 20:
						zone.capturedBy = 'BlueTeam';
						return {b: 20, c: 'blu'};
					case -20:
						zone.capturedBy = 'RedTeam';
						return {b: -20, c: 'red'};
					default:
						return {b: zone.bias, c: ''}
					
				}
				
			}
			else {
				
				if(Math.sign(prevValue) != Math.sign(zone.bias)) {
					zone.capturedBy = 'None';
					return {b: zone.bias, c: 'uncap'}
				}
				
				return {b: zone.bias, c: ''}
				
			}
			
		}
		
		try{
		tick++;
		
		if(tick % 4 != 0) {
			return;
		}
		
		let playerPosList = [];
		for(let p in this.omegga.players) {
			const player = this.omegga.players[p];
			if(player.name in deadPlayers) {
				continue;
			}
			playerPosList.push({player: player, pos: await player.getPosition()});
		}
		//console.log(playerPosList);
		const middle = (redpoints + zones.length - 1 - blupoints) / 2;
		//console.log(middle);
		let activeZones = [middle];
		if(middle % 1 != 0) {
			activeZones = [middle - 0.5, middle + 0.5];
		}
		//console.log(middle);
		//console.log(activeZones);
		for(let z in zones) {
			
			const zone = zones[z];
			const active = activeZones.includes(Number(z));
			//console.log(typeof activeZones[0], typeof z);
			let captureTeam = "";
			let captureRate = 0;
			let playersInZone = [];
			for(let p in playerPosList) {
				
				const player = playerPosList[p];
				if(player.player == null) {
					continue;
				}
				
				if(!(Math.abs(zone.pos[0] - player.pos[0]) < zone.size[0] && Math.abs(zone.pos[1] - player.pos[1]) < zone.size[1])) {
					continue;
				}
				//console.log(zone);
				const team = await this.getTeam(1, player.player);
				//console.log(team);
				if(team == null) {
					continue;
				}
				
				if(captureTeam == '') {
					captureTeam = team.name;
					captureRate++;
				}
				else if(captureTeam == team.name) {
					captureRate++;
				}
				else if(captureTeam != team.name) {
					captureTeam = 'multiple';
				}
				
				playersInZone.push(player.player.name);
				
			}
			
			let result = 0;
			//console.log(captureTeam);
			switch(captureTeam) {
				case 'multiple':
					for(let p in playersInZone) {
						this.omegga.middlePrint(playersInZone[p], 'There is an enemy team in the zone!');
					}
					break;
				case 'RedTeam':
					if(zone.bias == -20) {
						break;
					}
					if(!active) {
						for(let p in playersInZone) {
							this.omegga.middlePrint(playersInZone[p], 'You need to capture the previous zones before capturing this one!');
						}
						break;
					}
					result = changeZoneBias(z, -captureRate);
					let redBias1 = ('|').repeat(Math.min(20 + result.b, 20)) + clr.red + ('|').repeat(Math.max(-result.b, 0)) + '</>';
					let bluBias1 = clr.blu + ('|').repeat(Math.max(result.b, 0)) + '</>' + ('|').repeat(Math.min(20 - result.b, 20));
					for(let p in playersInZone) {
						this.omegga.middlePrint(playersInZone[p], redBias1 + bluBias1);
					}
					break;
				case 'BlueTeam':
					if(zone.bias == 20) {
						break;
					}
					if(!active) {
						for(let p in playersInZone) {
							this.omegga.middlePrint(playersInZone[p], 'You need to capture the previous zones before capturing this one!');
						}
						break;
					}
					result = changeZoneBias(z, captureRate);
					let redBias2 = ('|').repeat(Math.min(20 + result.b, 20)) + clr.red + ('|').repeat(Math.max(-result.b, 0)) + '</>';
					let bluBias2 = clr.blu + ('|').repeat(Math.max(result.b, 0)) + '</>' + ('|').repeat(Math.min(20 - result.b, 20));
					for(let p in playersInZone) {
						this.omegga.middlePrint(playersInZone[p], redBias2 + bluBias2);
					}
					break;
			}
			switch(result.c) {
				case 'red':
					this.omegga.broadcast('<b>' + clr.red + 'Red team</> has captured ' + clr.red + 'zone ' + zone.order + '!<>');
					this.recalculatePoints();
					break;
				case 'blu':
					this.omegga.broadcast('<b>' + clr.blu + 'Blue team</> has captured ' + clr.blu + 'zone ' + zone.order + '!<>');
					this.recalculatePoints();
					break;
				case 'uncap':
					this.omegga.broadcast('<b>' + clr.ylw + 'zone ' + zone.order + '</> has been uncaptured.<>');
					break;
			}
			
		}
		
		
		
		}catch(e){console.log(e);}
	}
	
	async ctftick() {
		try{
		if(gracetime > -1 && !roundended) {
			gracetime -= 0.5;
			switch(gracetime) {
				case 59:
					this.omegga.broadcast('<b>60 seconds of grace period remain.</>');
					break;
				case 30:
					this.omegga.broadcast('<b>30 seconds of grace period remain.</>');
					break;
				case 15:
					this.omegga.broadcast('<b>15 seconds of grace period remain.</>');
					break;
				case 5:
					this.omegga.broadcast('<b>5 seconds of grace period remain.</>');
					break;
				case 0:
					this.teleportPlayers();
					this.omegga.broadcast('<b>FIGHT! Grace period has ended.</>');
					break;
			}
			return;
		}
		if(redtimout > -1) {
			redtimout -= 0.5;
		}
		if(blutimout > -1) {
			blutimout -= 0.5;
		}
		if(redtimout === 0) {
			redflagpos = reddef;
			redupd = true;
			this.omegga.broadcast('<b>The ' + clr.red + 'red flag </>has been returned.</>');
		}
		if(blutimout === 0) {
			bluflagpos = bludef;
			bluupd = true;
			this.omegga.broadcast('<b>The ' + clr.blu + 'blue flag </>has been returned.</>');
		}
		if(redupd && gracetime < 0) {
			redupd = false;
			const redfbrs = redbrs;
			redfbrs.brick_owners = [{
			id: '00000000-0000-0000-0000-000000000333',
			name: 'redflag',
			bricks: 2
			}];
			await this.omegga.clearBricks('00000000-0000-0000-0000-000000000333', {quiet: true});
			let clearpos = redflagpos;
			clearpos[2] += 20;
			await this.omegga.clearRegion({center: clearpos, extent: [20,20,20]});
			clearpos[2] -= 20;
			this.omegga.loadSaveData(redfbrs,{quiet: true, offX: redflagpos[0], offY: redflagpos[1], offZ: redflagpos[2]});
		}
		if(bluupd && gracetime < 0) {
			bluupd = false;
			const blufbrs = blubrs;
			blufbrs.brick_owners = [{
			id: '00000000-0000-0000-0000-000000000111',
			name: 'bluflag',
			bricks: 2
			}];
			await this.omegga.clearBricks('00000000-0000-0000-0000-000000000111', {quiet: true});
			let clearpos = bluflagpos;
			clearpos[2] += 20;
			await this.omegga.clearRegion({center: clearpos, extent: [20,20,20]});
			clearpos[2] -= 20;
			this.omegga.loadSaveData(blufbrs,{quiet: true, offX: bluflagpos[0], offY: bluflagpos[1], offZ: bluflagpos[2]});
		}
		tick = (tick + 1) % 4;
		if(tick === 0) {
			await this.omegga.clearBricks('00000000-0000-0000-0000-000000000000', {quiet: true});
			let posl = [];
			if(redcarrier != '') {
				const player = await this.omegga.getPlayer(redcarrier);
				if(player == null) {
					return;
				}
				const pos = await player.getPosition();
				if(pos[2] >= oldrpos[2] + 50) {
					prefallrpos = pos;
				}
				oldrpos = pos;
				posl.push(pos);
			}
			if(blucarrier != '') {
				const player = await this.omegga.getPlayer(blucarrier);
				if(player == null) {
					return;
				}
				const pos = await player.getPosition();
				if(pos[2] >= oldbpos[2] + 50) {
					prefallbpos = pos;
				}
				oldbpos = pos;
				posl.push(pos);
			}
			if(posl.length > 0) {
				for(var p in posl) {
					let brs = markerbrs;
					brs.brick_owners = [{
					id: '00000000-0000-0000-0000-000000000000',
					name: 'PUBLIC',
					bricks: 0
					}];
					this.omegga.loadSaveData(brs, {quiet: true, offX: posl[p][0], offY: posl[p][1], offZ: posl[p][2]});
				}
			}
		}
		//}catch(e){console.log(e)}
		
		}catch(e){console.log(e)}
	}
	
	async explosionSubdivide(pos, radius) {
		
		function sphereBoxIntersect(sPos, r, bPos, bSize) {
			
			const closestPoint = [
				Math.min(bSize[0], Math.max(sPos[0] - bPos[0], -bSize[0])),
				Math.min(bSize[1], Math.max(sPos[1] - bPos[1], -bSize[1])),
				Math.min(bSize[2], Math.max(sPos[2] - bPos[2], -bSize[2]))
			];
			
			const distance = Math.sqrt(
				(closestPoint[0] + bPos[0] - sPos[0]) ** 2 +
				(closestPoint[1] + bPos[1] - sPos[1]) ** 2 +
				(closestPoint[2] + bPos[2] - sPos[2]) ** 2
			);
			
			return distance <= r;
			
		}
		
		//Math.abs(pos[0] - b.p[0]) < b.s[0] + radius * 1.2 &&
		//Math.abs(pos[1] - b.p[1]) < b.s[1] + radius * 1.2 &&
		//Math.abs(pos[2] - b.p[2]) < b.s[2] + radius * 1.2
		
		try {
		let affectedBricks = tl.filter(b => sphereBoxIntersect(pos, radius, b.p, b.s) && !b.ie);
		for(let ab in affectedBricks) {
			let brick = affectedBricks[ab];
			
			const color = brick.c;
			
			let bricklist = [brick];
			
			this.omegga.clearRegion({center: brick.p, extent: brick.s});
			const tlind = tl.findIndex(b => b.p.join(' ') == brick.p.join(' '));
			tl.splice(tlind, 1);
			if(brick.dontSubdivide) {
				continue;
			}
			
			let finish = false;
			let cycles = 0;
			//let skip = 0;
			while(!finish && cycles < 15) {
				let toAdd = [];
				for(let b in bricklist) {
					let br = bricklist[b];
					if(br == null) {
						continue;
					}
					let dist = Math.sqrt( (br.p[0] - pos[0]) ** 2 +
						(br.p[1] - pos[1]) ** 2 +
						(br.p[2] - pos[2]) ** 2
					);
					if(dist < radius + br.s[0] * 1.414) {
						bricklist.splice(b, 1);
						b--;
						if(br.s[0] <= 10) {
							continue;
						}
						let offset = [1 + br.p[0],1 + br.p[1],0 + br.p[2]];
						const blist = await this.Subdivide(offset, br.p, br.s, 1);
						bricklist = bricklist.concat(blist);
					}
				}
				//skip--;
				if(toAdd.length > 0) {
					bricklist = bricklist.concat(toAdd);
				}
				cycles++;
			}
			const defaultb = brsbrick.bricks[0];
			let brlist = [];
			for(let i in bricklist) {
				const br = bricklist[i];
				let brick = this.copyBrick(defaultb);
				brick.size = br.s;
				brick.position = br.p;
				brick.material_index = 0;
				brick.color = color;
				brick.components.BCD_Interact.ConsoleTag = 'trench';
				brlist.push(brick);
				tl.push({p: br.p, s: br.s, c: color});
			}
			if(brlist.length > 0) {
				const toload = {...brsbrick, bricks: brlist};
				this.omegga.loadSaveData(toload, {quiet: true});
			}
		}
		}catch(e){console.log(e)}
	}
	
	async getGrenades() {
		try{
		let grenades = [];
		const PGreg = new RegExp(
		`Projectile_StickGrenade_C .+PersistentLevel\.(?<Grenade>.+)`
		);
		const gList = await this.omegga.addWatcher(PGreg, {
			exec: () =>
			this.omegga.writeln(
				`getAll Projectile_StickGrenade_C RelativeLocation`
			),
			bundle: true,
			timeoutDelay: 100
		});
		for(let pg in gList) {
			const match = gList[pg];
			grenades.push(match.groups.Grenade);
		}
		return grenades;
		}catch(e){return [];}
	}
	
	async getGrenadePos(grenade) {
		try{
		const PGreg = new RegExp(
		`SphereComponent .+?PersistentLevel\\.${grenade}\\.CollisionComponent\\.RelativeLocation = \\(X=(?<x>[\\d\\.-]+),Y=(?<y>[\\d\\.-]+),Z=(?<z>[\\d\\.-]+)\\)`
		);
		const [{groups: { x, y, z }}] = await this.omegga.addWatcher(PGreg, {
			exec: () =>
			this.omegga.writeln(
				`getAll SphereComponent RelativeLocation Outer=${grenade}`
			),
			first: 'index',
			timeoutDelay: 500
		});
		return [x, y, z];
		}catch(e){return false;}
	}
	
	async announceEnd() {
		//try{
		console.log("Round end");
		await this.omegga.nextRoundMinigame(0);
		roundended = true;
		for(var i in blockinv) {
			let inv = blockinv[i];
			inv.count = 64;
			blockinv[i] = inv;
		}
		
		let winnerTeam = ""
		if(redpoints > blupoints) {
			this.omegga.broadcast(clr.imp + '<b>' + clr.red + 'Red team </>has won the round!</>');
			winnerTeam = "RedTeam";
		}
		else if(redpoints < blupoints) {
			this.omegga.broadcast(clr.imp + '<b>' + clr.blu + 'Blue team </>has won the round!</>');
			winnerTeam = "BlueTeam";
		}
		else {
			this.omegga.broadcast(clr.imp + '<b>Draw.</>');
		}
		try{
		const players = this.omegga.players;
		for(let p in players) {
			const player = players[p];
			const team = await this.getTeam(1, player);
			if(team == null) {
				continue;
			}
			const f = classlist.filter(cl => cl.player == player.name);
			if(f.length === 0) {
				continue;
			}
			const clas = f[0];
			if(team.name !== winnerTeam) {
				this.clearClassWeapons(player, clas);
			}
		}
		}catch(e){console.log(e)}
		this.omegga.broadcast('<b>' + clr.red + redpoints + '</> - ' + clr.blu + blupoints + '</>');
		redpoints = 0;
		blupoints = 0;
		redspawnlist = [];
		bluspawnlist = [];
		redflagpos = [];
		bluflagpos = [];
		redcarrier = '';
		blucarrier = '';
		redtimout = -1;
		blutimout = -1;
		redupd = true;
		bluupd = true;
		gracetime = 60;
		voted = [];
		mapchoice = [];
		zones = [];
		this.omegga.broadcast(clr.ylw +'<b>You have 15 seconds to ' + clr.rst + '/vote (1 - 4)' + clr.ylw + ' for a new map!</>');
		
		let mapsel = JSON.parse(JSON.stringify(maps));
		for(var i=0;i<4 && i<maps.length;i++) {
			const rand = Math.floor(Math.random() * mapsel.length);
			const map = mapsel[rand];
			const mapFile = map.substr(0,map.length - 4);
			mapchoice.push(mapFile);
			mapsel.splice(rand,1);
			
			const mapFileSplit = mapFile.split('_');
			
			let comma = ',';
			if(i === 3) {
				comma = '';
			}
			
			if(mapFileSplit.length === 1) {
				this.omegga.broadcast('<b>' + clr.rst + mapFile + ' </><b> Mode: </>' + modeColor.CTF + '</>' + comma + '<b>');
			}
			else {
				this.omegga.broadcast('<b>' + clr.rst + mapFileSplit[1] + ' </><b>  Mode: </>' + modeColor[mapFileSplit[0]] + '</>' + comma + '<b>');
			}
			//this.omegga.broadcast('<b>' + clr.rst +);
		}
		//this.omegga.broadcast('<b>' + clr.rst + mapchoice.join('</>,</>\n<b>' + clr.rst) + '</>');
		setTimeout(() => this.loadmap(), 15000);
		//}catch(e){console.error(e)}
	}
	
	async loadmap() {
		this.omegga.broadcast(clr.ylw + '<b>Map vote ended!</>')
		if(voted.length > 0) {
			const values = [0, 0, 0, 0];
			values[0] = voted.filter(v => v.v === 1).length;
			values[1] = voted.filter(v => v.v === 2).length;
			values[2] = voted.filter(v => v.v === 3).length;
			values[3] = voted.filter(v => v.v === 4).length;
			let ind = 0;
			let highest = 0;
			for(var v in values) {
				const val = values[v];
				if(val > highest) {
					ind = v;
					highest = val;
				}
			}
			mapid = mapchoice[ind] + '.brs';
		}
		if(maps.length == 0) {
			return;
		}
		tl = [];
		await this.omegga.clearAllBricks({quiet: true});
		if(mapid >= maps.length) {
			mapid = 0;
		}
		const mapfile = fs.readFileSync(__dirname + "/Map/"+mapid);
		let map = brs.read(mapfile);
		let ownerl = [];
		lowest = 99999;
		for(var w in map.brick_owners) {
			const brco = map.brick_owners[w];
			ownerl.push(brco.name);
		}
		const assets = map.brick_assets;
		const colors = map.colors;
		for(var b in map.bricks) {
			let brick = map.bricks[b];
			if(assets[brick.asset_name_index] === "B_SpawnPoint") {
				const brickcolor = colors[brick.color];
				if(brickcolor[0] > brickcolor[2]) {
					redspawnlist.push(brick.position);
				}
				else {
					bluspawnlist.push(brick.position);
				}
				continue;
			}
			if('components' in brick) {
				if('BCD_Interact' in brick.components) {
					const pos = brick.position;
					switch(brick.components.BCD_Interact.ConsoleTag) {
						case 'trench':
							trenchcolor = brick.color;
							if(pos[2] - brick.size[2] < lowest) {
								lowest = pos[2] - brick.size[2];
							}
							tl.push({p: pos, s: brick.size, c: brick.color});
							break;
						case 'redflag':
							reddef = [pos[0],pos[1],pos[2] + brick.size[2]];
							redflagpos = reddef;
							break;
						case 'blueflag':
							bludef = [pos[0],pos[1],pos[2] + brick.size[2]];
							bluflagpos = bludef;
							break;
						case 'zone':
							const order = Number(brick.components.BCD_Interact.Message);
							zones.push({pos: pos, size: brick.size, bias: 0, capturedBy: 'None', order: order});
							break;
						case 'destructable':
							tl.push({p: pos, s: brick.size, c: brick.color, dontSubdivide: true});
							break;
					}
				}
			}
		}
		
		const mapName = mapid.split('.')[0];
		const mapMode = mapName.split('_');
		
		switch(mapMode[0]) {
			
			case 'ZC':
				mode = 'ZC';
				gracetime = -1;
				middleZone = zones.length / 2 + 0.5;
				for(let z in zones) {
					let zone = zones[z];
					if(zone.order < middleZone) {
						zone.bias = -20;
						zone.capturedBy = 'RedTeam';
						redpoints++;
					}
					if(zone.order > middleZone) {
						zone.bias = 20;
						zone.capturedBy = 'BlueTeam';
						blupoints++;
					}
				}
				zones.sort((a, b) => a.order - b.order);
				break;
			case 'CTF':
				mode = 'CTF';
				break;
			default:
				mode = 'CTF';
				break;
			
		}
		
		if(mapMode.length === 1) {
			this.omegga.broadcast('<b>Loading map: ' + clr.rst + mapName + ' </>by ' + clr.ylw + ownerl.join('</>, ' + clr.ylw) + '</>');
		}
		else {
			this.omegga.broadcast('<b>Loading map: ' + clr.rst + mapMode[1] + ' </>by ' + clr.ylw + ownerl.join('</>, ' + clr.ylw) + '</>');
		}
		
		await this.omegga.loadSaveData(map, {quiet: true});
		this.omegga.resetMinigame(0);
		roundended = false;
	}
	
	async setupClass(plyr, clas) {
		try{
		switch(clas.class) {
			case 'assault':
				plyr.giveItem(weapons['classic assault rifle']);
				plyr.giveItem(weapons['smg']);
				break;
			case 'sniper':
				plyr.giveItem(weapons['sniper']);
				plyr.giveItem(weapons['high power pistol']);
				break;
			case 'trenchie':
				plyr.giveItem(weapons['tactical shotgun']);
				plyr.giveItem(weapons['bullpup smg']);
				plyr.giveItem(weapons['health potion']);
				break;
			case 'machinegunner':
				plyr.giveItem(weapons['light machine gun']);
				plyr.giveItem(weapons['shotgun']);
				break;
			case 'medic':
				plyr.giveItem(weapons['tactical shotgun']);
				plyr.giveItem(weapons['bullpup smg']);
				plyr.giveItem(weapons['health potion']);
				plyr.giveItem(weapons['health potion']);
				break;
		}
		plyr.giveItem(weapons['impact grenade']);
		if(clas.class != 'trenchie' && clas.class != 'medic') {
			plyr.giveItem(weapons['stick grenade']);
		}
		}catch(e){console.log(e)}
	}
	
	async clearClassWeapons(plyr, clas) {
		try{
		switch(clas.class) {
			case 'assault':
				plyr.takeItem(weapons['classic assault rifle']);
				plyr.takeItem(weapons['smg']);
				break;
			case 'sniper':
				plyr.takeItem(weapons['sniper']);
				plyr.takeItem(weapons['high power pistol']);
				break;
			case 'trenchie':
				plyr.takeItem(weapons['tactical shotgun']);
				plyr.takeItem(weapons['bullpup smg']);
				plyr.takeItem(weapons['health potion']);
				break;
			case 'machinegunner':
				plyr.takeItem(weapons['light machine gun']);
				plyr.takeItem(weapons['shotgun']);
				break;
			case 'medic':
				plyr.takeItem(weapons['tactical shotgun']);
				plyr.takeItem(weapons['bullpup smg']);
				plyr.takeItem(weapons['health potion']);
				plyr.takeItem(weapons['health potion']);
		}
		plyr.takeItem(weapons['impact grenade']);
		plyr.takeItem(weapons['stick grenade']);
		}catch(e){console.log(e)}
	}
	
	async init() {
		weapons = await weplist.list()
		const deathevents = await this.omegga.getPlugin('deathevents');
		if(deathevents) {
			console.log('Deathevents detected.');
			deathevents.emitPlugin('subscribe');
		}
		else {
			console.error('You need deathevents plugin to run this.');
			return;
		}
		
		this.omegga.on('cmd:skip', async name => {
			if(roundended) {
				this.omegga.whisper(name, clr.red + "<b>Cannot skip while the round is ended.</>");
				return;
			}
			if(voted.includes(name)) {
				this.omegga.whisper(name, clr.red + '<b>You have already voted to skip.</>')
				return;
			}
			if(votetime === 0) {
				this.omegga.broadcast(clr.ylw + '<b>' + name + ' wants to skip this map!</>');
				votetime = 120;
			}
			else if (votetime <= 30) {
				this.omegga.whisper(name, clr.red + '<b>You need to wait '  + Math.floor(votetime / 2) + ' seconds before starting a vote again.</>');
				return;
			}
			const online = this.omegga.players.length;
			if(votetime > 30) {
				voted.push(name);
				let needed = Math.ciel(online * 0.66);
				if(online < 5) {
					needed = online;
				}
				this.omegga.broadcast(clr.ylw + '<b>' + name + ' has voted to skip! ' + needed + '  more people needed. Type ' + clr.dgrn + '/skip' + clr.ylw + ' to vote.</>');
				if(voted.length == needed) {
					this.omegga.broadcast(clr.ylw + '<b>Enough people have voted to skip the map!</>');
					votetime = 29;
					voted = [];
					this.announceEnd();
				}
			}
		})
		.on('cmd:vote', async (name, ...args) => {
			if(!roundended) {
				this.omegga.whisper(name, clr.red + '<b>You cannot vote while the round is still going.</>');
				return;
			}
			const vote = Number(args[0]);
			if(isNaN(vote)) {
				this.omegga.whisper(name, clr.red + '<b>You must input map number.</>');
				return;
			}
			if(vote > mapchoice.length || vote < 1) {
				this.omegga.whisper(name, clr.red + '<b>You can only input 1 - ' + (mapchoice.length) + '</>');
				return;
			}
			const votes = voted.filter(v => v.p === name);
			if(votes.length > 0) {
				this.omegga.whisper(name, clr.red + '<b>You have already voted.</>');
				return;
			}
			voted.push({p: name, v: vote});
			
			const mapName = mapchoice[vote - 1];
			const mapMode = mapName.split('_');
			let resultMap = mapName;
			if(mapMode.length > 1) {
				resultMap = mapMode[1];
			}
			
			this.omegga.whisper(name, clr.ylw + '<b>You have voted!</>');
			this.omegga.broadcast('<b>' + clr.ylw + name + '</> has voted for ' + clr.dgrn + resultMap + '</>');
		})
		.on('cmd:t', async (name, ...args) => {
			try{
			let message = args.join(' ');
			console.log(name + ': ' + message);
			message = OMEGGA_UTIL.chat.sanitize(message);
			const players = this.omegga.players;
			const ogplayer = await this.omegga.getPlayer(name);
			const ogteam = await this.getTeam(1, ogplayer);
			for(var p in players) {
				const player = players[p];
				const team = await this.getTeam(1, player);
				if(team == null) {
					continue;
				}
				if(team.name === ogteam.name) {
					const tclr = clr[team.name.substr(0,3).toLowerCase()];
					this.omegga.whisper(player.name, '<i><b>' + tclr + '(TEAM) ' + name + '</>:</></> ' + message + '');
				}
			}
			}catch{console.log(e)}
		})
		.on('cmd:lbt', async name => {
			
			if(name in lineBuild) {
				delete lineBuild[name];
				this.omegga.whisper(name, '<b>Line build toggle: Disabled<b>');
			}
			else {
				lineBuild[name] = [];
				this.omegga.whisper(name, '<b>Line build toggle: Enabled<b>');
			}
			
		})
		.on('interact', async data => {
			this.interfunc(data);
		})
		.on('leave', async player => {
			if(redcarrier == player.name) {
				this.omegga.broadcast('<b>The player carrying the ' + clr.red + 'red flag </> has left the game so it was returned.</>');
				redflagpos = reddef;
				redupd = true;
			}
			if(blucarrier == player.name) {
				this.omegga.broadcast('<b>The player carrying the ' + clr.blu + 'blue flag </> has left the game so it was returned.</>');
				bluflagpos = bludef;
				bluupd = true;
			}
			
			if(player.name in deadPlayers) {
				
				let deadPlayerPos = deadPlayers[player.name].pos;
				deadPlayerPos[0] = Math.round(deadPlayerPos[0] / 10) * 10;
				deadPlayerPos[1] = Math.round(deadPlayerPos[1] / 10) * 10;
				deadPlayerPos[2] -= 11;
				this.omegga.writeln('Bricks.ClearRegion ' + deadPlayerPos.join(' ') + ' 10 10 14 00000000-0000-0000-0000-000000000131');
				
				delete deadPlayers[player.name];
				
			}
			
			const players = this.omegga.players;
			playerc = players.length;
			if(players.length === 1) {
				this.announceEnd();
			}
		})
		.on('join', async player => {
			const f = classlist.filter(cl => cl.player == player.name);
			let clas = 0;
			if(f.length === 0) {
				clas = {player: player.name, class: 'assault', nextClass: "", timeout: 0};
				classlist.push(clas);
			}
			else {
				clas = f[0];
			}
			playerc = this.omegga.players.length;
		})
		.on('cmd:give', async (name, ...args) => {
			let amount = Number(args[0]);
			if(amount < 0) {
				this.omegga.whisper(name, clr.red + '<b>You cannot give negative trench.</>');
				return;
			}
			if(isNaN(amount)) {
				this.omegga.whisper(name, clr.red + '<b>Nan trench doesn\'t exist.</>');
				return;
			}
			amount = Math.round(amount);
			args.splice(0,1);
			const reciever = await this.omegga.getPlayer(args.join(' '));
			const owninv = await this.omegga.getPlayer(name);
			if(reciever == null) {
				this.omegga.whisper(name, clr.red + '<b>That player either isn\'t online or you have miss-spelled.</>');
				return;
			}
			const ownteam = await this.getTeam(1, name);
			const recteam = await this.getTeam(1, reciever);
			if(ownteam.name != recteam.name) {
				this.omegga.whisper(name, clr.red + '<b>You cannot give trench to the enemy team.</>');
			}
			const rinvi = blockinv.findIndex(i => i.player === reciever.id);
			const oinvi = blockinv.findIndex(i => i.player === owninv.id);
			console.log(rinvi, oinvi);
			if(rinvi === -1 || oinvi === -1) {
				this.omegga.whisper(name, clr.red + '<b>Try again later.</>');
				return;
			}
			let rinv = blockinv[rinvi];
			let oinv = blockinv[oinvi];
			if(amount > oinv.count) {
				this.omegga.whisper(name, clr.red + '<b>You don\'t have enough trench.</>');
				return;
			}
			oinv.count -= amount;
			rinv.count += amount;
			blockinv[rinvi] = rinv;
			blockinv[oinvi] = oinv;
			this.omegga.whisper(reciever.name,'<b>You gave ' + clr.rst + amount + '</> trench to ' + clr.ylw + reciever.name + '</>.</>');
			this.omegga.whisper(reciever.name,'<b>' + clr.ylw + name + '</> has gave you ' + clr.rst + amount + '</> trench.</>');
		})
		.on('cmd:class', async (name, ...args) => {
			const index = classlist.findIndex(cl => cl.player == name);
			const clas = classlist[index];
			if(clas.timeout > 0) {
				this.omegga.whisper(name,clr.red+'<b>You need to wait ' + Math.ceil(clas.timeout) + ' seconds before using another class.</>');
				return;
			}
			switch(args.join(' ').toLowerCase()) {
				case 'assault':
				case 'sniper':
				case 'trenchie':
				case 'machinegunner':
				case 'medic':
					//if(clas.class != 'trenchie') {
						//classlist[index].upd = false;
					//}
					classlist[index].nextClass = args.join(' ');
					classlist[index].timeout = 30;
					this.omegga.whisper(name, '<b>Class has been set to: ' + clr.rst + args.join(' ').toLowerCase() + '</>. This class will be applied when you respawn.</>');
					break;
				default:
					this.omegga.whisper(name, clr.red + '<b>Invalid class name! Classes: assault, sniper, trenchie, machinegunner, medic</>');
					break;
			}
		})
		.on('cmd:trench', async (name, args) => {
			this.omegga.whisper(name, clr.rst + '<size="30"><b><i>Trench warfare</>');
			switch(args) {
				
				case 'commands':
					this.omegga.whisper(name, '<b>' + clr.dgrn + '/trench </> you are here.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + '/class </> switch classes. You will need to respawn to use one.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + '/t </> team chat.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + '/skip </> vote skip a map.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + '/give </> gives trench to others. First you input the number, then the player.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + '/vote </> vote for the next map when the round is ended.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + '/lbt </> toggles line building.</>');
					break;
				case 'classes':
					this.omegga.whisper(name, '<b>' + clr.dgrn + 'Assault</>');
					this.omegga.whisper(name, '<b>Weapons: Classic assault rifle, Submachine gun, Grenades.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + 'Sniper</>');
					this.omegga.whisper(name, '<b>Weapons: Sniper rifle, High-Power Pistol, Grenades.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + 'Trenchie</>');
					this.omegga.whisper(name, '<b>Weapons: Tactical shotgun, Bullpup SMG, Health Potion, Impact Grenade.</>');
					this.omegga.whisper(name, '<b>Abilities: Placing trench takes half as much trench.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + 'Machinegunner</>');
					this.omegga.whisper(name, '<b>Weapons: Light Machine Gun, Pump Shotgun, Grenades.</>');
					this.omegga.whisper(name, '<b>Abilities: Can heal faster when crouching.</>');
					this.omegga.whisper(name, '<b>' + clr.dgrn + 'Medic</>');
					this.omegga.whisper(name, '<b>Weapons: Tactical shotgun, Bullpup SMG, Health Potions.</>');
					this.omegga.whisper(name, '<b>Abilities: When crouching the medic heals other teammates around them. Crouching near teammate gravestones revives the teammate.</>');
					this.omegga.whisper(name, clr.ylw + '<b>PGup n PGdn to scroll.</>');
					break;
				default:
					this.omegga.whisper(name, '<b>Welcome to trench warfare!</>');
					this.omegga.whisper(name, '<b>As the server name suggets this is all about trench! To remove trench simply click on it. To place trench click on trench while crouching.</>');
					this.omegga.whisper(name, '<b>As a CTF you capture flags. To take the flag you click on the flag. To capture the flag you click on the base under the flag of your team. If your team\'s flag got lost it will respawn after 40 seconds. During that time you can grab the flag and return it by clicking the flag base of your team.</>');
					this.omegga.whisper(name, '<b>This also has classes! Type /class (assault/sniper/trenchie/machinegunner/medic) to change your class. The classes changes once you respawn.</>');
					this.omegga.whisper(name, clr.ylw + '<b>PGup n PGdn to scroll. There is also /trench commands</>');
					break;
				
			}
		});
		const players = this.omegga.players;
		playerc = players.length;
		for(var p in players) {
			const player = players[p];
			classlist.push({player: player.name, class: 'assault', nextClass: "", timeout: 0});
		}
		await this.initmaps();
		setTimeout(() => this.loadminig(), 5000);
		this.announceEnd();
		flaginterval = setInterval(() => this.generalTick(), 500);
		return { registeredCommands: ['skip', 'class', 't','trench','give', 'vote', 'lbt'] };
	}
	async loadminig() {
		const minigs = await this.omegga.getMinigames();
		if(minigs.find(m => m.name === "Trench wars minigane") == null) {
			const presetpath = this.omegga.presetPath;
			console.log("Minigame is missing! Loading minigame...");
			await fs.writeFile(presetpath + '/Minigame/TrenchMinigame.bp', tminig, (err, data) => {});
			this.omegga.loadMinigame('TrenchMinigame', "1050c1b9-cedc-4d6a-8131-495819b04636");
			this.omegga.loadEnvironmentData(JSON.parse(tenv));
		}
	}
	
	async placeGravestone(position, color) {
		
		//console.log(gravestoneBRS.bricks.findIndex(b => b.color === 2));
		//console.log(gravestoneBRS.bricks);
		let gravestone = gravestoneBRS.bricks;
		gravestone[3].color = color;
		const owners = [{
		id: '00000000-0000-0000-0000-000000000131',
		name: 'Gravestone',
		bricks: 0
		}];
		const roundX = Math.round(position[0] / 10) * 10;
		const roundY = Math.round(position[1] / 10) * 10;
		const roundZ = Math.round(position[2]);
		this.omegga.loadSaveData({...gravestoneBRS, bricks: gravestone, brick_owners: owners}, {quiet: true, offX: roundX, offY: roundY, offZ: roundZ - 25});
		
		tl.push({p: [roundX, roundY, roundZ], s: [10,10,14], c: 0, ie: true});
		
		
	}
	
	async pluginEvent(event, from, ...args) {
		try{
		if(event === 'death') {
			if(args[0] == null) {
				return;
			}
			const player = args[0].player;
			if(player.name in lineBuild) {
				delete lineBuild[player.name];
			}
			const team = await this.getTeam(1, player.name);
			if(team == null) {
				return;
			}
			
			const plyr = await this.omegga.getPlayer(player.id);
			let playerPos = [0,0,0];
			if(plyr != null) {
				playerPos = await plyr.getPosition();
			}
			
			deadPlayers[player.name] = {pos: playerPos, team: team.name, heal: 0};
			
			const tclr = clr[team.name.substr(0,3).toLowerCase()];
			
			if(player.name == redcarrier) {
				let pos = this.copyArray(reddef);
				if(plyr != null) {
					pos = this.copyArray(playerPos);
				}
				pos[2] += 20;
				if(await this.checkColliding(pos, [10,10,20])) {
					pos = oldrpos;
				}
				else {
					pos[2] -= 20;
				}
				redcarrier = '';
				if(pos[2] < lowest) {
					this.omegga.broadcast('<b>The ' + clr.red + 'red flag</> is unreachable so it got respawned.</>');
					redflagpos = reddef;
					redupd = true;
				}
				else {
					redtimout = 40;
					this.omegga.broadcast('<b>' + tclr + player.name + '</> has lost the ' + clr.red + 'red flag!</>');
					redflagpos = pos;
					redupd = true;
				}
			}
			if(player.name == blucarrier) {
				let pos = this.copyArray(bludef);
				if(plyr != null) {
					pos = this.copyArray(playerPos);
				}
				pos[2] += 20;
				if(await this.checkColliding(pos, [10,10,20])) {
					pos = oldbpos;
				}
				else {
					pos[2] -= 20;
				}
				blucarrier = '';
				if(pos[2] < lowest) {
					this.omegga.broadcast('<b>The ' + clr.blu + 'blue flag</> is unreachable so it got respawned.</>');
					bluflagpos = bludef;
					bluupd = true;
					return;
					//pos = prefallbpos;
				}
				else {
					blutimout = 40;
					this.omegga.broadcast('<b>' + tclr + player.name + '</> has lost the ' + clr.blu + 'blue flag!</>');
					bluflagpos = pos;
					bluupd = true;
				}
			}
			this.placeGravestone(playerPos, team.color);
		}
		if(event === 'spawn') {
			const player = args[0].player;
			const index = classlist.findIndex(cl => cl.player == player.name);
			//classlist[index].upd = true;
			if(classlist[index].nextClass) {
				classlist[index].class = classlist[index].nextClass;
				classlist[index].nextClass = "";
				this.omegga.whisper(player.name, clr.ylw + '<b>Note! To get more info on classes type /trench classes.</>');
			}
			
			if(player.name in deadPlayers) {
				
				let deadPlayerPos = deadPlayers[player.name].pos;
				deadPlayerPos[0] = Math.round(deadPlayerPos[0] / 10) * 10;
				deadPlayerPos[1] = Math.round(deadPlayerPos[1] / 10) * 10;
				deadPlayerPos[2] = Math.round(deadPlayerPos[2]);
				tl.splice(tl.indexOf(t => t.p.join('') == deadPlayerPos.join('')), 1);
				
				deadPlayerPos[2] -= 11;
				
				this.omegga.writeln('Bricks.ClearRegion ' + deadPlayerPos.join(' ') + ' 10 10 14 00000000-0000-0000-0000-000000000131');
				
				delete deadPlayers[player.name];
				
			}
			
			if(player.name in revivePos) {
				this.omegga.writeln("Chat.Command /TP \"" + player.name + "\" " + revivePos[player.name].join(" ") + " 0");
				delete revivePos[player.name];
			}
			if(gracetime > 0) {
				return;
			}
			const plyr = await this.omegga.getPlayer(player.id);
			const f = classlist.filter(cl => cl.player == player.name);
			if(f.length === 0) {
				return;
			}
			const clas = f[0];
			this.setupClass(plyr, clas);
		}
		}catch(e){console.log(e)}
	}
	async stop() {
		const deathevents = await this.omegga.getPlugin('deathevents');
		if(deathevents) {
			console.log('Unsubbing...');
			deathevents.emitPlugin('unsubscribe');
		}
		clearInterval(flaginterval);
	}
}
module.exports = TrenchWarfare;