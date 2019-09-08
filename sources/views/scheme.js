import {
	JetView
} from "webix-jet";
import {
	inputs_db,
	modules_db,
	outputs_db
} from "models/scheme";
import {
	GraphX
} from "helpers/GraphX";
import {
	buCoords
} from "helpers/buCoords";
import {
	buHTML
} from "helpers/buHTML"

export default class SchemeView extends JetView {

	constructor(app, name) {
		super(app, name);

		const inputs_template = {
			view: "button",
			width: 70,
			height: 50,
			$draggable: true
		};
		const modules_template = {
			view: "button",
			width: 100,
			height: 100,
			$draggable: true
		};
		const outputs_template = {
			view: "button",
			width: 70,
			height: 50,
			$draggable: true
		};

		if (!webix.env.touch && webix.env.scrollSize)
			webix.CustomScroll.init();

		this.inputs = [];
		this.modules = [];
		this.outputs = [];

		inputs_db.forEach((value) => {
			this.inputs.push({ ...inputs_template,
				...value
			});
		});

		modules_db.forEach((value) => {
			this.modules.push({ ...modules_template,
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
					view: "fieldset",
					margin: 10,
					type: "clean",
					id: "head",
					label: "Options",
					body: {
						cols: [{
							view: "button",
							id: "unitDelete",
							label: "..."
						}, {
							view: "button",
							id: "resultButton",
							value: "Result",
							width: 100,
							click: () => {
								this.renderResultWindow(this.getResult());
							}
						}, {
							view: "button",
							id: "saveButton",
							value: "Save",
							width: 100,
							badge: 0
						}]
					}

				},

				{
					view: "scrollview",
					id: "area",
					scroll: false,
					body: {
						cols: [{
								view: "scrollview",
								id: "input",
								width: 70,
								scroll: "y",
								body: {
									rows: this.inputs
								}
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
								view: "scrollview",
								id: "output",
								width: 70,
								scroll: "y",
								body: {
									rows: this.outputs
								}
							}
						]
					},
				},

				{
					view: "scrollview",
					id: "module",
					minHeight: 100,
					scroll: "x",
					body: {
						cols: this.modules
					}

				}

			]
		};
	}

	init() {
		// ---DATABASE SAVE
		this.fuID = "";
		this.LinesPack = {};
		this.ButtonsPack = {};
		this.Graph = {};
		this.GraphReverse = {};
		this.Counts = {
			Lines: 0,
			Inputs: 0,
			Modules: 0,
			Outputs: 0
		};
		this.Queues = {
			Lines: [],
			Inputs: [],
			Modules: [],
			Outputs: []
		};
		this.ButtonCoordinates = {};
		// ---

		this.layer = this.$$("layer");
		this.head = this.$$("head");
		this.area = this.$$("area");
		this.drop = this.$$("drop");
		this.input = this.$$("input");
		this.module = this.$$("module");
		this.output = this.$$("output");

		this.buCoords = new buCoords();
		this.buHTML = new buHTML();

		this.svg = this.buHTML.svg({
			id: "svg",
			width: "100%",
			height: "100%"
		});
		this.drop.$view.appendChild(this.svg);
		this.drop.$view.onclick = (event) => {
			if (event.target === this.svg) this.focusOff(this.fuID);
		}
		this.initDrag();
		this.ctxmUnit = webix.ui({
			view: "contextmenu",
			id: "ctxmUnit",
			point: true,
			data: [
				"Delete", {
					$template: "Separator"
				},
				"Information"
			],
			on: {
				onMenuItemClick: function(id) {
					webix.message(this.config.$currentUnit);
				}
			},
			$currentUnit: ""
		});
		this.winResult = webix.ui({
			view: "window",
			id: "winResult",
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
							$$("winResult").hide();
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
						id: "listSelected",
						minHeight: 100,
						height: 100,
						scroll: "x",
						body: {}
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
		window.onresize = (event) => {
			if (!this.winResult.config.hidden) this.resizeWin(this.winResult, 70);
		}
	}

	focusOff() {
		if ((this.fuID) || (this.fuID.length !== 0)) {
			webix.html.removeCss($$(this.fuID).getNode(), "webix_danger");
			this.fuID = "";
		}
	}

	focusOn(tuID) {
		if ((tuID) || (tuID.length !== 0)) {
			webix.html.addCss($$(tuID).getNode(), "webix_danger");
			this.fuID = tuID;
		}
	}

	focusChange(tuID) {
		this.focusOff();
		this.focusOn(tuID);
	}

	createLine(lnID, lnC) {
		let line = this.buHTML.line({
			id: lnID,
			x1: lnC.x1,
			y1: lnC.y1,
			x2: lnC.x2,
			y2: lnC.y2,
			markerEnd: "arrow"
		});

		line.onclick = (event) => {
			let lnID = event.target.id;
			if (lnID) event.target.remove();
			this.removeConnectionsByLine(lnID);
		}
		return line;
	}

	addLine(fuID, tuID) {
		if (((fuID) || (fuID.length !== 0)) && (fuID !== tuID)) {
			let lnID, lnC;
			let fromID, toID;
			let fromUnit, toUnit;

			fromID = fuID;
			toID = tuID;

			fromUnit = $$(fromID);
			toUnit = $$(toID);

			this.focusOff();

			if (Object.keys(this.LinesPack).length > 0) {
				for (let key in this.LinesPack) {
					let value = this.LinesPack[key];
					if ((value.indexOf(fromID) >= 0) && (value.indexOf(toID) >= 0)) {
						return;
					}
				}
			}

			lnC = this.buCoords.getLineCoords({
				x: fromUnit.$view.offsetLeft,
				y: fromUnit.$view.offsetTop
			}, {
				x: toUnit.$view.offsetLeft,
				y: toUnit.$view.offsetTop
			}, {
				fromCoords: fromUnit.$view.getBoundingClientRect(),
				toCoords: toUnit.$view.getBoundingClientRect()
			});

			lnID = this.nextLineID();

			this.svg.appendChild(this.createLine(lnID, {
				x1: lnC.x1,
				y1: lnC.y1,
				x2: lnC.x2,
				y2: lnC.y2
			}));
			this.addConnections(fromID, lnID, toID);
		}
	}

	addUnit(parent) {
		let width, height, css;
		let parentCoords = parent.$view.getBoundingClientRect();
		let parentType = parent.config.$type;
		let unitType = "d_" + parentType;
		let unitID = this.nextUnitID(parentType);

		if (parentType !== "module") {
			width = 70;
			height = 50;
			css = "webix_primary";
		} else {
			width = 100;
			height = 50;
			css = "webix_primary";
		}

		this.drop.addView({
			view: "button",
			id: unitID,
			$type: unitType,
			label: parent.config.label,
			top: parentCoords.top,
			left: parentCoords.left,
			width: width,
			height: height,
			css: css,
			$parentID: parent.config.id,
			$parentTYPE: parentType
		});

		this.ctxmUnit.attachTo($$(unitID).$view);

		$$(unitID).$view.firstChild.firstChild.style.transition = "0.15s ease-in-out";

		$$(unitID).$view.onmousedown = (event) => {
			if (event.which == 1) this.ButtonCoordinates = event.target.getBoundingClientRect();
		}

		$$(unitID).$view.onmouseup = (event) => {
			if (
				(event.target.getBoundingClientRect().x === this.ButtonCoordinates.x) &&
				(event.target.getBoundingClientRect().y === this.ButtonCoordinates.y) &&
				(event.which == 1)
			) {
				this.clickUnit(unitID);
			}
			if (event.which == 3) {
				this.ctxmUnit.config.$currentUnit = unitID;
			}
		}
		return $$(unitID);
	}

	clickUnit(tuID) {
		let fuID = this.fuID;
		if ((!fuID) || (fuID.length === 0)) {
			this.focusOn(tuID);
		} else {
			if (fuID !== tuID) {
				this.addLine(fuID, tuID);
			} else {
				this.focusOff();
			}
		}
	}

	rewriteLine(tuID, pos) {
		if (this.ButtonsPack.hasOwnProperty(tuID)) {
			let line;
			let lnID, lnC;
			let fromID, toID;
			let fromUnit, toUnit;

			this.ButtonsPack[tuID].forEach((lnID) => {
				this.LinesPack[lnID].forEach(function(uID) {
					if (uID !== tuID) {
						fromID = tuID;
						toID = uID;
					}
				});

				fromUnit = $$(fromID);
				toUnit = $$(toID);
				line = document.getElementById(lnID);

				lnC = this.buCoords.getLineCoords({
					x: pos.x,
					y: pos.y
				}, {
					x: toUnit.$view.offsetLeft,
					y: toUnit.$view.offsetTop
				}, {
					fromCoords: fromUnit.$view.getBoundingClientRect(),
					toCoords: toUnit.$view.getBoundingClientRect()
				});

				if ((fromID in this.Graph) && (this.Graph[fromID].indexOf(toID) >= 0)) {
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

	addConnections(fromID, lnID, toID) {
		this.LinesPack[lnID] = [fromID, toID];

		if (this.ButtonsPack.hasOwnProperty(fromID))
			this.ButtonsPack[fromID].push(lnID);
		else
			this.ButtonsPack[fromID] = [lnID];

		if (this.ButtonsPack.hasOwnProperty(toID))
			this.ButtonsPack[toID].push(lnID);
		else
			this.ButtonsPack[toID] = [lnID];

		if (this.Graph.hasOwnProperty(fromID))
			this.Graph[fromID].push(toID);
		else
			this.Graph[fromID] = [toID];

		if (this.GraphReverse.hasOwnProperty(toID))
			this.GraphReverse[toID].push(fromID);
		else
			this.GraphReverse[toID] = [fromID];
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

	nextUnitID(type) {
		let prefix, href;
		switch (type) {
			case "input":
				prefix = "d_input_";
				href = "Inputs";
				break;
			case "module":
				prefix = "d_module_";
				href = "Modules";
				break;
			case "output":
				prefix = "d_output_";
				href = "Outputs";
				break;
		}
		if (this.Queues[href].length !== 0) return this.Queues[href].shift();
		this.Counts[href]++;
		return prefix + this.Counts[href];
	}

	nextLineID() {
		if (this.Queues.Lines.length !== 0) return this.Queues.Lines.shift();
		this.Counts.Lines++;
		return "line_" + this.Counts.Lines;
	}

	getResult() {
		let graph = new GraphX(this.Graph);
		let vertexes = [];
		let result;

		for (let key in this.Graph) {
			if ($$(key).config.$type === "d_input") {
				vertexes.push(key);
			}
		}

		result = graph.getPaths(vertexes);

		result.forEach(function(value, index) {
			value.forEach(function(v, i) {
				result[index][i] = $$($$(v).config.$parentID).config.label || v;
			});
		});

		return result;
	}

	renderResultWindow(result) {
		result.forEach(function(value, index) {
			let CountWays = index + 1;
			$$("listWays").add({
				id: "way" + CountWays,
				num: CountWays,
				title: CountWays + ") (" + value.join(") -> (") + ")",
				array: value
			}, 0);
		});

		$$("listWays").sort("#num#", "asc", "int");

		this.resizeWin(this.winResult, 70);
		this.winResult.show();
	}

	resizeWin(win, per) {
		win.define({
			width: window.innerWidth / 100 * per,
			height: window.innerHeight / 100 * per,
			minWidth: window.innerWidth / 100 * per,
			minHeight: window.innerHeight / 100 * per,
		});
		win.resize();
	}

	initDrag() {
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
				}, 1000 / 400);
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
				if (parent && parent.config.$type && parent.config.$draggable) {
					let unit = this.addUnit(parent);
					let pos = webix.html.pos(ev);
					let unitCoords = unit.$view.getBoundingClientRect();
					let context = webix.DragControl.getContext();

					context.source = [unit.config.id];
					context.from = $$(unit.config.$parentTYPE);
					context.to = this.drop;
					context.y_offset = (pos.y - unitCoords.top - unitCoords.height - ev.layerY) + unitCoords.height / 2;
					context.x_offset = (pos.x - unitCoords.left - unitCoords.width - ev.layerX) + unitCoords.width / 2;
					return unit.$view;
				}
				return false;
			}
		});
	}
}