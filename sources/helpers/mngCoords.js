export function mngCoords() {}

mngCoords.prototype.getLineCoords = function(fromOffset, toOffset, Coords) {
	let fromCoords = Coords.fromCoords;
	let toCoords = Coords.toCoords;
	let x1, y1, x2, y2;

	let v1 = {};
	let v2 = {};
	let angle;

	v1.x = (fromCoords.left + fromCoords.width / 2) - (toCoords.left + toCoords.width / 2);
	v1.y = (fromCoords.top + fromCoords.height / 2) - (toCoords.top + toCoords.height / 2);
	v2.x = (0) - (toCoords.left + toCoords.width / 2);
	v2.y = (0);
	angle = this.angleVectors(v1, v2);

	if (((angle >= 45) && (angle <= 135))) {
		if ((fromCoords.top + fromCoords.height / 2) <= (toCoords.top + toCoords.height / 2)) {
			x1 = fromOffset.x + fromCoords.width / 2;
			y1 = fromOffset.y + fromCoords.height - 2;
			x2 = toOffset.x + toCoords.width / 2;
			y2 = toOffset.y + 2;
		} else {
			x1 = fromOffset.x + fromCoords.width / 2;
			y1 = fromOffset.y + 2;
			x2 = toOffset.x + toCoords.width / 2;
			y2 = toOffset.y + toCoords.height - 2;
		}
	} else {
		if ((fromCoords.left + fromCoords.width / 2) <= (toCoords.left + toCoords.width / 2)) {
			x1 = fromOffset.x + fromCoords.width - 2;
			y1 = fromOffset.y + fromCoords.height / 2;
			x2 = toOffset.x + 2;
			y2 = toOffset.y + toCoords.height / 2;
		} else {
			x1 = fromOffset.x + 2;
			y1 = fromOffset.y + fromCoords.height / 2;
			x2 = toOffset.x + toCoords.width - 2;
			y2 = toOffset.y + toCoords.height / 2;
		}
	}

	return {
		x1: x1,
		y1: y1,
		x2: x2,
		y2: y2
	}
}

mngCoords.prototype.angleVectors = function(v1, v2) {
	return Math.acos(((v1.x * v2.x) + (v1.y * v2.y)) / (Math.sqrt((v1.x * v1.x) + (v1.y * v1.y)) * Math.sqrt((v2.x * v2.x) + (v2.y * v2.y)))) * 180 / Math.PI;
}