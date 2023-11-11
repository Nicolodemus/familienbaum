/** Creates a DAG for given links
	Usage example:
	let dag = new Dag(links);
	for (let node of dag.nodes()) {
		for (let child of node.children()) {
			console.log(child.data);
		}
	}
*/
class Dag
{
	constructor(links) {
		// Store all members in object "data"
		this.data = new Object();
		this.data.node_ids = [...new Set(links.flat())];
		this.data.node_ids.sort();
		this.data.id_map = new Map();
		this.data.nodes = new Array(this.data.node_ids.length);
		// Create the node objects
		for (let [i, node_id] of this.data.node_ids.entries()) {
			this.data.nodes[i] = new Object();
			this.data.nodes[i].data = node_id;
			this.data.nodes[i].relations = new Object();
			this.data.nodes[i].relations.children = new Array();
			this.data.nodes[i].children = function() {
				return this.relations.children;
			};
			this.data.id_map.set(node_id, i);
		}
		// Create the link objects
		this.data.links = new Array(links.length);
		for (let [i, link] of links.entries()) {
			this.data.links[i] = new Object();
			let source = this.find_node(link[0]);
			let target = this.find_node(link[1]);
			this.data.links[i].source = source;
			this.data.links[i].target = target;
			source.relations.children.push(target);
		}
	}

	find_node(node_id) {
		if (!this.data.id_map.has(node_id)) throw "Node " + node_id + " not found";
		let i = this.data.id_map.get(node_id);
		return this.data.nodes[i];
	}

	links() {
		return this.data.links;
	}

	nodes() {
		return this.data.nodes;
	}
};
