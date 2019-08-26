import {JetView} from "webix-jet";
import {inputs_db,main_middlewares_db,outputs_db} from "models/scheme";
import {GraphX} from "helpers/GraphX";

export default class SchemeView extends JetView {

	constructor(app, name) {
		super(app, name);

		const inputs_template = {
			view: "button",
			width: 70,
			height: 50,
			click: function(id, event) {
				this.$scope.clickButton(id, event);
			}
		};
		const main_middlewares_template = {
			view: "button",
			width: 100,
			height: 100,
			css: "webix_primary"
		};
		const outputs_template = {
			view: "button",
			width: 70,
			height: 50,
			click: function(id, event) {
				this.$scope.clickButton(id, event);
			}
		};

		this.inputs = [];
		this.main_middlewares = [];
		this.outputs = [];

		inputs_db.forEach((value) => {
			this.inputs.push({ ...inputs_template,
				...value
			});
		});

		main_middlewares_db.forEach((value) => {
			this.main_middlewares.push({ ...main_middlewares_template,
				...value
			});
		});

		outputs_db.forEach((value) => {
			this.outputs.push({ ...outputs_template,
				...value
			});
		});
	}

	config() {
		return {
			type: "clean",
			id: "layer",
			rows: [{
					id: "head",
					height: 70,
					rows: [{
						view: "button",
						id: "result",
						value: "Result",
						height: 65,
						click: () => {
							this.getResult();
						}
					}]
				},

				{
					view: "scrollview",
					id: "area",
					scroll: "y",
					body: {
						cols: [{
								view: "layout",
								id: "input",
								width: 70,
								rows: this.inputs
							},

							{
								view: "abslayout",
								id: "drop",
								css: {
									"border": "2px solid #F9F9F9"
								},
								cells: [{
									view: "template",
									id: "drop_hidden",
									template: '<svg><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth" viewBox="0 0 17 17"><path d="M0,0 L0,6 L9,3 z" fill="#1CA1C1" /></marker></defs></svg>'
								}]
							},

							{
								view: "layout",
								id: "output",
								width: 70,
								rows: this.outputs
							}
						]
					},
				},

				{
					view: "scrollview",
					id: "main_middleware",
					minHeight: 100,
					scroll: "x",
					body: {
						cols: this.main_middlewares
					}

				}

			]
		};
	}

