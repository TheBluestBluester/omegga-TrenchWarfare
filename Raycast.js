module.exports = {
	async raybox(B, S, L1, L2) {
		const nl = [
			{n: 1, p: [B[0] + S, B[1], B[2]]},
			{n: -1, p: [B[0] - S, B[1], B[2]]},
			{n: 2, p: [B[0], B[1] + S, B[2]]},
			{n: -2, p: [B[0], B[1] - S, B[2]]},
			{n: 3, p: [B[0], B[1], B[2] + S]},
			{n: -3, p: [B[0], B[1], B[2] - S]}
		]
		function planteintersect(n, p, L1, L2, s) {
			if(Math.abs(n) === 1) {
				const dx1 = L2[0] - L1[0];
				const dx2 = p[0] - L1[0];
				const dif = dx2 / dx1;
				if(dif < 0 || dif > 1) {
					return false;	
				}
				const hit = [L1[0] * (1 - dif) + L2[0] * dif, L1[1] * (1 - dif) + L2[1] * dif, L1[2] * (1 - dif) + L2[2] * dif];
				if(hit[1] <= p[1] - s || hit[1] >= p[1] + s || hit[2] <= p[2] - s || hit[2] >= p[2] + s) {
					return false;
				}
				return hit;
			}
			if(Math.abs(n) === 2) {
				const dx1 = L2[1] - L1[1];
				const dx2 = p[1] - L1[1];
				const dif = dx2 / dx1;
				if(dif < 0 || dif > 1) {
					return false;	
				}
				const hit = [L1[0] * (1 - dif) + L2[0] * dif, L1[1] * (1 - dif) + L2[1] * dif, L1[2] * (1 - dif) + L2[2] * dif];
				if(hit[0] <= p[0] - s || hit[0] >= p[0] + s || hit[2] <= p[2] - s || hit[2] >= p[2] + s) {
					return false;
				}
				return hit;
			}
			if(Math.abs(n) === 3) {
				const dx1 = L2[2] - L1[2];
				const dx2 = p[2] - L1[2];
				const dif = dx2 / dx1;
				if(dif < 0 || dif > 1) {
					return false;	
				}
				const hit = [L1[0] * (1 - dif) + L2[0] * dif, L1[1] * (1 - dif) + L2[1] * dif, L1[2] * (1 - dif) + L2[2] * dif];
				if(hit[0] <= p[0] - s || hit[0] >= p[0] + s || hit[1] <= p[1] - s || hit[1] >= p[1] + s) {
					return false;
				}
				return hit;
			}
			return false;
		}
		let hitl = [];
		for(var i in nl) {
			const n = nl[i];
			const hit = planteintersect(n.n, n.p, L1, L2, S);
			if(hit != false) {
				hitl.push({n: n.n, h: hit});
			}
		}
		let hit = false;
		let lastdist = 99999;
		for(var h in hitl) {
			const hh = hitl[h].h;
			const dist = Math.sqrt((hh[0]- L1[0]) * (hh[0]- L1[0]) + (hh[1]- L1[1]) * (hh[1]- L1[1]) + (hh[2]- L1[2]) * (hh[2]- L1[2]));
			if(dist < lastdist) {
				lastdist = dist;
				hit = hitl[h];
			}
		}
		if(hit === false) {
			return false;
		}
		if(Math.abs(hit.n) === 1) {
			hit.n = [hit.n,0,0];
		}
		if(Math.abs(hit.n) === 2) {
			hit.n = [0,hit.n * 0.5,0];
		}
		if(Math.abs(hit.n) === 3) {
			hit.n = [0,0,hit.n/3];
		}
		return hit;
	}
	
}