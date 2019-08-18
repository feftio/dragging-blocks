export function GraphX(graph)
{
	this.graph = JSON.parse(JSON.stringify(graph));
}

GraphX.prototype.get = function()
{
	return this.graph;
}

GraphX.prototype.orient = function(from)
{
	let graph  = Object.assign({},this.graph);
	let weight = this.getWeight(from);

	for (key in graph)
	{
		orient(key);
	}
	function orient(key)
	{
		graph[key].forEach(function(e)
		{
			let index = graph[e].indexOf(key);
			if ((index>=0)&&(weight[key]<weight[e])) graph[e].splice(index,1);
		});
	}
	this.graph = graph;
}

GraphX.prototype.getPaths = function(v)
{
	var vertexes = v;
	var graph    = Object.assign({},this.graph);

	function paths(v, s, path, result)
	{
		if ((!v) || (v.length === 0))
		{
			if (path.length > 1)
			{
				result.push(path.slice(0));
			}
		}
		else
		{
			for (var i = 0; i < v.length; ++i) {
				path.push(v[i]);
				paths(s[v[i]], s, path, result);
				path.pop();
			}
		}
	}

	function getPaths(v,s)
	{
		var path = [];
		var result = [];
		paths(v, s, path, result);
		return result;
	}

	return getPaths(vertexes,graph);
}

GraphX.prototype.getWeight = function(from)
{
	let graph    = this.graph;
	let queue    = [];
	let weight   = {};
	let visited  = {};
	let count    = 1;

	queue.push(from);

	while(queue.length>0)
	{
		let current = queue.pop();
		current.forEach(function(vertex) {
			if (!visited.hasOwnProperty(vertex))
			{
				queue.unshift(graph[vertex]);
				weight[vertex] = count;
			}
			visited[vertex] = true;
		});
		count++
	}
	return weight;
}