	init() {
		this.layer = this.$$("layer");
		this.head = this.$$("head");
		this.area = this.$$("area");
		this.input = this.$$("input");
		this.drop = this.$$("drop");
		this.output = this.$$("output");
		this.main_middleware = this.$$("main_middleware");

		this.CountMiddlewares = 0;
		this.CountLines = 0;
		this.fbID = "";
		this.LinesPack = {};
		this.ButtonsPack = {};
		this.Graph = {};
		this.GraphReverse = {};
		this.Queues = {
			Lines: [],
			Middlewares: []
		};

		this.ButtonCoordinates = {};

		this.svg = this.createSVG("svg");
		this.drop.$view.appendChild(this.svg);

		this.drop.$view.onclick = (event) => {
			if (event.target === this.svg) this.focusOff(this.fbID);
		}

		window.onresize = () => {
			console.log(this.drop.$width);
		}

		webix.DragControl.addDrag(this.drop.$view, {
			$dragDestroy: () => {
				return false;
			},

			$dragPos: (pos, ev) => {
				let context = webix.DragControl.getContext();
				let control = $$(context.source[0]);

				pos.x = control.config.left = pos.x + context.x_offset;
				pos.y = control.config.top = pos.y + context.y_offset;
				if (pos.x < 0) pos.x = control.config.left = 0;
				if (pos.x > (this.drop.$width - control.$width)) pos.x = control.config.left = this.drop.$width - control.$width;
				if (pos.y < 0) pos.y = control.config.top = 0;
				if (pos.y > (this.drop.$height - control.$height)) pos.y = control.config.top = this.drop.$height - control.$height;
				setTimeout(() => {
					window.requestAnimationFrame(() => {
						this.rewriteLine(control.config.id, pos);
					});
				}, 1000 / 330);
			},

			$dragCreate: (source, ev) => {
				const el = webix.$$(ev);
				if (el && el !== this.drop) {
					let pos = webix.html.pos(ev);
					let context = webix.DragControl.getContext();

					context.source = [el.config.id];
					context.from = this.drop;
					context.to = this.drop;
					context.y_offset = el.config.top - pos.y;
					context.x_offset = el.config.left - pos.x;
					return el.$view;
				}
				return false;
			}

		});

		webix.DragControl.addDrag(this.layer.$view, {
			$dragDestroy: (from, html) => {
				return false;
			},

			$dragPos: (pos, ev) => {
				let context = webix.DragControl.getContext();
				let control = $$(context.source[0]);

				pos.x = control.config.left = pos.x + context.x_offset;
				pos.y = control.config.top = pos.y + context.y_offset;
				if (pos.x < 0) pos.x = control.config.left = 0;
				if (pos.y < 0) pos.y = control.config.top = 0;
				if (pos.x > (this.drop.$width - control.$width)) pos.x = control.config.left = this.drop.$width - control.$width;
				if (pos.y > (this.drop.$height - control.$height)) pos.y = control.config.top = this.drop.$height - control.$height;
			},

			$dragCreate: (source, ev) => {
				const parent = webix.$$(ev);
				if (parent && parent.config.$type && parent.config.$type === "main_middleware") {
					let mdl = this.addMiddleware(parent);
					let pos = webix.html.pos(ev);
					let elC = mdl.$view.getBoundingClientRect();
					let context = webix.DragControl.getContext();

					context.source = [mdl.config.id];
					context.from = this.main_middleware;
					context.to = this.drop;
					context.y_offset = (pos.y - elC.top - elC.height - ev.layerY) + elC.height / 2;
					context.x_offset = (pos.x - elC.left - elC.width - ev.layerX) + elC.width / 2;
					return mdl.$view;
				}
				return false;
			}

		});

		webix.ui({
			view: "window",
			id: "resultWindow",
			position: "center",
			width: 500,
			height: 500,
			modal: true,
			close: true,
			head: {
				view: "toolbar",
				elements: [

					{
						template: '<span style="font-size:20px;">Result</span>'
					},

					{
						view: "icon",
						icon: "wxi-close",
						click: function() {
							$$("resultWindow").hide();
							$$("listWays").clearAll();
						}
					}

				],
			},
			body: {
				rows: [{
						view: "list",
						id: "listWays",
						template: "#title#",
						data: [

						],
						select: true,
					},

					{
						view: "scrollview",
						id: "listDemo",
						minHeight: 100,
						height: 100,
						scroll: "x",
						body: {
							//id:"listDemoWin"
						}
					},

					{
						view: "layout",
						id: "listOptions",
						minHeight: 70,
						height: 70,
						hidden: true,
						rows: [{}]
					}
				]
			}
		});
	}

	focusOff() {
		if ((this.fbID) || (this.fbID.length !== 0)) {
			webix.html.removeCss($$(this.fbID).getNode(), "webix_danger");
			this.fbID = "";
		}
	}

	focusOn(tbID) {
		if ((tbID) || (tbID.length !== 0)) {
			webix.html.addCss($$(tbID).getNode(), "webix_danger");
			this.fbID = tbID;
		}
	}

	focusChange(tbID) {
		this.focusOff();
		this.focusOn(tbID);
	}

	angleVectors(v1, v2) {
		return Math.acos(((v1.x * v2.x) + (v1.y * v2.y)) / (Math.sqrt((v1.x * v1.x) + (v1.y * v1.y)) * Math.sqrt((v2.x * v2.x) + (v2.y * v2.y)))) * 180 / Math.PI;
	}

	createLine(lnC, lnID) {
		let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		line.setAttribute("id", lnID);
		line.setAttribute("type", "line");
		line.setAttribute("x1", lnC.x1);
		line.setAttribute("y1", lnC.y1);
		line.setAttribute("x2", lnC.x2);
		line.setAttribute("y2", lnC.y2);
		line.setAttribute("marker-end", "url(#arrow)");

		line.onclick = (event) => {
			let lnID = event.target.id;
			if (lnID) event.target.remove();
			this.removeConnectionsByLine(lnID);
		}
		return line;
	}

