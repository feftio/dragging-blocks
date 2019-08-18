import {JetView} from "webix-jet";
import {inputs_db, main_middlewares_db, outputs_db} from "models/scheme";

let self;

export default class SchemeView extends JetView
{

	constructor(app, name)
	{
		super(app, name);
		self = function(){
			return this;
		}.bind(this);

		const inputs_template           = { view:"button", width:70,  height:50, click:function(id,event){self().click_button(id,event);}};
		const main_middlewares_template = { view:"button", width:100, height:100, css:"webix_primary"   };
		const outputs_template          = { view:"button", width:70,  height:50, click:function(id,event){self().click_button(id,event);}};

		this.inputs           = [];
		this.main_middlewares = [];
		this.outputs          = [];

		inputs_db.forEach(function(value) {
			self().inputs.push({...inputs_template, ...value});
		});

		main_middlewares_db.forEach(function(value) {
			self().main_middlewares.push({...main_middlewares_template, ...value});
		});

		outputs_db.forEach(function(value) {
			self().outputs.push({...outputs_template, ...value});
		});
	}

	config()
	{
		return {
			type:"space",
			id:"space",
			rows: 
			[
				{ id:"head", height:70, rows:[{view:"button", id:"result", value:"Result"}] },

				{ 
					view:"scrollview", 
					id:"area", 
					scroll:"y", 
					body: 
					{
						cols: 
						[
							{
								view:"layout",
								id:"input",
								width:70,
								rows: this.inputs
							},

							{
								view:"abslayout",
								id:"drop"
							},

							{
								view:"layout",
								id:"output",
								width:70,
								rows: this.outputs
							}
						]
					}, 
				},

				{ 
					view:"scrollview",
					id:"main_middleware",
					minHeight:100,
					scroll:"x",
					body:
					{
						cols: this.main_middlewares
					}

				}

			]
		};
	}

	init()
	{
		this.space           = this.$$("space");
		this.head            = this.$$("head");
		this.area            = this.$$("area");
		this.input           = this.$$("input");
		this.drop            = this.$$("drop");
		this.output          = this.$$("output");
		this.main_middleware = this.$$("main_middleware");

		this.CountMiddlewares  = 0;
		this.CountLines        = 0;
		this.FocusButton       = "";

		this.LinesPack         = {};
		this.ButtonsPack       = {};
		this.Sublings          = {};

		this.ButtonCoordinates = {};

		this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

		this.svg.setAttribute("id", "svg");
		this.svg.setAttribute("width", "100%");
		this.svg.setAttribute("height", "100%");
		this.svg.setAttribute("version", "1.1");
		this.svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
		this.drop.$view.appendChild(this.svg);

		this.drop.$view.onclick = function(event)
		{
			if (event.target === svg) self().focus_off(self().FocusButton);
		}

		webix.DragControl.addDrag(this.drop.$view, 
		{
			$dragDestroy: function() {
				return false;
			},

			$dragPos: function(pos, ev)
			{
				let context = webix.DragControl.getContext(); 
				let control = $$(context.source[0]);

				pos.x = control.config.left = pos.x+context.x_offset;
				pos.y = control.config.top  = pos.y+context.y_offset;
				if (pos.x<0) pos.x=control.config.left=0;
				if (pos.x>(self().drop.$width-control.$width)) pos.x=control.config.left=self().drop.$width-control.$width;
				if (pos.y<0) pos.y=control.config.top=0;
				if (pos.y>(self().drop.$height-control.$height)) pos.y=control.config.top=self().$height-control.$height;
				//window.requestAnimationFrame(function(){
				//rewrite_line(control.config.id, pos);
				//});
			},

			$dragCreate: function(source, ev)
			{
				const el = webix.$$(ev);
				if (el && el !== self().drop)
				{
					let pos     = webix.html.pos(ev);
					let context = webix.DragControl.getContext();
					context.source   = [el.config.id];
					context.from     = self().drop;
					//context.to       = self().drop;
					context.y_offset = el.config.top - pos.y;
					context.x_offset = el.config.left - pos.x;
					return el.$view;
				}
				return false;
			}
		});

		webix.DragControl.addDrag(this.space.$view, 
		{
			$dragDestroy: function(from, html) {
				return false;
			},

			$dragPos: function(pos, ev)
			{
				let context = webix.DragControl.getContext(); 
				let control = $$(context.source[0]);

				pos.x = control.config.left = pos.x+context.x_offset;
				pos.y = control.config.top  = pos.y+context.y_offset;
				if (pos.x<0){pos.x=control.config.left=0; }
				if (pos.x>(self().drop.$width-control.$width)) pos.x=control.config.left=self().drop.$width-control.$width;
				if (pos.y<0) pos.y=control.config.top=0;
				if (pos.y>(self().drop.$height-control.$height)) pos.y=control.config.top=self().drop.$height-control.$height;
			},

			$dragCreate: function(source, ev)
			{
				const parent = webix.$$(ev);
				if (parent && parent.config.$type && parent.config.$type === "main_middleware")
				{
					let elA     = self().add_middleware(parent);
					let pos     = webix.html.pos(ev);
					let elC     = elA.$view.getBoundingClientRect();
					let context = webix.DragControl.getContext();

					context.source   = [elA.config.id];
					context.from     = self().main_middleware;
					//context.to       = self().drop;
					context.y_offset = (pos.y-elC.top-elC.height-ev.layerY)+elC.height/2;
					context.x_offset = (pos.x-elC.left-elC.width-ev.layerX)+elC.width/2;
					return elA.$view;
				}
				return false;
			}
		});
	}

