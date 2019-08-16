const inputs_db = [
{ id:"input1", $type:"input", label:"1(IN)", $description:"" },
{ id:"input2", $type:"input", label:"2(IN)", $description:"" },
{ id:"input3", $type:"input", label:"3(IN)", $description:"" }
];

const main_middlewares_db = [
{ id:"main_middleware1",  $type:"main_middleware", label:"BlackFilter",  $description:"" },
{ id:"main_middleware2",  $type:"main_middleware", label:"YellowFilter", $description:"" },
{ id:"main_middleware3",  $type:"main_middleware", label:"WhiteFilter",  $description:"" },
{ id:"main_middleware4",  $type:"main_middleware", label:"GreenFilter",  $description:"" },
{ id:"main_middleware5",  $type:"main_middleware", label:"PurpleFilter", $description:"" },
{ id:"main_middleware6",  $type:"main_middleware", label:"RedFilter",    $description:"" },
];

const outputs_db = [
{ id:"output1", $type:"output", label:"1(OUT)", $description:"" },
{ id:"output2", $type:"output", label:"2(OUT)", $description:"" },
{ id:"output3", $type:"output", label:"3(OUT)", $description:"" },
{ id:"output4", $type:"output", label:"4(OUT)", $description:"" }
];

//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////  TEMPLATE  ///////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

const inputs_template           = { view:"button", width:70,  height:50, };
const main_middlewares_template = { view:"button", width:100, height:100, css:"webix_primary"   };
const outputs_template          = { view:"button", width:70,  height:50, };

//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////  MERGING  ////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

export let inputs           = [];
export let main_middlewares = [];
export let outputs          = [];

inputs_db.forEach(function(value) {
	inputs.push({...inputs_template, ...value});
});

main_middlewares_db.forEach(function(value) {
	main_middlewares.push({...main_middlewares_template, ...value});
});

outputs_db.forEach(function(value) {
	outputs.push({...outputs_template, ...value});
});
