/** Creates a d3.dag with additional functions
	Usage example:
	let dag = dag_with_relations(links);
	let node = dag.find_node("ID");
	console.log(dag.parents(node));
	console.log(dag.first_level_adjacency(node));
	console.log(dag.second_level_adjacency(node));
*/
function dag_with_relations(links) {
	if (links.length <= 0) throw "Cannot handle a dataset without links";
	let dag = new Dag(links); // create DAG using given links
	// Get the parents of given node
	dag.parents = function(node) {
		add_parents(this); // lazily
		return node.added_relations.parents;
	};
	// First level includes parents and children of a family node
	dag.first_level_adjacency = function(node) {
		add_first_level_adjacencies(this); // lazily
		return node.added_relations.first_level_adjacency;
	};
	// Second level includes parents and children of a member
	dag.second_level_adjacency = function(node) {
		add_second_level_adjacencies(this); // lazily
		return node.added_relations.second_level_adjacency;
	};
	return dag;
}

// d3-dag does not provide parent containers.
function add_parents(dag) {
	if (dag.exist_parents) return;
	dag.exist_parents = true;
	// Add parents containers
	for (let node of dag.nodes()) {
		if (!node.hasOwnProperty("added_relations")) node.added_relations = new Object();
		node.added_relations.parents = new Array();
	}
	// Parents of family nodes
	for (let link of dag.links())
		link.target.added_relations.parents.push(link.source);
}

function get_roots(dag) {
	let roots = new Set();
	for (let node of dag.nodes()) {
		// Is it a root?
		let parents = dag.parents(node);
		if (parents.length <= 0) {
			roots.add(node);
			continue;
		}
	}
	return roots;
}

function add_first_level_adjacencies(dag) {
	if (dag.exist_first_level_adjacencies) return;
	dag.exist_first_level_adjacencies = true;
	// Add adjacency containers
	for (let node of dag.nodes()) {
		if (!node.hasOwnProperty("added_relations")) node.added_relations = new Object();
		node.added_relations.first_level_adjacency = new Set();
	}
	// Add first level adjacent nodes
	for (let link of dag.links()) {
		link.source.added_relations.first_level_adjacency.add(link.target);
		link.target.added_relations.first_level_adjacency.add(link.source);
	}
}

function add_second_level_adjacencies(dag) {
	if (dag.exist_second_level_adjacencies) return;
	dag.exist_second_level_adjacencies = true;
	// Merge adjacency from a family node to a member node
	function merge_adjacency(node_from, node_to) {
		for (let node of dag.first_level_adjacency(node_from))
			node_to.added_relations.second_level_adjacency.add(node);
	}
	// Add adjacency containers
	for (let node of dag.nodes()) {
		if (!node.hasOwnProperty("added_relations")) node.added_relations = new Object();
		// Initialize with first level adjacency
		node.added_relations.second_level_adjacency = new Set();
	}
	// Add second level adjacent nodes
	for (let link of dag.links()) {
		merge_adjacency(link.source, link.source);
		merge_adjacency(link.target, link.target);
		merge_adjacency(link.source, link.target);
		merge_adjacency(link.target, link.source);
	}
}