	focus_off()
	{
		if ((self().FocusButton) || (self().FocusButton.length !== 0))
		{
			webix.html.removeCss($$(self().FocusButton).getNode(), "webix_danger");
			self().FocusButton = "";
		}
	}

	focus_on(TargetButton)
	{
		if ((TargetButton) || (TargetButton.length !== 0))
		{
			webix.html.addCss($$(TargetButton).getNode(), "webix_danger");
			self().FocusButton = TargetButton;
		}
	}

	focus_change(TargetButton)
	{
		self().focus_off();
		self().focus_on(TargetButton);
	}

	angle_vectors(v1, v2)
	{
		let lenght_v1 = Math.sqrt((v1.x*v1.x)+(v1.y*v1.y));
		let lenght_v2 = Math.sqrt((v2.x*v2.x)+(v2.y*v2.y));
		let scalar    = (v1.x*v2.x)+(v1.y*v2.y);
		let answer    = Math.acos(scalar/(lenght_v1*lenght_v2))*180/Math.PI;
		return answer;
	}

	createLine(lnC, lineId)
	{
		let line = document.createElementNS("http://www.w3.org/2000/svg","line");
		line.setAttribute("id", lineId);
		line.setAttribute("type", "line");
		line.setAttribute("x1", lnC.x1);
		line.setAttribute("y1", lnC.y1);
		line.setAttribute("x2", lnC.x2);
		line.setAttribute("y2", lnC.y2);
		line.setAttribute("marker-end", "url(#arrow)");

		line.onclick = function(event)
		{
			self().CountLines--;
			let id = event.target.id;
			if (id) event.target.remove();

			for (key in self().ButtonsPack)
			{
				self().ButtonsPack[key].forEach(function(value, index)
				{
					if (id === value) self().ButtonsPack[key].splice(index, 1);
				});
			}
			if (self().LinesPack.hasOwnProperty(id)) delete self().LinesPack[id];
		}
		return line;
	}

