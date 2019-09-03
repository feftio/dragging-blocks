var DateEmulator = function() {
	this.OwnDate = Date;
}

DateEmulator.prototype.setDatePrototype = function(userDate) {
	if (userDate !== undefined && userDate.length > 0) {
		let __Date = Date;
		Date = undefined;
		Date = function() {
			if (arguments.length > 0) {
				return new __Date(arguments[0], arguments[1], arguments[2]);
			}
			return new __Date(userDate);
		};
		Date.prototype = __Date.prototype;
	}
}

DateEmulator.prototype.getOwnDatePrototype = function() {
	Date.prototype.Date = this.OwnDate;
}