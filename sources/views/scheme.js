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
	mngID
} from "helpers/mngID";

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
							label: "..."
						}, {
							view: "button",
							id: "resultButton",
							value: "Result",
							width: 100,
							click: () => {
								this.renderWinResult(this.getResult());
							}
						}, {
							view: "button",
							id: "saveButton",
							value: "Save",
							width: 100,
							badge: 0,
							click: () => {
								this.clickSave();
							}
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
								}
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
		const OptionsID = {
			"input": "d_input_",
			"module": "d_module_",
			"output": "d_output_",
			"line": "line_"
		};

		this.mngID = new mngID(OptionsID);
		this.fuID = "";

		// ---DATABASE SAVE
		this.LinesPack = {};
		this.UnitsPack = {};
		this.Graph = {};
		this.GraphReverse = {};
		this.ButtonCoordinates = {};
		// ---
		this.LeaderLines = {};

		this.layer = $$("layer");
		this.head = $$("head");
		this.area = $$("area");
		this.drop = $$("drop");
		this.input = $$("input");
		this.module = $$("module");
		this.output = $$("output");

		this.drop.$view.onclick = (event) => {
			if (event.target === this.drop.getNode()) this.focusOff(this.fuID);
		}

		this.initUI();
		this.initDrag();

		window.onresize = (event) => {
			if (!this.winResult.config.hidden) this.resizeWin(this.winResult, 70);
			if (!this.winInfo.config.hidden) this.resizeWin(this.winInfo, 50);
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

	addLine(fuID, tuID) {
		if (((fuID) || (fuID.length !== 0)) && (fuID !== tuID)) {
			let line, lnID, fromID, toID, fromUnit, toUnit;

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

			lnID = this.mngID.get("line");
			line = new LeaderLine(fromUnit.$view, toUnit.$view, {
				path: "fluid",
				startPlug: "disc",
				endPlug: "arrow1",
				//endSocket: 'left',
				hide: true,
				size: 3,
				duration: 500,
				timing: 'ease-in-out',
				startPlugColor: '#00B7F1',
				endPlugColor: '#007AFF',
				gradient: true
			}).show("draw");

			this.LeaderLines[lnID] = line;
			this.addConnections(fromID, lnID, toID);
		}
	}

	addUnit(parent) {
		let width, height, css;
		let parentCoords = parent.getNode().getBoundingClientRect();
		let parentType = parent.config.$type;
		let unitType = "d_" + parentType;
		let unitID = this.mngID.get(parentType);

		if (parentType !== "module") {
			width = 50;
			height = 50;
			css = "webix_primary";
		} else {
			width = 80;
			height = 80;
			css = "webix_primary";
		}

		this.drop.addView({
			view: "button",
			id: unitID,
			$type: unitType,
			label: '<span style="font-size: 13px">' + parent.config.label + '</span>',
			top: parentCoords.top,
			left: parentCoords.left,
			width: width,
			height: height,
			css: css,
			$parentID: parent.config.id,
			$parentTYPE: parentType
		});

		this.ctxmUnit.attachTo($$(unitID).getNode());

		$$(unitID).getNode().firstChild.firstChild.style.transition = "background-color 0.15s ease-in-out";
		//$$(unitID).$view.firstChild.firstChild.style.borderRadius = "100%";
		//$$(unitID).$view.firstChild.style.borderRadius = "100%";
		//$$(unitID).$view.style.borderRadius = "100%";

		$$(unitID).getNode().onmousedown = (event) => {
			if (event.which == 1) this.ButtonCoordinates = event.target.getBoundingClientRect();
		}

		$$(unitID).getNode().onmouseup = (event) => {
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

	removeLine(lnID) {
		let line = this.LeaderLines[lnID];
		if (this.LeaderLines.hasOwnProperty(lnID)) delete this.LeaderLines[lnID];
		this.mngID.throw(lnID);
		this.removeConnectionsByLine(lnID);
		line.hide("draw");
		setTimeout(() => {
			line.remove()
		}, 2000);
	}

	removeUnit(unitID) {
		if (this.UnitsPack.hasOwnProperty(unitID)) {
			JSON.parse(JSON.stringify(this.UnitsPack))[unitID].forEach((value) => {
				this.removeLine(value);
			});
		}
		this.focusOff();
		$$(unitID).$view.classList.add("animated", "bounceOut", "duration-faster");
		$$(unitID).$view.addEventListener("animationend", () => {
			this.mngID.throw(unitID);
			this.removeConnectionsByUnit(unitID);
			this.drop.removeView(unitID);
		});
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

	clickSave() {
		let send = JSON.stringify({
			"LinesPack": this.LinesPack,
			"UnitsPack": this.UnitsPack,
			"Graph": this.Graph,
			"GraphReverse": this.GraphReverse,
			"Units": this.getUnits(this.mngID.Using)
		});
		console.dir(send);
		console.dir(JSON.parse(send));
	}

	getUnits(using) {
		let UnitsCoords = {};
		for (let key in using) {
			if (using[key] !== "line") {
				let type = using[key];
				UnitsCoords[key] = {
					type: "d_" + type,
					typeParent: type,
					x: $$(key).getNode().offsetLeft,
					y: $$(key).getNode().offsetTop
				}
			}
		}
		return UnitsCoords;
	}

	rewriteLine(tuID) {
		if (this.UnitsPack.hasOwnProperty(tuID)) {
			let line;
			let fromID, toID;
			let fromUnit, toUnit;

			this.UnitsPack[tuID].forEach((lnID) => {
				this.LinesPack[lnID].forEach(function(uID) {
					if (uID !== tuID) {
						fromID = tuID;
						toID = uID;
					}
				});

				fromUnit = $$(fromID);
				toUnit = $$(toID);
				line = this.LeaderLines[lnID];
				line.position();
			});
		}
	}

	addConnections(fromID, lnID, toID) {
		this.LinesPack[lnID] = [fromID, toID];

		if (this.UnitsPack.hasOwnProperty(fromID))
			this.UnitsPack[fromID].push(lnID);
		else
			this.UnitsPack[fromID] = [lnID];

		if (this.UnitsPack.hasOwnProperty(toID))
			this.UnitsPack[toID].push(lnID);
		else
			this.UnitsPack[toID] = [lnID];

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
		for (let key in this.UnitsPack) {
			this.UnitsPack[key].forEach((value, index) => {
				if (lnID === value) this.UnitsPack[key].splice(index, 1);
			});
			if (this.UnitsPack[key].length === 0) delete this.UnitsPack[key];
		}
		this.LinesPack[lnID].forEach((value, index, array) => {
			if (this.Graph.hasOwnProperty(value)) {
				this.Graph[value].forEach((v, i) => {
					if (index === 0)
						if (v === array[index + 1]) this.Graph[value].splice(i, 1);
					if (index === 1)
						if (v === array[index - 1]) this.Graph[value].splice(i, 1);
				});
				if (this.Graph[value].length === 0) delete this.Graph[value];
			}
			if (this.GraphReverse.hasOwnProperty(value)) {
				this.GraphReverse[value].forEach((v, i) => {
					if (index === 0)
						if (v === array[index + 1]) this.GraphReverse[value].splice(i, 1);
					if (index === 1)
						if (v === array[index - 1]) this.GraphReverse[value].splice(i, 1);
				});
				if (this.GraphReverse[value].length === 0) delete this.GraphReverse[value];
			}
		});
		if (this.LinesPack.hasOwnProperty(lnID)) delete this.LinesPack[lnID];
	}

	removeConnectionsByUnit(unitID) {
		if (this.UnitsPack.hasOwnProperty(unitID)) delete this.UnitsPack[unitID];
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

	renderWinResult(result) {
		if (result.length === 0) return false;
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

	renderWinInfo(unitID) {
		let parentLabel = $$($$(unitID).config.$parentID).config.label;
		let parentDescription = $$($$(unitID).config.$parentID).config.$description;
		if ((parentDescription) && (parentDescription !== "")) {
			$$("labelInfo").define("label", parentLabel);
			$$("textInfo").define("template", '<span>' + parentDescription + '</span>');
			$$("labelInfo").refresh();
			$$("textInfo").refresh();
			this.resizeWin(this.winInfo, 50);
			this.winInfo.show();
		}
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



	initUI() {
		webix.protoUI({
			name: "windowA",
			$init: function() {
				this.$ready.push(function() {
					this.attachEvent("onShow", function() {
						this.$view.classList.remove("animated", "rollOut", "duration-50ms");
						this.$view.classList.add("animated", "zoomIn", "duration-50ms");
					})
					this.attachEvent("onHide", function() {
						this.$view.style.display = "block";
						this.$view.classList.remove("animated", "zoomIn");
						this.$view.classList.add("animated", "rollOut");

						this.$view.addEventListener("animationend", () => {
							if (this.$view.classList.contains("rollOut")) {
								this.$view.style.display = "none";
							}
						});
					})
				});
			}
		}, webix.ui.window);

		this.ctxmUnit = webix.ui({
			view: "contextmenu",
			id: "ctxmUnit",
			data: [
				"Delete", {
					$template: "Separator"
				},
				"Information"
			],
			on: {
				onMenuItemClick: (id) => {
					let unitID = $$("ctxmUnit").config.$currentUnit;
					if (id === "Delete") this.removeUnit(unitID);
					if (id === "Information") this.renderWinInfo(unitID);
				}
			},
			$currentUnit: ""
		});

		this.ctxmUnit.$view.classList.add("no-select");

		this.winInfo = webix.ui({
			view: "windowA",
			id: "winInfo",
			position: "center",
			modal: true,
			close: true,
			head: {
				view: "toolbar",
				elements: [

					{
						template: '<div style="text-align: left; padding-top: 4px;"><span style="font-size: 20px;">Information</span></div>'
					},

					{
						view: "icon",
						icon: "wxi-close",
						click: function() {
							$$("winInfo").hide();
						}
					}

				],
			},
			body: {
				rows: [{
					view: "scrollview",
					id: "svInfo",
					scroll: "y",
					body: {
						rows: [{
							view: "label",
							id: "labelInfo",
							align: "center",
							label: "",
						}, {
							view: "template",
							id: "textInfo",
							autoheight: true,
							template: ""
						}]
					}
				}]
			}
		});

		this.winResult = webix.ui({
			view: "windowA",
			id: "winResult",
			position: "center",
			modal: true,
			close: true,
			head: {
				view: "toolbar",
				elements: [

					{
						template: '<div style="text-align: left; padding-top: 4px;"><span style="font-size: 20px;">Result</span></div>'
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
						template: '<span style="font-size: 13px;">#title#</span>',
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
						this.rewriteLine(control.config.id);
					});
				}, 2);
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