	createSVG(svgID) {
		let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("id", svgID);
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "100%");
		svg.setAttribute("version", "1.1");
		svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
		return svg;
	}

	addLine(tbID, event) {
		let fbID = this.fbID;

		if (((fbID) || (fbID.length !== 0)) && (fbID !== tbID)) {
			let Tbutton = $$(tbID);
			let Fbutton = $$(fbID);

			let tgC = Tbutton.$view.getBoundingClientRect();
			let fcC = Fbutton.$view.getBoundingClientRect();
			let drC = this.drop.$view.getBoundingClientRect();

			let Ttype = Tbutton.config.$type;
			let Ftype = Fbutton.config.$type;

			let x1;
			let y1;
			let x2;
			let y2;

			if (Object.keys(this.LinesPack).length > 0) {
				for (let key in this.LinesPack) {
					let value = this.LinesPack[key];
					if ((value.indexOf(tbID) >= 0) && (value.indexOf(fbID) >= 0)) {
						return;
					}
				}
			}

			if ((Ftype) && (Ftype === "input")) {
				if (Ttype === "input") {
					this.focusChange(tbID);
					return;
				}

				if (Ttype === "middleware") {
					x1 = 1;
					y1 = (fcC.top - drC.top) + fcC.height / 2;
					x2 = Tbutton.$view.offsetLeft + 2;
					y2 = Tbutton.$view.offsetTop + tgC.height / 2;
				}

				if (Ttype === "output") {
					x1 = -1;
					y1 = (fcC.top - drC.top) + fcC.height / 2;
					x2 = drC.width - 5;
					y2 = (tgC.top - drC.top) + tgC.height / 2;
				}
			}

			if ((Ftype) && (Ftype === "middleware")) {
				let obj = this.rewriteM(Ttype, {x: Fbutton.$view.offsetLeft, y: Fbutton.$view.offsetTop}, {x: Tbutton.$view.offsetLeft, y: Tbutton.$view.offsetTop}, {tgC: fcC, cnC: tgC, drC: drC});
				x1 = obj.x1;
				y1 = obj.y1;
				x2 = obj.x2;
				y2 = obj.y2;
			}

			if ((Ftype) && (Ftype === "output")) {
				if (Ttype === "input") {
					x1 = drC.width + 2;
					y1 = (fcC.top - drC.top) + fcC.height / 2;
					x2 = 1;
					y2 = (tgC.top - drC.top) + tgC.height / 2;
				}

				if (Ttype === "middleware") {
					x1 = drC.width - 1;
					y1 = (fcC.top - drC.top) + fcC.height / 2;
					x2 = Tbutton.$view.offsetLeft + tgC.width - 2;
					y2 = Tbutton.$view.offsetTop + tgC.height / 2;
				}

				if (Ttype === "output") {
					this.focusChange(tbID);
					return;
				}
			}

			let lnID = this.nextlnID();

			this.svg.appendChild(this.createLine({
				x1: x1,
				y1: y1,
				x2: x2,
				y2: y2
			}, lnID));
			this.addConnections(tbID, lnID, fbID);
			this.focusOff();
		}
	}

	addMiddleware(parent) {
		let mdID = this.nextmdID();
		let prC = parent.$view.getBoundingClientRect();

		this.drop.addView({
			view: "button",
			id: mdID,
			$type: "middleware",
			label: parent.config.label,
			top: prC.top,
			left: prC.left,
			width: 100,
			height: 50,
			css: "webix_primary",
			parentId: parent.config.id
		});

		$$(mdID).$view.onmousedown = (event) => {
			if (event.which == 1) this.ButtonCoordinates = event.target.getBoundingClientRect();
		}

		$$(mdID).$view.onmouseup = (event) => {
			if (
				(event.target.getBoundingClientRect().x === this.ButtonCoordinates.x) &&
				(event.target.getBoundingClientRect().y === this.ButtonCoordinates.y) &&
				(event.which == 1)
			) {
				this.clickButton(mdID, event);
			}
		}
		return $$(mdID);
	}

	clickButton(tbID, event) {
		let fbID = this.fbID;
		if ((!fbID) || (fbID.length === 0)) {
			this.focusOn(tbID);
		} else {
			if (fbID !== tbID) {
				this.addLine(tbID, event);
			} else {
				this.focusOff();
			}
		}
	}

	rewriteLine(tbID, pos) {
		let Tbutton = $$(tbID);
		let Ttype = Tbutton.config.$type;

		if ((Ttype) && (Ttype === "middleware") && (this.ButtonsPack.hasOwnProperty(tbID))) {
			this.ButtonsPack[tbID].forEach((lnID) => {
				let line = document.getElementById(lnID);
				let tgC = Tbutton.$view.getBoundingClientRect();
				let drC = this.drop.$view.getBoundingClientRect();

				let cbID, Cbutton, Ctype, cnC;

				this.LinesPack[lnID].forEach(function(value) {
					if (value !== tbID) {
						cbID = value;
						Cbutton = $$(cbID);
						Ctype = Cbutton.config.$type;
						cnC = Cbutton.$view.getBoundingClientRect();
					}
				});

				let lnC = this.rewriteM(Ctype, pos, {x: Cbutton.$view.offsetLeft, y: Cbutton.$view.offsetTop}, {tgC: tgC, cnC: cnC, drC: drC});

				if ((tbID in this.Graph) && (this.Graph[tbID].indexOf(cbID) >= 0)) {
					line.setAttribute("x1", lnC.x1);
					line.setAttribute("y1", lnC.y1);
					line.setAttribute("x2", lnC.x2);
					line.setAttribute("y2", lnC.y2);
				} else {
					line.setAttribute("x1", lnC.x2);
					line.setAttribute("y1", lnC.y2);
					line.setAttribute("x2", lnC.x1);
					line.setAttribute("y2", lnC.y1);
				}
			});
		}
	}

	rewriteM(type, fromOffset, toOffset, coords)
	{
		let fromCoords = coords.tgC;
		let toCoords = coords.cnC;
		let dropCoords = coords.drC;

		let x1, y1, x2, y2;

		if (type === "input") {
			x1 = fromOffset.x + 2;
			y1 = fromOffset.y + fromCoords.height / 2;
			x2 = 1;
			y2 = (toCoords.top - dropCoords.top) + toCoords.height / 2;
		}

		if (type === "middleware") {
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
		}

		if (type === "output") {
			x1 = fromOffset.x + fromCoords.width - 2;
			y1 = fromOffset.y + fromCoords.height / 2;
			x2 = dropCoords.width - 5;
			y2 = (toCoords.top - dropCoords.top) + toCoords.height / 2;
		}

		return {
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2
		}
	}

	addConnections(tbID, lnID, fbID) {
		this.LinesPack[lnID] = [fbID, tbID];

		if (this.ButtonsPack.hasOwnProperty(fbID))
			this.ButtonsPack[fbID].push(lnID);
		else
			this.ButtonsPack[fbID] = [lnID];

		if (this.ButtonsPack.hasOwnProperty(tbID))
			this.ButtonsPack[tbID].push(lnID);
		else
			this.ButtonsPack[tbID] = [lnID];

		if (this.Graph.hasOwnProperty(fbID))
			this.Graph[fbID].push(tbID);
		else
			this.Graph[fbID] = [tbID];

		if (this.GraphReverse.hasOwnProperty(tbID))
			this.GraphReverse[tbID].push(fbID);
		else
			this.GraphReverse[tbID] = [fbID];
	}

	removeConnectionsByLine(lnID) {
		this.Queues.Lines.push(lnID);
		for (let key in this.ButtonsPack) {
			this.ButtonsPack[key].forEach((value, index) => {
				if (lnID === value) {
					this.ButtonsPack[key].splice(index, 1);
				}
			});
		}

		this.LinesPack[lnID].forEach((value, index, array) => {
			if (this.Graph.hasOwnProperty(value))
				this.Graph[value].forEach((v, i) => {
					if (index === 0)
						if (v === array[index + 1]) this.Graph[value].splice(i, 1);
					if (index === 1)
						if (v === array[index - 1]) this.Graph[value].splice(i, 1);
					if (this.Graph[value].length === 0) delete this.Graph[value];
				});

			if (this.GraphReverse.hasOwnProperty(value))
				this.GraphReverse[value].forEach((v, i) => {
					if (index === 0)
						if (v === array[index + 1]) this.GraphReverse[value].splice(i, 1);
					if (index === 1)
						if (v === array[index - 1]) this.GraphReverse[value].splice(i, 1);
					if (this.GraphReverse[value].length === 0) delete this.GraphReverse[value];
				});
		});

		if (this.LinesPack.hasOwnProperty(lnID)) delete this.LinesPack[lnID];
	}

	removeConnectionsByButton(btID) {

	}

	nextlnID() {
		if (this.Queues.Lines.length !== 0) return this.Queues.Lines.shift();
		this.CountLines++;
		return "line" + this.CountLines;
	}

	nextmdID() {
		if (this.Queues.Middlewares.length !== 0) return this.Queues.Middlewares.shift();
		this.CountMiddlewares++;
		return "middleware" + this.CountMiddlewares;
	}

	getResult() {
		let graph = new GraphX(this.Graph);
		let vertexes = [];
		let result;
		let result_string;

		for (let key in this.Graph) {
			if ($$(key).config.$type === "input") {
				vertexes.push(key);
			}
		}
		result = graph.getPaths(vertexes);
		console.dir(result);

		result.forEach(function(value, index) {
			let CountWays = index + 1;
			$$("listWays").add({
				id: "way" + CountWays,
				num: CountWays,
				title: CountWays + ") " + value.join(" -> "),
				array: value
			}, 0);
		});

		$$("listWays").sort("#num#", "asc", "int");

		$$("resultWindow").define({
			width: window.innerWidth / 100 * 50,
			height: window.innerHeight / 100 * 50,
			minWidth: window.innerWidth / 100 * 50,
			minHeight: window.innerHeight / 100 * 50,
		});
		$$("resultWindow").resize();
		$$("resultWindow").show();
	}
}