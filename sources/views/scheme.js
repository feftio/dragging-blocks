import {JetView} from "webix-jet";
import {inputs_db, main_middlewares_db, outputs_db} from "models/scheme";
import {GraphX} from "helpers/GraphX";

export default class SchemeView extends JetView
{

	constructor(app, name)
	{
		super(app, name);

		const inputs_template           = { view:"button", width:70,  height:50, click:function(id,event){this.$scope.click_button(id,event);}};
		const main_middlewares_template = { view:"button", width:100, height:100, css:"webix_primary"};
		const outputs_template          = { view:"button", width:70,  height:50, click:function(id,event){this.$scope.click_button(id,event);}};

		this.inputs           = [];
		this.main_middlewares = [];
		this.outputs          = [];

		inputs_db.forEach((value) => {
			this.inputs.push({...inputs_template, ...value});
		});

		main_middlewares_db.forEach((value) => {
			this.main_middlewares.push({...main_middlewares_template, ...value});
		});

		outputs_db.forEach((value) => {
			this.outputs.push({...outputs_template, ...value});
		});
	}

	config()
	{
		return {
			type:"clean",
			id:"space",
			rows: 
			[
				{ id:"head", height:70, rows:[{view:"button", id:"result", value:"Result", click:()=>{this.get_result();}}] },

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
								id:"drop",
								css:{"border":"2px solid #F9F9F9"},
								cells:[{ view:"template", id:"drop_hidden", template:'<svg><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth" viewBox="0 0 15 15"><path d="M0,0 L0,6 L9,3 z" fill="#1CA1C1" /></marker></defs></svg>'}]
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

		this.drop.$view.onclick = (event) => 
		{
			if (event.target === this.svg) this.focus_off(this.FocusButton);
		}

		webix.DragControl.addDrag(this.drop.$view,
		{
			$dragDestroy: () => 
			{
				return false;
			},

			$dragPos: (pos, ev) => 
			{
				let context = webix.DragControl.getContext(); 
				let control = $$(context.source[0]);
				pos.x = control.config.left = pos.x+context.x_offset;
				pos.y = control.config.top  = pos.y+context.y_offset;
				if (pos.x<0) pos.x=control.config.left=0;
				if (pos.x>(this.drop.$width-control.$width)) pos.x=control.config.left=this.drop.$width-control.$width;
				if (pos.y<0) pos.y=control.config.top=0;
				if (pos.y>(this.drop.$height-control.$height)) pos.y=control.config.top=this.drop.$height-control.$height;
				requestAnimationFrame(() => {
				this.rewrite_line(control.config.id, pos);
				});
			},

			$dragCreate: (source, ev) => 
			{
				const el = webix.$$(ev);
				if (el && el !== this.drop)
				{
					let pos     = webix.html.pos(ev);
					let context = webix.DragControl.getContext();
					context.source   = [el.config.id];
					context.from     = this.drop;
					context.to       = this.drop;
					context.y_offset = el.config.top  - pos.y;
					context.x_offset = el.config.left - pos.x;
					return el.$view;
				}
				return false;
			}

		});

		webix.DragControl.addDrag(this.space.$view, 
		{
			$dragDestroy: (from, html) => 
			{
				return false;
			},

			$dragPos: (pos, ev) => 
			{
				let context = webix.DragControl.getContext(); 
				let control = $$(context.source[0]);

				pos.x = control.config.left = pos.x+context.x_offset;
				pos.y = control.config.top  = pos.y+context.y_offset;
				if (pos.x<0){pos.x=control.config.left=0; }
				if (pos.x>(this.drop.$width-control.$width)) pos.x=control.config.left=this.drop.$width-control.$width;
				if (pos.y<0) pos.y=control.config.top=0;
				if (pos.y>(this.drop.$height-control.$height)) pos.y=control.config.top=this.drop.$height-control.$height;
			},

			$dragCreate: (source, ev) => 
			{
				const parent = webix.$$(ev);
				if (parent && parent.config.$type && parent.config.$type === "main_middleware")
				{
					let elA     = this.add_middleware(parent);
					let pos     = webix.html.pos(ev);
					let elC     = elA.$view.getBoundingClientRect();
					let context = webix.DragControl.getContext();

					context.source   = [elA.config.id];
					context.from     = this.main_middleware;
					context.to       = this.drop;
					context.y_offset = (pos.y-elC.top-elC.height-ev.layerY)+elC.height/2;
					context.x_offset = (pos.x-elC.left-elC.width-ev.layerX)+elC.width/2;
					return elA.$view;
				}
				return false;
			}

		});

		webix.ui({
			view:"window",
            id:"resultWindow",
            position:"center",
            width:500,
            height:500,
            modal:true,
            close:true,
            head:"Результат",
            body:
            {
            	cols:
            	[
            	{
            		view:"list",
            		id:"listWays",
            		template:"#title#",
            		width:110,
            		data:
            		[

            		],
            		select:true,
            	},

            	{
            		type:"clean", 
            		id:"views", 
            		animate:false,
            		cells:
            		[
            		{
            			view:"template",
            			id:"tpl",
            			template:"Pick a film from the list!"
            		}
            		]
            	}
            	]
            }
        });
	}

	focus_off()
	{
		if ((this.FocusButton) || (this.FocusButton.length !== 0))
		{
			webix.html.removeCss($$(this.FocusButton).getNode(), "webix_danger");
			this.FocusButton = "";
		}
	}

	focus_on(TargetButton)
	{
		if ((TargetButton) || (TargetButton.length !== 0))
		{
			webix.html.addCss($$(TargetButton).getNode(), "webix_danger");
			this.FocusButton = TargetButton;
		}
	}

	focus_change(TargetButton)
	{
		this.focus_off();
		this.focus_on(TargetButton);
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

		line.onclick = (event) => 
		{
			this.CountLines--;
			let id = event.target.id;
			if (id) event.target.remove();

			for (let key in this.ButtonsPack)
			{
				this.ButtonsPack[key].forEach((value, index) => 
				{
					if (id === value) this.ButtonsPack[key].splice(index, 1);
				});
			}
			if (this.LinesPack.hasOwnProperty(id)) delete this.LinesPack[id];
		}
		return line;
	}

	add_line(TargetButton, event)
	{
		let FocusButton = this.FocusButton;

		if ( ((FocusButton) || (FocusButton.length !== 0)) && (FocusButton !== TargetButton) )
		{
			let Tbutton = $$(TargetButton);
			let Fbutton = $$(FocusButton);

			let tgC = Tbutton.$view.getBoundingClientRect();
			let fcC = Fbutton.$view.getBoundingClientRect();
			let drC = this.drop.$view.getBoundingClientRect();

			let Ttype = Tbutton.config.$type;
			let Ftype = Fbutton.config.$type;

			let x1;
			let y1;
			let x2;
			let y2;
			
			if (Object.keys(this.LinesPack).length > 0)
			{
				for (let key in this.LinesPack)
				{
					let value = this.LinesPack[key];
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
					this.focus_change(TargetButton);
					return;
				}

				if (Ttype === "middleware")
				{
					x1 = Tbutton.$view.offsetLeft+2;
					y1 = Tbutton.$view.offsetTop+tgC.height/2;
					x2 = 1;
					y2 = (fcC.top-drC.top)+fcC.height/2;
				}

				if (Ttype === "output")
				{
					x1 = drC.width-5;
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
					x2 = Fbutton.$view.offsetLeft+2;
					y2 = Fbutton.$view.offsetTop+fcC.height/2;
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
					angle = this.angle_vectors(v1,v2);

					if ( ((angle>=45) && (angle<=135)) )
					{
						if ( (tgC.top+tgC.height/2)<=(fcC.top+fcC.height/2) )
						{
							x1 = Tbutton.$view.offsetLeft+tgC.width/2;
							y1 = Tbutton.$view.offsetTop+tgC.height-2;
							x2 = Fbutton.$view.offsetLeft+fcC.width/2;
							y2 = Fbutton.$view.offsetTop+2;
						}
						else
						{
							x1 = Tbutton.$view.offsetLeft+tgC.width/2;
							y1 = Tbutton.$view.offsetTop+2;
							x2 = Fbutton.$view.offsetLeft+fcC.width/2;
							y2 = Fbutton.$view.offsetTop+fcC.height-2;
						}
					}
					else
					{
						if ( (tgC.left+tgC.width/2)<=(fcC.left+fcC.width/2) )
						{
							x1 = Tbutton.$view.offsetLeft+tgC.width-2;
							y1 = Tbutton.$view.offsetTop+tgC.height/2;
							x2 = Fbutton.$view.offsetLeft+2;
							y2 = Fbutton.$view.offsetTop+tgC.height/2;
						}
						else
						{
							x1 = Tbutton.$view.offsetLeft+2;
							y1 = Tbutton.$view.offsetTop+tgC.height/2;
							x2 = Fbutton.$view.offsetLeft+fcC.width-2;
							y2 = Fbutton.$view.offsetTop+fcC.height/2;
						}
					}		
				}

				if (Ttype === "output")
				{
					x1 = drC.width-5;
					y1 = (tgC.top-drC.top)+tgC.height/2;
					x2 = Fbutton.$view.offsetLeft+fcC.width-2;
					y2 = Fbutton.$view.offsetTop+fcC.height/2;
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
					x1 = Tbutton.$view.offsetLeft+tgC.width-2;
					y1 = Tbutton.$view.offsetTop+tgC.height/2;
					x2 = drC.width-1;
					y2 = (fcC.top-drC.top)+fcC.height/2;
				}

				if (Ttype === "output")
				{
					this.focus_change(TargetButton);
					return;
				}
			}

			this.CountLines++;

			let lnC = {x1:x2,y1:y2,x2:x1,y2:y1};
			let lineId  = "line" + this.CountLines;

			this.svg.appendChild(this.createLine(lnC, lineId));

			this.LinesPack[lineId] = [FocusButton, TargetButton];
			if (this.ButtonsPack.hasOwnProperty(FocusButton))  this.ButtonsPack[FocusButton].push(lineId);    else this.ButtonsPack[FocusButton]  = [lineId];
			if (this.ButtonsPack.hasOwnProperty(TargetButton)) this.ButtonsPack[TargetButton].push(lineId);   else this.ButtonsPack[TargetButton] = [lineId];
			if (this.Sublings.hasOwnProperty(FocusButton))     this.Sublings[FocusButton].push(TargetButton); else this.Sublings[FocusButton]     = [TargetButton];
			this.focus_off();
		}
	}

	add_middleware(el)
	{
		this.CountMiddlewares++;                          
		let ButtonId = "middleware" + this.CountMiddlewares;
		let elC = el.$view.getBoundingClientRect();

		this.drop.addView(
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

		$$(ButtonId).$view.onmousedown = (event) =>
		{
			if (event.which == 1) this.ButtonCoordinates = event.target.getBoundingClientRect();
		}

		$$(ButtonId).$view.onmouseup = (event) =>
		{
			if (
				(event.target.getBoundingClientRect().x === this.ButtonCoordinates.x) && 
				(event.target.getBoundingClientRect().y === this.ButtonCoordinates.y) &&
				(event.which == 1)
			   )
			{
				this.click_button(ButtonId, event);
			}
		}
		return $$(ButtonId);
	}

	click_button(TargetButton, event)
	{
		let FocusButton = this.FocusButton;
		if ((!FocusButton) || (FocusButton.length === 0))
		{
			this.focus_on(TargetButton);
		}
		else
		{
			if (FocusButton !== TargetButton)
			{
				this.add_line(TargetButton, event);
			}
			else
			{
				this.focus_off();
			}
		}
	}

	rewrite_line(TargetButton, pos)
	{
		let Tbutton = $$(TargetButton);
		let Ttype   = Tbutton.config.$type;

		if ( (Ttype) && (Ttype === "middleware") && (this.ButtonsPack.hasOwnProperty(TargetButton)))
		{
			this.ButtonsPack[TargetButton].forEach((lineId) =>
			{
				let line = document.getElementById(lineId);
				let Tbutton = $$(TargetButton);
				let tgC  = Tbutton.$view.getBoundingClientRect();
				let drC  = this.drop.$view.getBoundingClientRect();

				let ConnectButton;
				let Cbutton;
				let Ctype;
				let cnC;

				let x1;
				let y1;
				let x2;
				let y2;

				this.LinesPack[lineId].forEach(function(value)
				{
					if (value !== TargetButton)
					{
						ConnectButton = value;
						Cbutton       = $$(ConnectButton);
						Ctype         = Cbutton.config.$type;
						cnC           = Cbutton.$view.getBoundingClientRect();
					}
				});

				if (Ctype === "input")
				{
					x1 = pos.x+2;
					y1 = pos.y+tgC.height/2;
					x2 = 1;
					y2 = (cnC.top-drC.top)+cnC.height/2;
				}

				if (Ctype === "middleware")
				{
					let v1 = {};
					let v2 = {};
					let angle;

					v1.x = (tgC.left+tgC.width/2)-(cnC.left+cnC.width/2);
					v1.y = (tgC.top+tgC.height/2)-(cnC.top+cnC.height/2);
					v2.x = (0)-(cnC.left+cnC.width/2);
					v2.y = (0);
					angle = this.angle_vectors(v1,v2);

					if ( ((angle>=45) && (angle<=135)) )
					{
						if ( (tgC.top+tgC.height/2)<=(cnC.top+cnC.height/2) )
						{
							x1 = pos.x+tgC.width/2;
							y1 = pos.y+tgC.height-2;
							x2 = Cbutton.$view.offsetLeft+cnC.width/2;
							y2 = Cbutton.$view.offsetTop+2;
						}
						else
						{
							x1 = pos.x+tgC.width/2;
							y1 = pos.y+2;
							x2 = Cbutton.$view.offsetLeft+cnC.width/2;
							y2 = Cbutton.$view.offsetTop+cnC.height-2;
						}
					}
					else
					{
						if ( (tgC.left+tgC.width/2)<=(cnC.left+cnC.width/2) )
						{
							x1 = pos.x+tgC.width-2;
							y1 = pos.y+tgC.height/2;
							x2 = Cbutton.$view.offsetLeft+2;
							y2 = Cbutton.$view.offsetTop+cnC.height/2;
						}
						else
						{
							x1 = pos.x+2;
							y1 = pos.y+tgC.height/2;
							x2 = Cbutton.$view.offsetLeft+cnC.width-2;
							y2 = Cbutton.$view.offsetTop+cnC.height/2;
						}
					}		
				}

				if (Ctype === "output")
				{
					x1 = pos.x+tgC.width-2;
					y1 = pos.y+tgC.height/2;
					x2 = drC.width-5;
					y2 = (cnC.top-drC.top)+cnC.height/2;
				}

				if ( (TargetButton in this.Sublings) && (this.Sublings[TargetButton].indexOf(ConnectButton)>=0) )
				{
					line.setAttribute("x1", x1);
					line.setAttribute("y1", y1);
					line.setAttribute("x2", x2);
					line.setAttribute("y2", y2);
				}
				else
				{
					line.setAttribute("x1", x2);
					line.setAttribute("y1", y2);
					line.setAttribute("x2", x1);
					line.setAttribute("y2", y1);
				}
			});
		}
	}

	get_result()
	{
		let graph = new GraphX(this.Sublings);
		let vertexes = [];
		let result;
		let result_string;

		for (let key in this.Sublings)
		{
			if ($$(key).config.$type === "input")
			{
				vertexes.push(key);
			}
		}
		result = graph.getPaths(vertexes);
		console.dir(result);

		result.forEach(function(value,i)
		{
			let num = i+1;
			$$("listWays").add({
				id:"way"+num,
				num: num,
				title:num+" way",
			},0);
		});

		$$("listWays").sort("#num#","asc","int");

		$$("resultWindow").define({
			width:window.innerWidth/100*50,
			height:window.innerHeight/100*50
		});
		$$("resultWindow").resize();
		$$("resultWindow").show();
	}


}