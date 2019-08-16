import {JetView} from "webix-jet";
import {inputs, main_middlewares, outputs} from "models/schemeData";

let self; //Function: return "this" context..

export default class SchemeView extends JetView
{

	constructor(app, name)
	{
		super(app, name);
		self = function()
		{
			return this;
		}.bind(this);

		this.FocusButton = "";

		this.CountLines        = 0;
		this.CountMiddlewares  = 0;

		this.LinesPack         = {};
		this.ButtonsPack       = {};
		this.Sublings          = {};
		this.ButtonCoordinates = {};
	}

	config()
	{
		return {
			id:"layer_space",
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
								id:"input",
								width:70,
								rows: inputs
							},

							{
								id:"drop"
							},

							{
								id:"output",
								width:70,
								rows: outputs
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
						cols: main_middlewares
					}

				}

			]
		};
	}

	init()
	{

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
		focus_off();
		focus_on(TargetButton);
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
	

}