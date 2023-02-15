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

const tminig = fs.readFileSync(__dirname + "/Minig and Env/TrenchMinigame.bp", 'utf8');
const tenv = fs.readFileSync(__dirname + "/Minig and Env/Trench wars env preset.bp", 'utf8');

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
let gracetime = 60;

let mapchoice = [];

let redspawnlist = [];
let bluspawnlist = [];

let redpoints = 0;
let blupoints = 0;

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

class TrenchWarfare {
	
	
	
	constructor(omegga, config, store) {
		this.omegga = omegga;
		this.config = config;
		this.store = store
	}
	
	async Raycast(bpos, bsize, ppos, prot, steps) {
		const B1 = [bpos[0] - bsize[0],bpos[1] - bsize[1],bpos[2] - bsize[2]];
		const B2 = [bpos[0] + bsize[0],bpos[1] + bsize[1],bpos[2] + bsize[2]];
		const L1 = [ppos[0],ppos[1],ppos[2] + 16]
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
	
	async Subdivide(clp, bpos, bsize){
		// The was alot easier to make than i expected.
		let finish = false;
		let cycles = 0;
		let briklist = [{p: bpos, s: bsize}];
		while(!finish && cycles < 10) {
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
						this.omegga.broadcast('<b>' + clr.red + player.name + '</> has captured the ' + clr.blu + 'blue flag!</>');
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
						this.omegga.broadcast('<b>' + clr.blu + player.name + '</> has captured the ' + clr.red + 'red flag!</>');
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
			const ppos = await player.getPosition();
			const crouch = await player.isCrouched();
			const size = data.brick_size;
			const pos = data.position;
			const blocksize = 10;
			const clas = classlist.filter(cl => cl.player == player.name)[0];
			const builder = (clas.class == 'builder');
			const playerRot = await this.GetRotation(player.controller).catch();
			if(playerRot == null) {
				return;
			}
			if(crouch) {
				const hit = await this.Raycast(pos,size,ppos,playerRot,300);
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
						offset = [0,0,10];
						offset2 = [0,10,-10];
					}
					if(n[1] != 0) {
						offset = [0,0,10];
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
				let brick = JSON.parse(JSON.stringify(brsbrick.bricks[0]));
				brick.size = [blocksize,blocksize,blocksize];
				brick.material_index = 0;
				brick.color = trenchcolor;
				brick.components.BCD_Interact.ConsoleTag = 'trench ' + team.name;
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
				tl.push({p: brick.position, s: brick.size});
				blockinv[index] = inv;
				this.omegga.middlePrint(player.name, '<b>Trench: ' + inv.count + '</>');
				return;
			}
			if(gracetime > 0 && !data.message.includes(team.name)) {
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
			let hit = await this.Raycast(pos,size,ppos,playerRot,300);
			if(hit === false) {
				return;
			}
			hit = hit.h;
			const cubelist = await this.Subdivide(hit, pos, size);
			const defaultb = brsbrick.bricks[0];
			let brlist = [];
			for(var i in cubelist) {
				const br = cubelist[i];
				let brick = JSON.parse(JSON.stringify(defaultb));
				brick.size = br.s;
				brick.position = br.p;
				brick.material_index = 0;
				brick.color = trenchcolor;
				brick.components.BCD_Interact.ConsoleTag = 'trench ' + team.name;
				brlist.push(brick);
				tl.push({p: br.p, s: br.s});
			}
			tl.splice(tl.findIndex(b => b.p.join(' ') === pos.join(' ')), 1);
			await this.omegga.clearRegion({center: pos, extent: size});
			inv.count++;
			blockinv[index] = inv;
			this.omegga.middlePrint(player.name, '<b>Trench: ' + inv.count + '</>');
			if(brlist.length > 0) {
				const toload = {...brsbrick, bricks: brlist};
				this.omegga.loadSaveData(toload, {quiet: true});
			}
		}
		catch(e) {
			//console.log(e);
		}
	}
	
	async getTeam(minig, player) {
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
		const players = this.omegga.players
		for(var p in players) {
			const player = players[p];
			const team = await this.getTeam(1, player);
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
			this.omegga.writeln("Chat.Command /TP " + player.name + " " + tppos.join(" ") + " 0");
			const f = classlist.filter(cl => cl.player == player.name);
			if(f.length === 0) {
				return;
			}
			const clas = f[0];
			this.setupClass(player, clas);
		}
	}
	
	async ctftick() {
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
			const redfbrs = JSON.parse(JSON.stringify(redbrs));
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
			const blufbrs = JSON.parse(JSON.stringify(blubrs));
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
				oldrpos = pos;
				posl.push(pos);
			}
			if(blucarrier != '') {
				const player = await this.omegga.getPlayer(blucarrier);
				if(player == null) {
					return;
				}
				const pos = await player.getPosition();
				oldbpos = pos;
				posl.push(pos);
			}
			if(posl.length > 0) {
				for(var p in posl) {
					let brs = JSON.parse(JSON.stringify(markerbrs));
					brs.brick_owners = [{
					id: '00000000-0000-0000-0000-000000000000',
					name: 'PUBLIC',
					bricks: 0
					}];
					this.omegga.loadSaveData(brs, {quiet: true, offX: posl[p][0], offY: posl[p][1], offZ: posl[p][2]});
				}
			}
		}
	}
	
	
	async announceEnd() {
		await this.omegga.nextRoundMinigame(0);
		roundended = true;
		//blockinv = [];
		for(var i in blockinv) {
			let inv = blockinv[i];
			inv.count = 64;
			blockinv[i] = inv;
		}
		if(redpoints > blupoints) {
			this.omegga.broadcast(clr.imp + '<b>' + clr.red + 'Red team </>has won the round!</>');
		}
		else if(redpoints < blupoints) {
			this.omegga.broadcast(clr.imp + '<b>' + clr.blu + 'Blue team </>has won the round!</>');
		}
		else {
			this.omegga.broadcast(clr.imp + '<b>Draw.</>');
		}
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
		this.omegga.broadcast(clr.ylw +'<b>You have 15 seconds to ' + clr.rst + '/vote (1 - 4)' + clr.ylw + ' for a new map!</>');
		
		let mapsel = JSON.parse(JSON.stringify(maps));
		for(var i=0;i<4 && i<maps.length;i++) {
			const rand = Math.floor(Math.random() * mapsel.length);
			const map = mapsel[rand];
			mapchoice.push(map.substr(0,map.length - 4));
			mapsel.splice(rand,1);
		}
		this.omegga.broadcast('<b>' + clr.rst + mapchoice.join('</>,</>\n<b>' + clr.rst) + '</>');
		setTimeout(() => this.loadmap(), 15000);
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
							tl.push({p: pos, s: brick.size});
							break;
						case 'redflag':
							reddef = [pos[0],pos[1],pos[2] + brick.size[2]];
							redflagpos = reddef;
							break;
						case 'blueflag':
							bludef = [pos[0],pos[1],pos[2] + brick.size[2]];
							bluflagpos = bludef;
							break;
					}
				}
			}
		}
		this.omegga.broadcast('<b>Loading map: ' + clr.rst + mapid.split('.')[0] + ' </>by ' + clr.ylw + ownerl.join('</>, ' + clr.ylw) + '</>');
		await this.omegga.loadSaveData(map, {quiet: true});
		this.omegga.resetMinigame(0);
		roundended = false;
	}
	
	async setupClass(plyr, clas) {
		switch(clas.class) {
			case 'assault':
				plyr.giveItem(weapons['classic assault rifle']);
				plyr.giveItem(weapons['smg']);
				break;
			case 'sniper':
				plyr.giveItem(weapons['sniper']);
				plyr.giveItem(weapons['magnum pistol']);
				break;
			case 'shotgunner':
				plyr.giveItem(weapons['tactical shotgun']);
				plyr.giveItem(weapons['bullpup smg']);
				break;
			case 'builder':
				plyr.giveItem(weapons['high power pistol']);
				plyr.giveItem(weapons['health potion']);
				plyr.giveItem(weapons['health potion']);
				break;
		}
		plyr.giveItem(weapons['impact grenade']);
		plyr.giveItem(weapons['stick grenade']);
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
				this.omegga.broadcast(clr.ylw + '<b>' + name + ' has voted to skip! ' + (online - voted.length) + '  more people need to vote to skip this map.</>');
				if(voted.length === online) {
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
			this.omegga.whisper(name, clr.ylw + '<b>You have voted!</>');
			this.omegga.broadcast('<b>' + clr.ylw + name + '</> has voted for ' + clr.dgrn + mapchoice[vote - 1] + '</>');
		})
		.on('cmd:t', async (name, ...args) => {
			let message = args.join(' ');
			console.log(name + ': ' + message);
			message = OMEGGA_UTIL.chat.sanitize(message);
			const players = this.omegga.players;
			const ogplayer = await this.omegga.getPlayer(name);
			const ogteam = await this.getTeam(1, ogplayer);
			for(var p in players) {
				const player = players[p];
				const team = await this.getTeam(1, player);
				if(team.name === ogteam.name) {
					const tclr = clr[team.name.substr(0,3).toLowerCase()];
					this.omegga.whisper(player.name, '<i><b>' + tclr + '(TEAM) ' + name + '</>:</></> ' + message + '');
				}
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
				clas = {player: player.name, class: 'assault', upd: true, timeout: 0};
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
				case 'shotgunner':
				case 'builder':
					if(clas.class != 'builder') {
						classlist[index].upd = false;
					}
					classlist[index].class = args.join(' ');
					classlist[index].timeout = 30;
					this.omegga.whisper(name, '<b>Class has been set to: ' + clr.rst + args.join(' ').toLowerCase() + '</>. This class will be applied when you respawn.</>');
					break;
				default:
					this.omegga.whisper(name, clr.red + '<b>Invalid class name! Classes: assault, sniper, shotgunner, builder</>');
					break;
			}
		})
		.on('cmd:trench', async (name, args) => {
			this.omegga.whisper(name, clr.rst + '<size="30"><b><i>Trench warfare</>');
			if(args === 'commands') {
				this.omegga.whisper(name, '<b>' + clr.dgrn + '/trench </> you are here.</>');
				this.omegga.whisper(name, '<b>' + clr.dgrn + '/class </> switch classes. You will need to respawn to use one.</>');
				this.omegga.whisper(name, '<b>' + clr.dgrn + '/t </> team chat.</>');
				this.omegga.whisper(name, '<b>' + clr.dgrn + '/skip </> vote skip a map.</>');
				this.omegga.whisper(name, '<b>' + clr.dgrn + '/give </> gives trench to others. First you input the number, then the player.</>');
				this.omegga.whisper(name, '<b>' + clr.dgrn + '/vote </> vote for the nest map when the round is neded.</>');
				return;
			}
			this.omegga.whisper(name, '<b>Welcome to trench warfare! Your goal is to capture the flag of the enemy team 3 times.</>');
			this.omegga.whisper(name, '<b>As the server name suggets this is all about trench! To remove trench simply click on it. To place trench click on trench while crouching.</>');
			this.omegga.whisper(name, '<b>As a CTF you capture flags. To take the flag you click on the flag. To capture the flag you click on the base under the flag of your team. If your team\'s flag got lost it will respawn after 40 seconds. During that time you can grab the flag and return it by clicking the flag base of your team.</>');
			this.omegga.whisper(name, '<b>This also has classes! Type /class (assault/sniper/shotgunner) to change your class. The classes changes once you respawn.</>');
			this.omegga.whisper(name, clr.ylw + '<b>PGup n PGdn to scroll. There is also /trench commands</>');
		});
		const players = this.omegga.players;
		playerc = players.length;
		for(var p in players) {
			const player = players[p];
			classlist.push({player: player.name, class: 'assault', upd: true, timeout: 0});
		}
		await this.initmaps();
		setTimeout(() => this.loadminig(), 5000);
		this.announceEnd();
		flaginterval = setInterval(() => this.ctftick(), 500);
		return { registeredCommands: ['skip', 'class', 't','trench','give', 'vote'] };
	}
	async loadminig() {
		const minigs = await this.omegga.getMinigames();
		if(minigs.find(m => m.name === "Trench wars minigane") == null) {
			const presetpath = this.omegga.presetPath;
			console.log("Minigame is missing! Loading minigame...");
			await fs.writeFile(presetpath + '/Minigame/TrenchMinigame.bp', tminig, (err, data) => {});
			this.omegga.loadMinigame('TrenchMinigame', "Bluester16");
			this.omegga.loadEnvironmentData(JSON.parse(tenv));
		}
	}
	async pluginEvent(event, from, ...args) {
		if(event === 'death') {
			if(args[0] == null) {
				return;
			}
			const player = args[0].player;
			const team = await this.getTeam(1, player.name);
			if(team == null) {
				return;
			}
			const tclr = clr[team.name.substr(0,3).toLowerCase()];
			if(player.name == redcarrier) {
				const plyr = await this.omegga.getPlayer(player.id);
				let pos = reddef;
				if(plyr != null) {
					pos = await plyr.getPosition();
				}
				pos[2] += 20;
				if(this.checkColliding(pos, [10,10,20])) {
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
					return;
				}
				redtimout = 40;
				this.omegga.broadcast('<b>' + tclr + player.name + '</> has lost the ' + clr.red + 'red flag!</>');
				redflagpos = pos;
				redupd = true;
			}
			if(player.name == blucarrier) {
				const plyr = await this.omegga.getPlayer(player.id);
				let pos = bludef;
				if(plyr != null) {
					pos = await plyr.getPosition();
				}
				pos[2] += 20;
				if(this.checkColliding(pos, [10,10,20])) {
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
				}
				blutimout = 40;
				this.omegga.broadcast('<b>' + tclr + player.name + '</> has lost the ' + clr.blu + 'blue flag!</>');
				bluflagpos = pos;
				bluupd = true;
			}
		}
		if(event === 'spawn') {
			const player = args[0].player;
			const index = classlist.findIndex(cl => cl.player == player.name);
			classlist[index].upd = true;
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
