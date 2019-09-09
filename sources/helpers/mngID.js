export function mngID(OptionsID) {
	this.OptionsID = JSON.parse(JSON.stringify(OptionsID));
	this.Current = {};
	this.Queues = {};
	this.Using = {};
	for (let key in this.OptionsID) {
		this.Current[key] = 0;
		this.Queues[key] = [];
	}
}

mngID.prototype.config = function(config) {

}

mngID.prototype.dump = function(config) {

}

mngID.prototype.get = function(type) {
	let id;
	if (this.Queues[type].length !== 0) {
		id = this.Queues[type].shift();
	} else {
		this.Current[type]++;
		id = this.OptionsID[type] + this.Current[type];
	}
	this.Using[id] = type;
	return id;
}

mngID.prototype.throw = function(id) {
	let type = this.Using[id];
	this.Queues[type].push(id);
	delete this.Using[id];
}