	add_line(TargetButton, event)
	{
		let FocusButton = self().FocusButton;

		if ( ((FocusButton) || (FocusButton.length !== 0)) && (FocusButton !== TargetButton) )
		{
			let tgC = self().$$(TargetButton).$view.getBoundingClientRect();
			let fcC = self().$$(FocusButton).$view.getBoundingClientRect();
			let drC = self().drop.$view.getBoundingClientRect();

			let Ttype = self().$$(TargetButton).config.$type;
			let Ftype = self().$$(FocusButton).config.$type;

			let x1;
			let y1;
			let x2;
			let y2;
			
			if (Object.keys(self().LinesPack).length > 0)
			{
				for (key in self().LinesPack)
				{
					let value = self().LinesPack[key];
					if ( (value.indexOf(TargetButton) >=0 ) && (value.indexOf(FocusButton) >= 0) )
					{
						return;
					}
				}
			}

			if ( (Ftype) && (Ftype === "input") )
			{
				if (Ttype === "input")
				{
					self().focus_change(TargetButton);
					return;
				}

				if (Ttype === "middleware")
				{
					x1 = $$(TargetButton).$view.offsetLeft+2;
					y1 = $$(TargetButton).$view.offsetTop+tgC.height/2;
					x2 = 1;
					y2 = (fcC.top-drC.top)+fcC.height/2;
				}

				if (Ttype === "output")
				{
					x1 = drC.width-1;
					y1 = (tgC.top-drC.top)+tgC.height/2;
					x2 = -1;
					y2 = (fcC.top-drC.top)+fcC.height/2;
				}
			}

			if ( (Ftype) && (Ftype === "middleware") )
			{
				if (Ttype === "input")
				{
					x1 = 1;
					y1 = (tgC.top-drC.top)+tgC.height/2;
					x2 = $$(FocusButton).$view.offsetLeft+2;
					y2 = $$(FocusButton).$view.offsetTop+fcC.height/2;
				}

				if (Ttype === "middleware")
				{
					let v1 = {};
					let v2 = {};
					let angle;
					v1.x = (tgC.left+tgC.width/2)-(fcC.left+fcC.width/2);
					v1.y = (tgC.top+tgC.height/2)-(fcC.top+fcC.height/2);
					v2.x = (0)-(fcC.left+fcC.width/2);
					v2.y = (0);
					angle = self().angle_vectors(v1,v2);

					if ( ((angle>=45) && (angle<=135)) )
					{
						if ( (tgC.top+tgC.height/2)<=(fcC.top+fcC.height/2) )
						{
							x1 = $$(TargetButton).$view.offsetLeft+tgC.width/2;
							y1 = $$(TargetButton).$view.offsetTop+tgC.height-2;
							x2 = $$(FocusButton).$view.offsetLeft+fcC.width/2;
							y2 = $$(FocusButton).$view.offsetTop+2;
						}
						else
						{
							x1 = $$(TargetButton).$view.offsetLeft+tgC.width/2;
							y1 = $$(TargetButton).$view.offsetTop+2;
							x2 = $$(FocusButton).$view.offsetLeft+fcC.width/2;
							y2 = $$(FocusButton).$view.offsetTop+fcC.height-2;
						}
					}
					else
					{
						if ( (tgC.left+tgC.width/2)<=(fcC.left+fcC.width/2) )
						{
							x1 = $$(TargetButton).$view.offsetLeft+tgC.width-2;
							y1 = $$(TargetButton).$view.offsetTop+tgC.height/2;
							x2 = $$(FocusButton).$view.offsetLeft+2;
							y2 = $$(FocusButton).$view.offsetTop+tgC.height/2;
						}
						else
						{
							x1 = $$(TargetButton).$view.offsetLeft+2;
							y1 = $$(TargetButton).$view.offsetTop+tgC.height/2;
							x2 = $$(FocusButton).$view.offsetLeft+fcC.width-2;
							y2 = $$(FocusButton).$view.offsetTop+fcC.height/2;
						}
					}		
				}

				if (Ttype === "output")
				{
					x1 = drC.width-1;
					y1 = (tgC.top-drC.top)+tgC.height/2;
					x2 = $$(FocusButton).$view.offsetLeft+fcC.width-2;
					y2 = $$(FocusButton).$view.offsetTop+fcC.height/2;
				}
			}

			if ( (Ftype) && (Ftype === "output") )
			{
				if (Ttype === "input")
				{
					x1 = 1;
					y1 = (tgC.top-drC.top)+tgC.height/2;
					x2 = drC.width+2;
					y2 = (fcC.top-drC.top)+fcC.height/2;
				}

				if (Ttype === "middleware")
				{
					x1 = $$(TargetButton).$view.offsetLeft+tgC.width-2;
					y1 = $$(TargetButton).$view.offsetTop+tgC.height/2;
					x2 = drC.width-1;
					y2 = (fcC.top-drC.top)+fcC.height/2;
				}

				if (Ttype === "output")
				{
					self().focus_change(TargetButton);
					return;
				}
			}

			self().CountLines++;

			let lnC = {x1:x2,y1:y2,x2:x1,y2:y1};
			let lineId  = "line" + self().CountLines;

			self().svg.appendChild(self().createLine(lnC, lineId));

			self().LinesPack[lineId] = [FocusButton, TargetButton];
			if (self().ButtonsPack.hasOwnProperty(FocusButton))  self().ButtonsPack[FocusButton].push(lineId);    else self().ButtonsPack[FocusButton]  = [lineId];
			if (self().ButtonsPack.hasOwnProperty(TargetButton)) self().ButtonsPack[TargetButton].push(lineId);   else self().ButtonsPack[TargetButton] = [lineId];
			if (self().Sublings.hasOwnProperty(FocusButton))     self().Sublings[FocusButton].push(TargetButton); else self().Sublings[FocusButton]     = [TargetButton];
			self().focus_off();
		}
	}

	add_middleware(el)
	{
		self().CountMiddlewares++;                          
		let ButtonId = "middleware" + self().CountMiddlewares;
		let elC = el.$view.getBoundingClientRect();

		self().drop.addView(
		{
			view:"button",
			id:ButtonId,
			$type:"middleware",
			label:el.config.label,
			top:elC.top,
			left:elC.left,
			width:100,
			height:50,
			css:"webix_primary",
			parentId:el.config.id
		});

		$$(ButtonId).$view.onmousedown = function(event)
		{
			if (event.which == 1) self().ButtonCoordinates = event.target.getBoundingClientRect();
		}

		$$(ButtonId).$view.onmouseup = function(event)
		{
			if (
				(event.target.getBoundingClientRect().x === self().ButtonCoordinates.x) && 
				(event.target.getBoundingClientRect().y === self().ButtonCoordinates.y) &&
				(event.which == 1)
			   )
			{
				self().click_button(ButtonId, event);
			}
		}
		return $$(ButtonId);
	}

	click_button(TargetButton, event)
	{
		let FocusButton = self().FocusButton;
		if ((!FocusButton) || (FocusButton.length === 0))
		{
			self().focus_on(TargetButton);
		}
		else
		{
			if (FocusButton !== TargetButton)
			{
				self().add_line(TargetButton, event);
			}
			else
			{
				self().focus_off();
			}
		}
	}









}