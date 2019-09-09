export function ControllerID(OptionsID) {
	this.OptionsID = JSON.parse(JSON.stringify(OptionsID));
	this.Counts = {};
	this.Queues = {};
}

ControllerID.prototype.config = function(config) {

}

ControllerID.prototype.getID = function(type) {

}