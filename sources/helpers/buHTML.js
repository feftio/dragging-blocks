export function buHTML() {}

buHTML.prototype.svg = function(options) {
	let id = options.id || this.randomID(25);
	let width = options.width || "100px";
	let height = options.height || "100px";
	let version = options.version || "1.1";
	let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("id", id);
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);
	svg.setAttribute("version", version);
	svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
	return svg;
}

buHTML.prototype.line = function(options) {
	let id = options.id || this.randomID(25);
	let x1 = options.x1 || 0;
	let y1 = options.y1 || 0;
	let x2 = options.x2 || 0;
	let y2 = options.y2 || 0;
	let markerStart = options.markerStart || undefined;
	let markerEnd = options.markerEnd || undefined;

	let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line.setAttribute("id", id);
	line.setAttribute("x1", x1);
	line.setAttribute("y1", y1);
	line.setAttribute("x2", x2);
	line.setAttribute("y2", y2);
	if (markerStart !== "") line.setAttribute("marker-start", `url(#${markerStart})`);
	if (markerEnd !== "") line.setAttribute("marker-end", `url(#${markerEnd})`);
	line.onclick = (event) => {
		options.onclick(event)
	};
	return line;
}

buHTML.prototype.randomID = function(size = 25) {
	return Math.random().toString(size).substring(2, 15);
}